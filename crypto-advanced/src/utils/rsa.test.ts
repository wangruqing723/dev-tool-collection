import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import {
  rsaEncrypt,
  rsaDecrypt,
  rsaSign,
  rsaVerify,
  generateRsaKeyPair,
  maxPlaintextBytes,
  resolveKeyMaterial,
  readPemFile,
  type CryptoPadding,
  type SignPadding,
  type Digest,
} from "./rsa";

// 2048 位密钥生成约几十毫秒到数百毫秒，整个 suite 共用一对，避免逐条重生成
const pair = generateRsaKeyPair(2048, "pkcs8");
const TEXT = "你好，RSA —— hello";

describe("密钥对生成", () => {
  it("公钥 SPKI、私钥 PKCS#8 的 PEM 头正确", () => {
    expect(pair.publicKey.startsWith("-----BEGIN PUBLIC KEY-----")).toBe(true);
    expect(pair.privateKey.startsWith("-----BEGIN PRIVATE KEY-----")).toBe(
      true,
    );
  });

  it("可选 PKCS#1 私钥（老工具链只认这个）", () => {
    const p1 = generateRsaKeyPair(2048, "pkcs1");
    expect(p1.privateKey.startsWith("-----BEGIN RSA PRIVATE KEY-----")).toBe(
      true,
    );
  });

  it("长度选项生效", () => {
    const p = generateRsaKeyPair(3072, "pkcs8");
    expect(
      crypto.createPublicKey(p.publicKey).asymmetricKeyDetails?.modulusLength,
    ).toBe(3072);
  });
});

describe("明文上限计算与实际能力一致", () => {
  // 计算公式必须与 OpenSSL 的真实上限一致，否则前置校验形同虚设
  const cases: Array<[CryptoPadding, number]> = [
    ["oaep-sha256", 190],
    ["oaep-sha1", 214],
    ["pkcs1", 245],
  ];

  for (const [padding, expected] of cases) {
    it(`${padding} 上限为 ${expected} 字节，且恰好可用、多一字节即失败`, () => {
      expect(maxPlaintextBytes(pair.publicKey, padding)).toBe(expected);

      const ok = "a".repeat(expected);
      expect(() =>
        rsaEncrypt({
          text: ok,
          publicKeyPem: pair.publicKey,
          padding,
          outputEncoding: "base64",
        }),
      ).not.toThrow();

      expect(() =>
        rsaEncrypt({
          text: "a".repeat(expected + 1),
          publicKeyPem: pair.publicKey,
          padding,
          outputEncoding: "base64",
        }),
      ).toThrow(/明文过长/);
    });
  }

  it("超限错误信息指向 AES 而非自造混合加密", () => {
    expect(() =>
      rsaEncrypt({
        text: "a".repeat(500),
        publicKeyPem: pair.publicKey,
        padding: "oaep-sha256",
        outputEncoding: "base64",
      }),
    ).toThrow(/AES/);
  });
});

describe("加解密往返", () => {
  // 只有 OAEP 能往返：PKCS1v1.5 的私钥解密被 Node 运行时禁用，见下一个 describe
  const paddings: CryptoPadding[] = ["oaep-sha256", "oaep-sha1"];

  for (const padding of paddings) {
    for (const enc of ["base64", "hex"] as const) {
      it(`${padding} + ${enc} 往返一致`, () => {
        const cipher = rsaEncrypt({
          text: TEXT,
          publicKeyPem: pair.publicKey,
          padding,
          outputEncoding: enc,
        });
        expect(
          rsaDecrypt({
            cipherText: cipher,
            privateKeyPem: pair.privateKey,
            padding,
            inputEncoding: enc,
          }),
        ).toBe(TEXT);
      });
    }
  }

  it("OAEP 摘要不匹配时给出可读错误", () => {
    const cipher = rsaEncrypt({
      text: TEXT,
      publicKeyPem: pair.publicKey,
      padding: "oaep-sha256",
      outputEncoding: "base64",
    });
    expect(() =>
      rsaDecrypt({
        cipherText: cipher,
        privateKeyPem: pair.privateKey,
        padding: "oaep-sha1",
        inputEncoding: "base64",
      }),
    ).toThrow(/解密失败/);
  });
});

// Node 18.19+ / 20+ 禁用了 PKCS1v1.5 私钥解密（CVE-2023-46809）。
// 这几条把「加密可用、解密不可用」这个不对称能力钉住——
// 若将来 Node 改变行为，测试会失败并提醒我们重新审视。
describe("PKCS#1 v1.5 的单向可用性", () => {
  it("公钥加密仍可用（可给只认 PKCS1 的老系统投递密文）", () => {
    expect(() =>
      rsaEncrypt({
        text: TEXT,
        publicKeyPem: pair.publicKey,
        padding: "pkcs1",
        outputEncoding: "base64",
      }),
    ).not.toThrow();
  });

  it("私钥解密被前置拦下，错误信息说明原因与替代方案", () => {
    const cipher = rsaEncrypt({
      text: TEXT,
      publicKeyPem: pair.publicKey,
      padding: "pkcs1",
      outputEncoding: "base64",
    });
    expect(() =>
      rsaDecrypt({
        cipherText: cipher,
        privateKeyPem: pair.privateKey,
        padding: "pkcs1",
        inputEncoding: "base64",
      }),
    ).toThrow(/CVE-2023-46809/);
  });

  it("Node 确实拒绝 PKCS1 私钥解密（约束仍然成立）", () => {
    const ct = crypto.publicEncrypt(
      { key: pair.publicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
      Buffer.from("hi"),
    );
    expect(() =>
      crypto.privateDecrypt(
        { key: pair.privateKey, padding: crypto.constants.RSA_PKCS1_PADDING },
        ct,
      ),
    ).toThrow(/no longer supported/);
  });
});

describe("签名验签", () => {
  const paddings: SignPadding[] = ["pkcs1", "pss"];
  const digests: Digest[] = ["sha256", "sha1", "sha384", "sha512"];

  for (const padding of paddings) {
    for (const digest of digests) {
      it(`${padding} + ${digest} 自签自验通过`, () => {
        const sig = rsaSign({
          text: TEXT,
          privateKeyPem: pair.privateKey,
          padding,
          digest,
          outputEncoding: "base64",
        });
        expect(
          rsaVerify({
            text: TEXT,
            signature: sig,
            publicKeyPem: pair.publicKey,
            padding,
            digest,
            signatureEncoding: "base64",
          }),
        ).toBe(true);
      });
    }
  }

  it("原文被改动后验签返回 false（而非抛错）", () => {
    const sig = rsaSign({
      text: TEXT,
      privateKeyPem: pair.privateKey,
      padding: "pkcs1",
      digest: "sha256",
      outputEncoding: "base64",
    });
    expect(
      rsaVerify({
        text: TEXT + "x",
        signature: sig,
        publicKeyPem: pair.publicKey,
        padding: "pkcs1",
        digest: "sha256",
        signatureEncoding: "base64",
      }),
    ).toBe(false);
  });

  it("填充方式不匹配时验签返回 false", () => {
    const sig = rsaSign({
      text: TEXT,
      privateKeyPem: pair.privateKey,
      padding: "pkcs1",
      digest: "sha256",
      outputEncoding: "base64",
    });
    expect(
      rsaVerify({
        text: TEXT,
        signature: sig,
        publicKeyPem: pair.publicKey,
        padding: "pss",
        digest: "sha256",
        signatureEncoding: "base64",
      }),
    ).toBe(false);
  });

  // 默认组合就是支付宝 RSA2 / 微信支付所用的 SHA256withRSA，
  // 这条测试把「默认值能对上主流生态」钉住
  it("默认 PKCS1+SHA256 与 Node 原生 SHA256withRSA 结果一致", () => {
    const ours = rsaSign({
      text: TEXT,
      privateKeyPem: pair.privateKey,
      padding: "pkcs1",
      digest: "sha256",
      outputEncoding: "base64",
    });
    const native = crypto
      .sign("sha256", Buffer.from(TEXT, "utf8"), pair.privateKey)
      .toString("base64");
    expect(ours).toBe(native);
  });

  it("Hex 编码的签名同样可验", () => {
    const sig = rsaSign({
      text: TEXT,
      privateKeyPem: pair.privateKey,
      padding: "pkcs1",
      digest: "sha256",
      outputEncoding: "hex",
    });
    expect(sig).toMatch(/^[0-9a-f]{512}$/); // 2048 位签名 = 256 字节
    expect(
      rsaVerify({
        text: TEXT,
        signature: sig,
        publicKeyPem: pair.publicKey,
        padding: "pkcs1",
        digest: "sha256",
        signatureEncoding: "hex",
      }),
    ).toBe(true);
  });

  it("空输入被拒", () => {
    expect(() =>
      rsaSign({
        text: "",
        privateKeyPem: pair.privateKey,
        padding: "pkcs1",
        digest: "sha256",
        outputEncoding: "base64",
      }),
    ).toThrow(/请输入要签名的内容/);

    expect(() =>
      rsaVerify({
        text: TEXT,
        signature: "  ",
        publicKeyPem: pair.publicKey,
        padding: "pkcs1",
        digest: "sha256",
        signatureEncoding: "base64",
      }),
    ).toThrow(/请输入待验证的签名值/);
  });
});

describe("密钥来源解析", () => {
  let dir: string;
  let pemPath: string;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "rsa-test-"));
    pemPath = path.join(dir, "pub.pem");
    fs.writeFileSync(pemPath, pair.publicKey);
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("从文件读取 PEM", () => {
    expect(readPemFile(pemPath)).toBe(pair.publicKey.trim());
  });

  it("非 PEM 文件被拒", () => {
    const bad = path.join(dir, "bad.txt");
    fs.writeFileSync(bad, "not a pem");
    expect(() => readPemFile(bad)).toThrow(/不像 PEM/);
  });

  it("粘贴内容优先于文件", () => {
    expect(resolveKeyMaterial(pair.publicKey, [pemPath], "公钥")).toBe(
      pair.publicKey.trim(),
    );
  });

  it("仅有文件时回退到文件", () => {
    expect(resolveKeyMaterial("   ", [pemPath], "公钥")).toBe(
      pair.publicKey.trim(),
    );
  });

  it("两者都空时报错并带字段名", () => {
    expect(() => resolveKeyMaterial(undefined, [], "私钥")).toThrow(
      /请粘贴或选择私钥/,
    );
  });
});
