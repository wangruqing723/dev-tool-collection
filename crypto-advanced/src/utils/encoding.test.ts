import {
  detectEncoding,
  parseAesKey,
  describeAesKey,
  maskKey,
} from "./encoding";

describe("detectEncoding", () => {
  it("识别 hex", () => {
    expect(detectEncoding("0123456789abcdef")).toBe("hex");
  });

  it("奇数长度的 hex 字符不算 hex", () => {
    expect(detectEncoding("abc")).toBe("utf8");
  });

  it("识别带填充的 base64", () => {
    expect(detectEncoding("aGVsbG8gd29ybGQ=")).toBe("base64");
  });

  it("普通文本落到 utf8", () => {
    expect(detectEncoding("你好，世界")).toBe("utf8");
  });
});

describe("parseAesKey", () => {
  it("32 位 Hex 判为 AES-128", () => {
    const info = parseAesKey("0123456789abcdeffedcba9876543210");
    expect(info).toMatchObject({ bits: 128, encoding: "hex" });
    expect(info.key.length).toBe(16);
  });

  it("48 位 Hex 判为 AES-192", () => {
    expect(parseAesKey("ab".repeat(24)).bits).toBe(192);
  });

  it("64 位 Hex 判为 AES-256", () => {
    expect(parseAesKey("ab".repeat(32)).bits).toBe(256);
  });

  it("Base64 的 32 字节密钥判为 AES-256", () => {
    const b64 = Buffer.alloc(32, 7).toString("base64");
    expect(parseAesKey(b64)).toMatchObject({ bits: 256, encoding: "base64" });
  });

  // 锁定 ADR 讨论中定下的取舍：恰好 32 字符且全为 Hex 字符时按 Hex 读。
  // 同一串按 Base64 读会是 24 字节（AES-192），两者都合法，这里刻意选 Hex。
  it("32 字符全 Hex 的二义输入按 Hex 解读（而非 Base64 的 AES-192）", () => {
    const ambiguous = "0123456789abcdef0123456789abcdef";
    expect(Buffer.from(ambiguous, "base64").length).toBe(24); // 确认二义性真实存在
    expect(parseAesKey(ambiguous).bits).toBe(128);
  });

  it("解码后长度不合法时报错", () => {
    expect(() => parseAesKey("ab".repeat(10))).toThrow(/16 \/ 24 \/ 32 字节/);
  });

  it("空输入报错", () => {
    expect(() => parseAesKey("   ")).toThrow(/请输入/);
  });

  it("非规范 base64 填充位被拒", () => {
    // "AB==" 解码为 1 字节 0x00，回环编码得到 "AA=="，不一致故不采纳
    expect(() => parseAesKey("AB==")).toThrow();
  });
});

describe("describeAesKey", () => {
  it("成功时回显推定结果", () => {
    expect(describeAesKey("ab".repeat(32))).toBe(
      "已识别：AES-256（Hex，32 字节）",
    );
  });

  it("失败时回显原因而不是抛错", () => {
    expect(describeAesKey("zz")).toMatch(/必须是 Hex 或 Base64/);
  });
});

describe("maskKey", () => {
  it("长密钥保留首尾", () => {
    expect(maskKey("0123456789abcdeffedcba9876543210")).toBe(
      "012345******3210",
    );
  });

  it("短密钥全掩", () => {
    expect(maskKey("abc")).toBe("***");
  });
});
