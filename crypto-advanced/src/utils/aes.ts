// src/utils/aes.ts
//
// AES 加解密核心逻辑。纯逻辑、不依赖 @raycast/api，可直接被 jest 覆盖。
//
// 密文打包约定（「自包含密文」，见 CONTEXT.md）：
//   CBC + 自动 IV ：iv(16) || ciphertext
//   GCM + 自动 IV ：nonce(12) || ciphertext || tag(16)
//   CBC/GCM + 手动 IV：不打包 IV；GCM 的 tag 仍必须附在尾部，否则无法解密
//   ECB           ：ciphertext（无 IV）
//
// 打包 IV 是为了防 GCM 的 nonce 重用——同一密钥下重复 nonce 会泄露认证密钥、
// 使密文可被伪造，而让用户手打 nonce 等于邀请重用。前缀打包是各语言库的通行约定。

import crypto from "crypto";
import { detectEncoding, parseAesKey, type TextEncoding } from "./encoding";

export type AesMode = "cbc" | "gcm" | "ecb";
export type AesAction = "encrypt" | "decrypt";
export type IvSource = "auto" | "manual";
export type CipherEncoding = "hex" | "base64";

// GCM 用 12 字节 nonce：这是 NIST SP 800-38D 推荐值，也是各语言库的默认，
// 其它长度虽被 Node 接受但会影响互操作。
export const IV_LENGTH: Record<Exclude<AesMode, "ecb">, number> = {
  cbc: 16,
  gcm: 12,
};

const GCM_TAG_LENGTH = 16;

export function ivLengthFor(mode: AesMode): number {
  return mode === "ecb" ? 0 : IV_LENGTH[mode];
}

// GCM 的 IV 在密码学惯例里叫 nonce，且不可重用——文案上必须区分，
// 让用户看到这个词就想到「每次都要不一样」。
export function ivLabelFor(mode: AesMode): string {
  if (mode === "ecb") return "";
  const len = ivLengthFor(mode);
  return mode === "gcm"
    ? `Nonce（${len} 字节，Hex/Base64）`
    : `IV（${len} 字节，Hex/Base64）`;
}

export function generateIv(mode: AesMode): Buffer {
  return crypto.randomBytes(ivLengthFor(mode));
}

// 各模式的 IV 来源默认值刻意不同：
//   GCM → auto：nonce 重用是灾难性的（同一密钥下重复 nonce 会泄露认证密钥、
//               使密文可被伪造），默认不能把它交给用户手打。
//   CBC → manual：IV 重用只会泄露「两条明文是否有相同前缀」，远未到灾难级别，
//               而与相邻的 SM4 命令保持一致（手填 IV、密文不含 IV）对用户更重要。
// 请勿为「三个模式行为统一」把这两者改成同一个默认值。
export function defaultIvSource(mode: AesMode): IvSource {
  return mode === "gcm" ? "auto" : "manual";
}

// 手动 IV：接受 Hex 或 Base64，解码后长度必须与模式匹配。
export function parseIv(input: string, mode: AesMode): Buffer {
  const trimmed = input.trim();
  const expected = ivLengthFor(mode);
  const name = mode === "gcm" ? "Nonce" : "IV";

  if (!trimmed) {
    throw new Error(`${mode.toUpperCase()} 模式必须提供 ${name}`);
  }

  const enc = detectEncoding(trimmed);
  if (enc !== "hex" && enc !== "base64") {
    throw new Error(`${name} 必须是 Hex 或 Base64`);
  }

  const buf = Buffer.from(trimmed, enc);
  if (buf.length !== expected) {
    throw new Error(
      `${name} 长度必须是 ${expected} 字节，当前解码得到 ${buf.length} 字节`,
    );
  }

  return buf;
}

function algorithmFor(bits: number, mode: AesMode): string {
  return `aes-${bits}-${mode}`;
}

export type AesEncryptParams = {
  text: string;
  keyInput: string;
  mode: AesMode;
  ivSource: IvSource;
  ivInput?: string;
  outputEncoding: CipherEncoding;
};

export type AesEncryptResult = {
  cipher: string;
  bits: number;
  /** 实际使用的 IV/Nonce（Hex）。ECB 下为 undefined。 */
  iv?: string;
  /** IV 是否已打包进密文前缀 */
  ivPacked: boolean;
};

export function aesEncrypt(params: AesEncryptParams): AesEncryptResult {
  const { text, keyInput, mode, ivSource, ivInput, outputEncoding } = params;

  if (!text) {
    throw new Error("请输入要加密的文本");
  }

  const { key, bits } = parseAesKey(keyInput);

  // ECB 无 IV；其余模式按来源取：自动生成，或解析用户输入。
  const iv =
    mode === "ecb"
      ? undefined
      : ivSource === "auto"
        ? generateIv(mode)
        : parseIv(ivInput ?? "", mode);

  const cipher = crypto.createCipheriv(
    algorithmFor(bits, mode),
    key,
    iv ?? null,
  );

  const body = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
    // GCM 的认证标签必须随密文走，否则解密方无从校验。
    // 尾部追加是 Web Crypto / Java GCMParameterSpec / Go gcm.Seal 的共同默认。
    mode === "gcm"
      ? (cipher as crypto.CipherGCM).getAuthTag()
      : Buffer.alloc(0),
  ]);

  // 只在自动生成时打包：手动指定 IV 的场景通常是对接不打包的外部系统，
  // 此时擅自加前缀反而会让对方解不开。
  const ivPacked = iv !== undefined && ivSource === "auto";
  const packed = ivPacked ? Buffer.concat([iv, body]) : body;

  return {
    cipher: packed.toString(outputEncoding),
    bits,
    iv: iv?.toString("hex"),
    ivPacked,
  };
}

export type AesDecryptParams = {
  cipherText: string;
  keyInput: string;
  mode: AesMode;
  ivSource: IvSource;
  ivInput?: string;
};

export type AesDecryptResult = {
  plain: string;
  bits: number;
  inputEncoding: TextEncoding;
};

export function aesDecrypt(params: AesDecryptParams): AesDecryptResult {
  const { cipherText, keyInput, mode, ivSource, ivInput } = params;

  if (!cipherText) {
    throw new Error("请输入要解密的密文");
  }

  const { key, bits } = parseAesKey(keyInput);

  const inputEncoding = detectEncoding(cipherText.trim());
  if (inputEncoding !== "hex" && inputEncoding !== "base64") {
    throw new Error("输入看起来不像合法密文（hex 或 base64）");
  }

  let buf = Buffer.from(cipherText.trim(), inputEncoding);

  // 拆包顺序必须与打包顺序相反：先剥前缀 IV，再剥尾部 tag。
  let iv: Buffer | undefined;
  if (mode !== "ecb") {
    if (ivSource === "auto") {
      const len = ivLengthFor(mode);
      if (buf.length <= len) {
        const name = mode === "gcm" ? "Nonce" : "IV";
        throw new Error(
          `密文太短，无法从前缀取出 ${len} 字节的 ${name}。若密文本身不含 ${name}，请把来源改为「手动指定」`,
        );
      }
      iv = buf.subarray(0, len);
      buf = buf.subarray(len);
    } else {
      iv = parseIv(ivInput ?? "", mode);
    }
  }

  let tag: Buffer | undefined;
  if (mode === "gcm") {
    if (buf.length < GCM_TAG_LENGTH) {
      throw new Error(
        `密文太短，无法取出 ${GCM_TAG_LENGTH} 字节的 GCM 认证标签`,
      );
    }
    tag = buf.subarray(buf.length - GCM_TAG_LENGTH);
    buf = buf.subarray(0, buf.length - GCM_TAG_LENGTH);
  }

  const decipher = crypto.createDecipheriv(
    algorithmFor(bits, mode),
    key,
    iv ?? null,
  );

  if (tag) {
    (decipher as crypto.DecipherGCM).setAuthTag(tag);
  }

  try {
    const plain = Buffer.concat([decipher.update(buf), decipher.final()]);
    return { plain: plain.toString("utf8"), bits, inputEncoding };
  } catch (err) {
    // GCM 校验失败与 CBC 填充错误在这里都会抛，原始信息（如
    // "Unsupported state or unable to authenticate data"）对用户没有指导性。
    if (mode === "gcm") {
      throw new Error(
        "GCM 认证失败：密钥、Nonce 或密文不匹配，也可能是密文被改动过",
      );
    }
    throw new Error(
      `解密失败：密钥或 ${mode === "ecb" ? "密文" : "IV"} 不正确（${
        err instanceof Error ? err.message : String(err)
      }）`,
    );
  }
}
