import {
  analyzeUnicode,
  decodeUnicodeSequence,
  detectInputType,
  getCodePoints,
  toDecimalFormat,
  toHexFormat,
  toJSFormat,
  toUnicodeStdFormat,
} from "./unicode";

describe("码点处理（BMP 外字符）", () => {
  // 这组是核心回归：原实现用 charCodeAt(0)，对代理对只取到高位，
  // 😀 会被当成 2 个字符并输出损坏的 \ud83d
  it("emoji 按 1 个码点计数，而非 UTF-16 长度 2", () => {
    expect("😀".length).toBe(2); // UTF-16 长度
    expect(getCodePoints("😀")).toHaveLength(1); // 码点数
    expect(getCodePoints("😀")[0].code).toBe(0x1f600);
  });

  it("混合文本按码点拆分", () => {
    expect(getCodePoints("A😀中")).toHaveLength(3);
    expect("A😀中".length).toBe(4);
  });

  it("各格式输出完整码点而非高位代理", () => {
    expect(toHexFormat("😀")).toBe("1F600");
    expect(toUnicodeStdFormat("😀")).toBe("U+1F600");
    expect(toDecimalFormat("😀")).toBe("128512");
    // 超过 0xFFFF 用 \u{...}，\uXXXX 表示不了
    expect(toJSFormat("😀")).toBe("\\u{1F600}");
  });

  it("BMP 内字符仍用 \\uXXXX", () => {
    expect(toJSFormat("你好")).toBe("\\u4f60\\u597d");
    expect(toHexFormat("你好")).toBe("4F60 597D");
  });
});

describe("编解码回环", () => {
  const inputs = ["你好", "😀", "A😀中", "abc", "  空格 "];

  for (const input of inputs) {
    it(`${JSON.stringify(input)} 四种格式均可解回原文`, () => {
      const a = analyzeUnicode(input);
      expect(decodeUnicodeSequence(a.hex)).toBe(a.originalText);
      expect(decodeUnicodeSequence(a.javascript)).toBe(a.originalText);
      expect(decodeUnicodeSequence(a.unicode)).toBe(a.originalText);
      expect(decodeUnicodeSequence(a.decimal)).toBe(a.originalText);
    });
  }
});

describe("已修 bug 的回归测试", () => {
  it("U+XXXX 解码不残留分隔空格", () => {
    // 曾解成「你 好」：用 replace 只替换 token，分隔空格被留下
    expect(decodeUnicodeSequence("U+4F60 U+597D")).toBe("你好");
  });

  it("无空格的单个 5 位码点不被按 4 位切分", () => {
    // 曾切成 1F60 + 残余 0，解出错字 ὠ
    expect(decodeUnicodeSequence("1F600")).toBe("😀");
  });

  it("无空格的 4 位分组仍兼容", () => {
    expect(decodeUnicodeSequence("4F60597D")).toBe("你好");
  });

  it("空格分隔的混合位宽码点", () => {
    expect(decodeUnicodeSequence("0041 1F600 4E2D")).toBe("A😀中");
  });

  it("\\u{...} 与 \\uXXXX 混写可解", () => {
    expect(decodeUnicodeSequence("\\u0041\\u{1F600}\\u4e2d")).toBe("A😀中");
  });

  it("带前导零的纯数字串按十六进制而非十进制解析", () => {
    // "abc" 的十六进制是 0061 0062 0063，全是数字。
    // 曾因十进制分支优先而解成 61/62/63 → "=>?"
    expect(decodeUnicodeSequence("0061 0062 0063")).toBe("abc");
  });

  it("无前导零的纯数字串仍按十进制解析", () => {
    expect(decodeUnicodeSequence("20320 22909")).toBe("你好");
    expect(decodeUnicodeSequence("128512")).toBe("😀");
  });
});

describe("输入类型检测", () => {
  it("普通文本判为 text", () => {
    expect(detectInputType("你好")).toBe("text");
    expect(detectInputType("hello")).toBe("text");
  });

  it("各 Unicode 写法判为 unicode", () => {
    expect(detectInputType("\\u4f60")).toBe("unicode");
    expect(detectInputType("\\u{1F600}")).toBe("unicode");
    expect(detectInputType("U+4F60")).toBe("unicode");
    expect(detectInputType("U+1F600")).toBe("unicode");
    expect(detectInputType("20320 22909")).toBe("unicode");
  });
});

describe("非法输入", () => {
  it("无法识别的格式抛错", () => {
    expect(() => decodeUnicodeSequence("这不是编码 %%%")).toThrow(
      "无法识别的 Unicode 格式",
    );
  });
});
