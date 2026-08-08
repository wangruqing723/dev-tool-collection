import {
  ensureBase64,
  ensureHashHex,
  ensureHex,
  ensureNonEmpty,
  ensureNumberInRange,
  ensureOneOf,
} from "./guard";

describe("ensureNonEmpty", () => {
  it("返回非空值", () => {
    expect(ensureNonEmpty("abc")).toBe("abc");
  });

  it("空串与纯空白抛错", () => {
    expect(() => ensureNonEmpty("")).toThrow("不能为空");
    expect(() => ensureNonEmpty("   ")).toThrow("不能为空");
  });

  it("错误信息带字段名", () => {
    expect(() => ensureNonEmpty("", "密钥")).toThrow("密钥不能为空");
  });
});

describe("ensureNumberInRange", () => {
  it("区间内通过（含边界）", () => {
    expect(ensureNumberInRange(4, 4, 15)).toBe(4);
    expect(ensureNumberInRange(15, 4, 15)).toBe(15);
    expect(ensureNumberInRange(12, 4, 15)).toBe(12);
  });

  it("越界抛错", () => {
    expect(() => ensureNumberInRange(3, 4, 15)).toThrow("必须在 4 ~ 15 之间");
    expect(() => ensureNumberInRange(16, 4, 15)).toThrow("必须在 4 ~ 15 之间");
  });

  it("NaN 抛错", () => {
    expect(() => ensureNumberInRange(Number("abc"), 4, 15)).toThrow(
      "必须是数字",
    );
  });

  // bcrypt salt rounds 上限已由 31 收紧至 15：31 意味着 2^31 轮会卡死
  it("bcrypt salt rounds 上限 15", () => {
    expect(() => ensureNumberInRange(31, 4, 15, "Salt 位数")).toThrow(
      "Salt 位数 必须在 4 ~ 15 之间",
    );
  });
});

describe("ensureOneOf", () => {
  it("允许值通过", () => {
    expect(ensureOneOf("hex", ["hex", "base64"] as const)).toBe("hex");
  });

  it("非允许值抛错并列出候选", () => {
    expect(() => ensureOneOf("utf8", ["hex", "base64"] as const)).toThrow(
      "必须是 hex / base64",
    );
  });
});

describe("ensureBase64", () => {
  it("合法 Base64 通过", () => {
    expect(ensureBase64("aGVsbG8=")).toBe("aGVsbG8=");
    expect(ensureBase64("YWJjZA==")).toBe("YWJjZA==");
  });

  it("去除首尾空白", () => {
    expect(ensureBase64("  aGVsbG8=  ")).toBe("aGVsbG8=");
  });

  it("长度非 4 倍数抛错", () => {
    expect(() => ensureBase64("aGVsbG8")).toThrow("长度不是 4 的倍数");
  });

  it("非法字符抛错", () => {
    expect(() => ensureBase64("aGVs*G8=")).toThrow("非法 Base64 格式");
  });
});

describe("ensureHex", () => {
  it("合法 Hex 通过（大小写均可）", () => {
    expect(ensureHex("4f60")).toBe("4f60");
    expect(ensureHex("4F60")).toBe("4F60");
  });

  it("奇数长度抛错", () => {
    expect(() => ensureHex("4f6")).toThrow("长度必须是偶数");
  });

  it("非 Hex 字符抛错", () => {
    expect(() => ensureHex("4g60")).toThrow("只能包含 0-9 a-f A-F");
  });
});

describe("ensureHashHex", () => {
  const md5 = "d41d8cd98f00b204e9800998ecf8427e"; // 32 位

  it("长度匹配时通过", () => {
    expect(ensureHashHex(md5, [32])).toBe(md5);
  });

  it("长度不匹配抛错", () => {
    expect(() => ensureHashHex(md5, [40, 64])).toThrow("长度必须是 40 / 64");
  });

  it("非十六进制抛错", () => {
    expect(() => ensureHashHex("zzz", [3])).toThrow("必须是十六进制字符串");
  });
});
