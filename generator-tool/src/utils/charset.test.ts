import {
  CHARSET_PARTS,
  DEFAULT_CHARSET,
  describeCharset,
  resolveCharset,
} from "./charset";

describe("resolveCharset", () => {
  it("单个标识展开为对应字符集", () => {
    expect(resolveCharset("l")).toBe(CHARSET_PARTS.l);
    expect(resolveCharset("u")).toBe(CHARSET_PARTS.u);
    expect(resolveCharset("d")).toBe(CHARSET_PARTS.d);
    expect(resolveCharset("s")).toBe(CHARSET_PARTS.s);
  });

  it("任意组合", () => {
    expect(resolveCharset("ld")).toBe(CHARSET_PARTS.l + CHARSET_PARTS.d);
    expect(resolveCharset("us")).toBe(CHARSET_PARTS.u + CHARSET_PARTS.s);
    expect(resolveCharset("luds")).toBe(
      CHARSET_PARTS.l + CHARSET_PARTS.u + CHARSET_PARTS.d + CHARSET_PARTS.s,
    );
  });

  it("顺序不影响结果（固定按 l/u/d/s 拼接）", () => {
    expect(resolveCharset("dl")).toBe(resolveCharset("ld"));
    expect(resolveCharset("sdul")).toBe(resolveCharset("luds"));
  });

  it("重复标识去重", () => {
    expect(resolveCharset("lll")).toBe(CHARSET_PARTS.l);
    expect(resolveCharset("ldld")).toBe(resolveCharset("ld"));
  });

  it("大小写不敏感", () => {
    expect(resolveCharset("LUD")).toBe(resolveCharset("lud"));
    expect(resolveCharset("Ld")).toBe(resolveCharset("ld"));
  });

  it("空值用默认字符集", () => {
    expect(resolveCharset(undefined)).toBe(resolveCharset(DEFAULT_CHARSET));
    expect(resolveCharset("")).toBe(resolveCharset(DEFAULT_CHARSET));
    expect(resolveCharset("   ")).toBe(resolveCharset(DEFAULT_CHARSET));
  });

  it("默认字符集是小写+大写+数字，不含符号", () => {
    const def = resolveCharset(undefined);
    expect(def).toContain("a");
    expect(def).toContain("A");
    expect(def).toContain("0");
    expect(def).not.toContain("!");
  });

  it("未知标识报错且提示可用值", () => {
    expect(() => resolveCharset("x")).toThrow("未知的字符集标识");
    expect(() => resolveCharset("lux")).toThrow("未知的字符集标识");
    expect(() => resolveCharset("l-d")).toThrow("未知的字符集标识");
  });

  it("字符集无重复字符", () => {
    const all = resolveCharset("luds");
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("describeCharset", () => {
  it("给出可读描述", () => {
    expect(describeCharset("lud")).toBe("小写+大写+数字");
    expect(describeCharset("ld")).toBe("小写+数字");
    expect(describeCharset("s")).toBe("符号");
    expect(describeCharset("luds")).toBe("小写+大写+数字+符号");
  });

  it("空值描述为默认组合", () => {
    expect(describeCharset(undefined)).toBe("小写+大写+数字");
  });
});
