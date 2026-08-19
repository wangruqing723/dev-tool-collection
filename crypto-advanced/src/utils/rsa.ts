// src/utils/rsa.ts
//
// RSA 加解密、签名验签、密钥对生成。纯逻辑、不依赖 @raycast/api。
//
// 默认填充刻意不对称（见 docs/adr/0004）：
//   加解密默认 OAEP + SHA-256 —— PKCS1v1.5 有 Bleichenbacher 类攻击史，不宜作默认
//   签名默认 PKCS1v1.5 + SHA-256（SHA256withRSA）—— 支付宝 RSA2 / 微信支付 / 银联
//   几乎清一色是它，默认 PSS 会让多数人第一次验签就失败
// 两侧都保留另一种填充以供对接。

import crypto from "crypto";
import fs from "fs";

export type RsaOperation = "encrypt" | "decrypt" | "sign" | "verify" | "keygen";

export type CryptoPadding = "oaep-sha256" | "oaep-sha1" | "pkcs1";
export type SignPadding = "pkcs1" | "pss";
export type Digest = "sha256" | "sha1" | "sha384" | "sha512";
export type SigEncoding = "base64" | "hex";
export type ModulusLength = 2048 | 3072 | 4096;
export type PrivateKeyFormat = "pkcs8" | "pkcs1";

const OAEP_HASH_LENGTH: Record<string, number> = {
  sha1: 20,
  sha256: 32,
};

export function readPemFile(filePath: string): string {
  const content = fs.readFileSync(filePath, "utf8").trim();
  if (!content.includes("-----BEGIN")) {
    throw new Error(`文件不像 PEM 格式：${filePath}`);
  }
  return content;
}

// 粘贴优先于文件：两者都给时以粘贴内容为准，避免静默使用用户已忘记的旧文件。
export function resolveKeyMaterial(
  pasted: string | undefined,
  filePaths: string[] | undefined,
  fieldName: string,
): string {
  const trimmed = pasted?.trim();
  if (trimmed) return trimmed;

  const path = filePaths?.[0];
  if (path) return readPemFile(path);

  throw new Error(`请粘贴或选择${fieldName}`);
}

function modulusBytes(key: crypto.KeyObject): number {
  const bits = key.asymmetricKeyDetails?.modulusLength;
  if (!bits) {
    throw new Error("无法读取密钥长度，请确认这是一个 RSA 密钥");
  }
  return Math.ceil(bits / 8);
}

// 单次可加密的明文上限。超限时前置报错而不是让 OpenSSL 抛出
// "data too large for key size"——后者对不熟悉 RSA 长度限制的用户毫无指导性。
// 明确不做混合加密（见 ADR-0004）：自造封装格式只会产出别人解不开的密文。
export function maxPlaintextBytes(
  publicKeyPem: string,
  padding: CryptoPadding,
): number {
  const k = modulusBytes(crypto.createPublicKey(publicKeyPem));

  if (padding === "pkcs1") {
    return k - 11;
  }

  const hLen = OAEP_HASH_LENGTH[padding === "oaep-sha256" ? "sha256" : "sha1"];
  return k - 2 * hLen - 2;
}

function cryptoPaddingOptions(padding: CryptoPadding) {
  if (padding === "pkcs1") {
    return { padding: crypto.constants.RSA_PKCS1_PADDING };
  }
  return {
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: padding === "oaep-sha256" ? "sha256" : "sha1",
  };
}

function signPaddingOptions(padding: SignPadding) {
  if (padding === "pss") {
    return {
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
    };
  }
  return { padding: crypto.constants.RSA_PKCS1_PADDING };
}

export function rsaEncrypt(params: {
  text: string;
  publicKeyPem: string;
  padding: CryptoPadding;
  outputEncoding: SigEncoding;
}): string {
  const { text, publicKeyPem, padding, outputEncoding } = params;

  if (!text) {
    throw new Error("请输入要加密的文本");
  }

  const bytes = Buffer.byteLength(text, "utf8");
  const max = maxPlaintextBytes(publicKeyPem, padding);
  if (bytes > max) {
    throw new Error(
      `明文过长：当前密钥与填充方式下最多 ${max} 字节，实际 ${bytes} 字节。` +
        `RSA 不适合加密长文本，请改用对称加密（如本扩展的 AES 命令），` +
        `或只用 RSA 加密一个对称密钥`,
    );
  }

  const encrypted = crypto.publicEncrypt(
    { key: publicKeyPem, ...cryptoPaddingOptions(padding) },
    Buffer.from(text, "utf8"),
  );

  return encrypted.toString(outputEncoding);
}

// Node 18.19+ / 20+ 在运行时层面禁用了 PKCS1v1.5 的私钥解密（CVE-2023-46809，
// Marvin 攻击），只能靠启动参数 --security-revert 恢复，而 Raycast 的运行时
// 我们无法控制。公钥加密方向不受影响，仍可用于给只认 PKCS1 的老系统投递密文。
const PKCS1_DECRYPT_UNSUPPORTED =
  "Node 已禁用 PKCS#1 v1.5 私钥解密（CVE-2023-46809，Marvin 攻击），无法绕过。" +
  "这不是密钥或密文的问题。若两端都由你掌握，请改用 OAEP；" +
  "若必须解 PKCS#1 v1.5 密文，请用 openssl 命令行处理。";

export function rsaDecrypt(params: {
  cipherText: string;
  privateKeyPem: string;
  padding: CryptoPadding;
  inputEncoding: SigEncoding;
}): string {
  const { cipherText, privateKeyPem, padding, inputEncoding } = params;

  if (!cipherText.trim()) {
    throw new Error("请输入要解密的密文");
  }

  if (padding === "pkcs1") {
    throw new Error(PKCS1_DECRYPT_UNSUPPORTED);
  }

  try {
    const decrypted = crypto.privateDecrypt(
      { key: privateKeyPem, ...cryptoPaddingOptions(padding) },
      Buffer.from(cipherText.trim(), inputEncoding),
    );
    return decrypted.toString("utf8");
  } catch (err) {
    throw new Error(
      `解密失败：私钥或填充方式不匹配（${
        err instanceof Error ? err.message : String(err)
      }）`,
    );
  }
}

export function rsaSign(params: {
  text: string;
  privateKeyPem: string;
  padding: SignPadding;
  digest: Digest;
  outputEncoding: SigEncoding;
}): string {
  const { text, privateKeyPem, padding, digest, outputEncoding } = params;

  if (!text) {
    throw new Error("请输入要签名的内容");
  }

  const sig = crypto.sign(digest, Buffer.from(text, "utf8"), {
    key: privateKeyPem,
    ...signPaddingOptions(padding),
  });

  return sig.toString(outputEncoding);
}

export function rsaVerify(params: {
  text: string;
  signature: string;
  publicKeyPem: string;
  padding: SignPadding;
  digest: Digest;
  signatureEncoding: SigEncoding;
}): boolean {
  const { text, signature, publicKeyPem, padding, digest, signatureEncoding } =
    params;

  if (!text) {
    throw new Error("请输入被签名的原文");
  }
  if (!signature.trim()) {
    throw new Error("请输入待验证的签名值");
  }

  return crypto.verify(
    digest,
    Buffer.from(text, "utf8"),
    { key: publicKeyPem, ...signPaddingOptions(padding) },
    Buffer.from(signature.trim(), signatureEncoding),
  );
}

export type KeyPair = { publicKey: string; privateKey: string };

// 公钥固定 SPKI PEM（-----BEGIN PUBLIC KEY-----）。
// 私钥默认 PKCS#8（-----BEGIN PRIVATE KEY-----），可选 PKCS#1
//（-----BEGIN RSA PRIVATE KEY-----）——OpenSSL 1.x 时代的工具链和部分 Java 库只认后者。
export function generateRsaKeyPair(
  modulusLength: ModulusLength,
  privateFormat: PrivateKeyFormat,
): KeyPair {
  return crypto.generateKeyPairSync("rsa", {
    modulusLength,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: privateFormat, format: "pem" },
  });
}
