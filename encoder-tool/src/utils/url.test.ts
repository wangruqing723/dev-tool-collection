import {
  analyzeUrl,
  decodeFormUrl,
  decodeFullUrl,
  decodeUrlComponent,
  detectUrlOperation,
  encodeFormUrl,
  encodeFullUrl,
  encodeUrlComponent,
} from "./url";

function result(
  input: string,
  operation: "encode" | "decode",
  format: "component" | "uri" | "form",
) {
  return analyzeUrl(input).find(
    (item) => item.operation === operation && item.format === format,
  );
}

describe("URL 编解码基础语义", () => {
  it("组件编码会编码 URL 结构字符，完整 URL 编码会保留结构", () => {
    const input = "https://example.com/a path?q=hello world#top";

    expect(encodeUrlComponent(input)).toBe(
      "https%3A%2F%2Fexample.com%2Fa%20path%3Fq%3Dhello%20world%23top",
    );
    expect(encodeFullUrl(input)).toBe(
      "https://example.com/a%20path?q=hello%20world#top",
    );
  });

  it("表单编码使用 + 表示空格，并编码原始加号", () => {
    expect(encodeFormUrl("a b+c")).toBe("a+b%2Bc");
    expect(decodeFormUrl("a+b%2Bc")).toBe("a b+c");
  });

  it("三种解码均保留输入中的首尾空白", () => {
    expect(decodeUrlComponent("%20hello%20")).toBe(" hello ");
    expect(decodeFullUrl("%20hello%20")).toBe(" hello ");
    expect(decodeFormUrl("+hello+")).toBe(" hello ");
  });
});

describe("自动识别", () => {
  it("完整且可还原的百分号序列进入解码", () => {
    expect(detectUrlOperation("hello%20world")).toBe("decode");
    expect(result("hello%20world", "decode", "component")?.value).toBe(
      "hello world",
    );
  });

  it("普通文本、孤立百分号和非 UTF-8 转义进入编码", () => {
    expect(detectUrlOperation("hello world")).toBe("encode");
    expect(detectUrlOperation("100% organic")).toBe("encode");
    expect(detectUrlOperation("%FF")).toBe("encode");
    expect(result("100% organic", "encode", "component")?.value).toBe(
      "100%25%20organic",
    );
  });

  it("加号输入同时展示表单解码候选", () => {
    const conversions = analyzeUrl("a+b");

    expect(conversions).toHaveLength(4);
    expect(result("a+b", "decode", "form")?.value).toBe("a b");
    expect(result("a+b", "encode", "component")?.value).toBe("a%2Bb");
  });
});

describe("自动结果包含三个标准候选", () => {
  it("编码结果同时提供组件、完整 URL 和表单语义", () => {
    const conversions = analyzeUrl("a b");

    expect(conversions.map((item) => item.format)).toEqual([
      "component",
      "uri",
      "form",
    ]);
    expect(conversions.map((item) => item.value)).toEqual([
      "a%20b",
      "a%20b",
      "a+b",
    ]);
  });

  it("解码结果同时提供三种语义并保留标签", () => {
    const conversions = analyzeUrl("a%2Bb");

    expect(conversions.map((item) => item.operation)).toEqual([
      "decode",
      "decode",
      "decode",
    ]);
    expect(conversions[0].label).toContain("URL 组件");
    expect(conversions[1].label).toContain("完整 URL");
    expect(conversions[2].label).toContain("表单");
    expect(decodeUrlComponent("a%2Bb")).toBe("a+b");
    expect(decodeFullUrl("a%2Bb")).toBe("a%2Bb");
  });
});
