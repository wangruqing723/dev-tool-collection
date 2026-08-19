import crypto from "crypto";
import {
  aesEncrypt,
  aesDecrypt,
  parseIv,
  ivLabelFor,
  ivLengthFor,
  defaultIvSource,
  type AesMode,
} from "./aes";

const KEY128 = "0123456789abcdeffedcba9876543210"; // 32 Hex = 16 字节
const KEY192 = "ab".repeat(24);
const KEY256 = "ab".repeat(32);
const PLAIN = "你好，AES —— hello";

const MODES: AesMode[] = ["cbc", "gcm", "ecb"];

describe("加解密往返（自动 IV）", () => {
  for (const mode of MODES) {
    for (const [name, key] of [
      ["AES-128", KEY128],
      ["AES-192", KEY192],
      ["AES-256", KEY256],
    ] as const) {
      it(`${name}/${mode.toUpperCase()} 往返一致`, () => {
        const enc = aesEncrypt({
          text: PLAIN,
          keyInput: key,
          mode,
          ivSource: "auto",
          outputEncoding: "hex",
        });
        const dec = aesDecrypt({
          cipherText: enc.cipher,
          keyInput: key,
          mode,
          ivSource: "auto",
        });
        expect(dec.plain).toBe(PLAIN);
      });
    }
  }

  it("Base64 输出同样能往返", () => {
    const enc = aesEncrypt({
      text: PLAIN,
      keyInput: KEY256,
      mode: "gcm",
      ivSource: "auto",
      outputEncoding: "base64",
    });
    expect(
      aesDecrypt({
        cipherText: enc.cipher,
        keyInput: KEY256,
        mode: "gcm",
        ivSource: "auto",
      }).plain,
    ).toBe(PLAIN);
  });
});

describe("自包含密文的字节布局", () => {
  it("CBC 自动 IV：前 16 字节是 IV", () => {
    const enc = aesEncrypt({
      text: PLAIN,
      keyInput: KEY128,
      mode: "cbc",
      ivSource: "auto",
      outputEncoding: "hex",
    });
    expect(enc.ivPacked).toBe(true);
    expect(Buffer.from(enc.cipher, "hex").subarray(0, 16).toString("hex")).toBe(
      enc.iv,
    );
  });

  it("GCM 自动 IV：nonce(12) || ct || tag(16)", () => {
    const text = "hello"; // 5 字节，GCM 不填充
    const enc = aesEncrypt({
      text,
      keyInput: KEY256,
      mode: "gcm",
      ivSource: "auto",
      outputEncoding: "hex",
    });
    const buf = Buffer.from(enc.cipher, "hex");
    expect(buf.length).toBe(12 + Buffer.byteLength(text) + 16);
    expect(buf.subarray(0, 12).toString("hex")).toBe(enc.iv);
  });

  it("ECB 无 IV 且不打包", () => {
    const enc = aesEncrypt({
      text: PLAIN,
      keyInput: KEY128,
      mode: "ecb",
      ivSource: "auto",
      outputEncoding: "hex",
    });
    expect(enc.iv).toBeUndefined();
    expect(enc.ivPacked).toBe(false);
  });

  it("手动 IV 时不打包（对接不打包的外部系统）", () => {
    const iv = "00".repeat(16);
    const enc = aesEncrypt({
      text: PLAIN,
      keyInput: KEY128,
      mode: "cbc",
      ivSource: "manual",
      ivInput: iv,
      outputEncoding: "hex",
    });
    expect(enc.ivPacked).toBe(false);
    expect(enc.cipher.startsWith(iv)).toBe(false);

    expect(
      aesDecrypt({
        cipherText: enc.cipher,
        keyInput: KEY128,
        mode: "cbc",
        ivSource: "manual",
        ivInput: iv,
      }).plain,
    ).toBe(PLAIN);
  });
});

describe("与外部实现互操作", () => {
  // 用 Node crypto 手工构造密文，验证我们的拆包约定与「别人的实现」一致。
  it("能解开外部按 iv||ct 拼好的 CBC 密文", () => {
    const key = Buffer.from(KEY256, "hex");
    const iv = crypto.randomBytes(16);
    const c = crypto.createCipheriv("aes-256-cbc", key, iv);
    const ct = Buffer.concat([c.update(PLAIN, "utf8"), c.final()]);
    const packed = Buffer.concat([iv, ct]).toString("base64");

    expect(
      aesDecrypt({
        cipherText: packed,
        keyInput: KEY256,
        mode: "cbc",
        ivSource: "auto",
      }).plain,
    ).toBe(PLAIN);
  });

  it("能解开外部按 nonce||ct||tag 拼好的 GCM 密文", () => {
    const key = Buffer.from(KEY256, "hex");
    const nonce = crypto.randomBytes(12);
    const c = crypto.createCipheriv("aes-256-gcm", key, nonce);
    const ct = Buffer.concat([c.update(PLAIN, "utf8"), c.final()]);
    const packed = Buffer.concat([nonce, ct, c.getAuthTag()]).toString("hex");

    expect(
      aesDecrypt({
        cipherText: packed,
        keyInput: KEY256,
        mode: "gcm",
        ivSource: "auto",
      }).plain,
    ).toBe(PLAIN);
  });

  it("我们产出的 GCM 密文能被外部按同约定解开", () => {
    const enc = aesEncrypt({
      text: PLAIN,
      keyInput: KEY256,
      mode: "gcm",
      ivSource: "auto",
      outputEncoding: "hex",
    });
    const buf = Buffer.from(enc.cipher, "hex");
    const d = crypto.createDecipheriv(
      "aes-256-gcm",
      Buffer.from(KEY256, "hex"),
      buf.subarray(0, 12),
    );
    d.setAuthTag(buf.subarray(buf.length - 16));
    const plain = Buffer.concat([
      d.update(buf.subarray(12, buf.length - 16)),
      d.final(),
    ]).toString("utf8");
    expect(plain).toBe(PLAIN);
  });
});

describe("ECB 的已知弱点在实现中确实存在（防回归）", () => {
  // ADR-0003 刻意保留 ECB。这条测试把「相同明文块产出相同密文块」钉住，
  // 既证明实现无误，也让后来者看到风险是真实的。
  it("重复的明文块产出重复的密文块", () => {
    const block = "0123456789abcdef"; // 恰好 16 字节
    const enc = aesEncrypt({
      text: block + block,
      keyInput: KEY128,
      mode: "ecb",
      ivSource: "auto",
      outputEncoding: "hex",
    });
    const buf = Buffer.from(enc.cipher, "hex");
    expect(buf.subarray(0, 16).toString("hex")).toBe(
      buf.subarray(16, 32).toString("hex"),
    );
  });
});

describe("错误处理", () => {
  it("GCM 认证失败给出可读错误", () => {
    const enc = aesEncrypt({
      text: PLAIN,
      keyInput: KEY256,
      mode: "gcm",
      ivSource: "auto",
      outputEncoding: "hex",
    });
    // 翻掉密文最后一个字节，破坏 tag
    // 翻掉最后一个 hex 字符，同时保持长度为偶数（否则会先被编码校验拦下）
    const last = enc.cipher.slice(-1);
    const tampered = enc.cipher.slice(0, -1) + (last === "0" ? "1" : "0");
    expect(() =>
      aesDecrypt({
        cipherText: tampered,
        keyInput: KEY256,
        mode: "gcm",
        ivSource: "auto",
      }),
    ).toThrow(/GCM 认证失败/);
  });

  it("错误密钥解密 CBC 给出可读错误", () => {
    const enc = aesEncrypt({
      text: PLAIN,
      keyInput: KEY256,
      mode: "cbc",
      ivSource: "auto",
      outputEncoding: "hex",
    });
    expect(() =>
      aesDecrypt({
        cipherText: enc.cipher,
        keyInput: "cd".repeat(32),
        mode: "cbc",
        ivSource: "auto",
      }),
    ).toThrow(/解密失败/);
  });

  it("密文短于 IV 前缀时提示改用手动 IV", () => {
    expect(() =>
      aesDecrypt({
        cipherText: "00112233",
        keyInput: KEY128,
        mode: "cbc",
        ivSource: "auto",
      }),
    ).toThrow(/手动指定/);
  });

  it("非 hex/base64 的密文被拒", () => {
    expect(() =>
      aesDecrypt({
        cipherText: "你好",
        keyInput: KEY128,
        mode: "cbc",
        ivSource: "auto",
      }),
    ).toThrow(/不像合法密文/);
  });

  it("空明文被拒", () => {
    expect(() =>
      aesEncrypt({
        text: "",
        keyInput: KEY128,
        mode: "cbc",
        ivSource: "auto",
        outputEncoding: "hex",
      }),
    ).toThrow(/请输入要加密的文本/);
  });
});

describe("IV 解析与文案", () => {
  it("长度不符时报出实际字节数", () => {
    expect(() => parseIv("00".repeat(12), "cbc")).toThrow(
      /必须是 16 字节，当前解码得到 12 字节/,
    );
  });

  it("GCM 缺 nonce 时用 Nonce 字样", () => {
    expect(() => parseIv("", "gcm")).toThrow(/必须提供 Nonce/);
  });

  it("接受 Base64 形式的 IV", () => {
    expect(parseIv(Buffer.alloc(16, 9).toString("base64"), "cbc").length).toBe(
      16,
    );
  });

  // 这条方向搞反的话，GCM 会默认让用户手打 nonce —— 正是设计上要避免的危险
  it("GCM 默认自动生成，CBC 默认手动（与 SM4 一致）", () => {
    expect(defaultIvSource("gcm")).toBe("auto");
    expect(defaultIvSource("cbc")).toBe("manual");
  });

  it("GCM 文案用 Nonce，CBC 用 IV，ECB 无", () => {
    expect(ivLabelFor("gcm")).toMatch(/^Nonce（12 字节/);
    expect(ivLabelFor("cbc")).toMatch(/^IV（16 字节/);
    expect(ivLabelFor("ecb")).toBe("");
    expect(ivLengthFor("ecb")).toBe(0);
  });
});
