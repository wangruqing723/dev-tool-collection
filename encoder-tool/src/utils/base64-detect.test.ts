import { isBase64Charset, looksLikeBase64 } from "./base64-detect";

describe("looksLikeBase64", () => {
  it("真正的 Base64 判为是", () => {
    expect(looksLikeBase64(Buffer.from("hello").toString("base64"))).toBe(true);
    expect(looksLikeBase64(Buffer.from("你好世界").toString("base64"))).toBe(
      true,
    );
    expect(looksLikeBase64("aGVsbG8=")).toBe(true);
  });

  // 核心回归：原实现只查字符集 + 长度是 4 倍数，而
  // Buffer.from(s,"base64") 对非法输入不抛错，导致普通单词被误判成
  // Base64 解成乱码。"abcd" 长度 4、字符集合法，正是那个坑。
  it("普通单词不被误判为 Base64", () => {
    expect(looksLikeBase64("abcd")).toBe(false);
    expect(looksLikeBase64("test")).toBe(false);
    expect(looksLikeBase64("Word")).toBe(false);
  });

  it("长度非 4 倍数判为否", () => {
    expect(looksLikeBase64("abc")).toBe(false);
    expect(looksLikeBase64("aGVsbG8")).toBe(false);
  });

  it("含非法字符判为否", () => {
    expect(looksLikeBase64("aGVs bG8=")).toBe(false);
    expect(looksLikeBase64("aGVs*bG8=")).toBe(false);
    expect(looksLikeBase64("中文文本")).toBe(false);
  });

  it("空串判为否", () => {
    expect(looksLikeBase64("")).toBe(false);
  });

  it("解出非法 UTF-8 的判为否（用户多半是想编码）", () => {
    // 随机二进制的 base64 解出来不是有效文本
    const binary = Buffer.from([0xff, 0xfe, 0xfd, 0xfc]).toString("base64");
    expect(looksLikeBase64(binary)).toBe(false);
  });

  it("往返一致性：编码结果一定判为是", () => {
    for (const s of ["a", "ab", "abc", "abcd", "你好", "mixed 中英 123"]) {
      const encoded = Buffer.from(s, "utf8").toString("base64");
      expect(looksLikeBase64(encoded)).toBe(true);
    }
  });
});

describe("isBase64Charset", () => {
  it("合法字符集通过", () => {
    expect(isBase64Charset("aGVsbG8=")).toBe(true);
    expect(isBase64Charset("abcd")).toBe(true);
  });

  it("非法字符不通过", () => {
    expect(isBase64Charset("aGVs bG8=")).toBe(false);
    expect(isBase64Charset("你好")).toBe(false);
    expect(isBase64Charset("a=b=")).toBe(false);
  });
});
