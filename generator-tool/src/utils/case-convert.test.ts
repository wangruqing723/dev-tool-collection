import {
  splitWords,
  toCamelCase,
  toConstantCase,
  toDotCase,
  toKebabCase,
  toPascalCase,
  toSnakeCase,
} from "./case-convert";

describe("splitWords", () => {
  it("按空格、下划线、短横切词", () => {
    expect(splitWords("Weekly Test")).toEqual(["Weekly", "Test"]);
    expect(splitWords("weekly_test")).toEqual(["weekly", "test"]);
    expect(splitWords("weekly-test")).toEqual(["weekly", "test"]);
    expect(splitWords("weekly.test")).toEqual(["weekly", "test"]);
  });

  it("按驼峰边界切词", () => {
    expect(splitWords("weeklyTest")).toEqual(["weekly", "Test"]);
    expect(splitWords("WeeklyTest")).toEqual(["Weekly", "Test"]);
  });

  it("连续大写的缩写视为一个词", () => {
    expect(splitWords("XMLHttpRequest")).toEqual(["XML", "Http", "Request"]);
    expect(splitWords("IOError")).toEqual(["IO", "Error"]);
    expect(splitWords("parseJSON")).toEqual(["parse", "JSON"]);
    expect(splitWords("user ID")).toEqual(["user", "ID"]);
  });

  it("数字不单独成词，黏在前面的字母上", () => {
    expect(splitWords("user2FA")).toEqual(["user2", "FA"]);
    expect(splitWords("v2Api")).toEqual(["v2", "Api"]);
    expect(splitWords("base64Encode")).toEqual(["base64", "Encode"]);
  });

  it("忽略多余分隔符与首尾分隔符", () => {
    expect(splitWords("  foo   bar  ")).toEqual(["foo", "bar"]);
    expect(splitWords("__foo__bar__")).toEqual(["foo", "bar"]);
    expect(splitWords("foo-_ bar")).toEqual(["foo", "bar"]);
  });

  it("混合分隔符与驼峰", () => {
    expect(splitWords("foo-Bar baz")).toEqual(["foo", "Bar", "baz"]);
    expect(splitWords("foo_barBaz-QUX")).toEqual(["foo", "bar", "Baz", "QUX"]);
  });

  it("空输入得到空词表", () => {
    expect(splitWords("")).toEqual([]);
    expect(splitWords("   ")).toEqual([]);
    expect(splitWords("---")).toEqual([]);
  });

  it("保留非 ASCII 词字符", () => {
    expect(splitWords("你好 世界")).toEqual(["你好", "世界"]);
    expect(splitWords("caféTest")).toEqual(["café", "Test"]);
  });
});

describe("修复：分隔符与大写字母相邻不产出重复分隔符", () => {
  // 回归用例：旧实现把 "Weekly Test" 转成 weekly__test
  it("Weekly Test", () => {
    expect(toSnakeCase("Weekly Test")).toBe("weekly_test");
    expect(toKebabCase("Weekly Test")).toBe("weekly-test");
    expect(toDotCase("Weekly Test")).toBe("weekly.test");
    expect(toConstantCase("Weekly Test")).toBe("WEEKLY_TEST");
  });

  it("user ID", () => {
    expect(toSnakeCase("user ID")).toBe("user_id");
    expect(toKebabCase("user ID")).toBe("user-id");
  });

  it("foo-Bar baz", () => {
    expect(toSnakeCase("foo-Bar baz")).toBe("foo_bar_baz");
    expect(toKebabCase("foo-Bar baz")).toBe("foo-bar-baz");
    expect(toDotCase("foo-Bar baz")).toBe("foo.bar.baz");
  });

  it("任何输入都不含连续分隔符", () => {
    const inputs = [
      "Weekly Test",
      "user ID",
      "foo-Bar baz",
      "  A  B  ",
      "__Foo__Bar__",
    ];
    for (const input of inputs) {
      expect(toSnakeCase(input)).not.toMatch(/__/);
      expect(toKebabCase(input)).not.toMatch(/--/);
      expect(toDotCase(input)).not.toMatch(/\.\./);
      expect(toConstantCase(input)).not.toMatch(/__/);
    }
  });

  it("结果不以分隔符开头或结尾", () => {
    const inputs = ["Weekly Test", " Foo ", "_Foo_", "FooBar"];
    for (const input of inputs) {
      expect(toSnakeCase(input)).not.toMatch(/^_|_$/);
      expect(toKebabCase(input)).not.toMatch(/^-|-$/);
      expect(toDotCase(input)).not.toMatch(/^\.|\.$/);
    }
  });
});

describe("缩写按整词处理", () => {
  it("XMLHttpRequest", () => {
    expect(toSnakeCase("XMLHttpRequest")).toBe("xml_http_request");
    expect(toKebabCase("XMLHttpRequest")).toBe("xml-http-request");
    expect(toConstantCase("XMLHttpRequest")).toBe("XML_HTTP_REQUEST");
    expect(toCamelCase("XMLHttpRequest")).toBe("xmlHttpRequest");
    expect(toPascalCase("XMLHttpRequest")).toBe("XmlHttpRequest");
  });

  it("parseJSON / IOError", () => {
    expect(toSnakeCase("parseJSON")).toBe("parse_json");
    expect(toSnakeCase("IOError")).toBe("io_error");
    expect(toCamelCase("IOError")).toBe("ioError");
  });
});

describe("六种风格", () => {
  const cases: Array<[string, Record<string, string>]> = [
    [
      "Weekly Test",
      {
        camel: "weeklyTest",
        pascal: "WeeklyTest",
        snake: "weekly_test",
        kebab: "weekly-test",
        constant: "WEEKLY_TEST",
        dot: "weekly.test",
      },
    ],
    [
      "weekly_test",
      {
        camel: "weeklyTest",
        pascal: "WeeklyTest",
        snake: "weekly_test",
        kebab: "weekly-test",
        constant: "WEEKLY_TEST",
        dot: "weekly.test",
      },
    ],
    [
      "weeklyTest",
      {
        camel: "weeklyTest",
        pascal: "WeeklyTest",
        snake: "weekly_test",
        kebab: "weekly-test",
        constant: "WEEKLY_TEST",
        dot: "weekly.test",
      },
    ],
    [
      "user2FA",
      {
        camel: "user2Fa",
        pascal: "User2Fa",
        snake: "user2_fa",
        kebab: "user2-fa",
        constant: "USER2_FA",
        dot: "user2.fa",
      },
    ],
  ];

  it.each(cases)("%s", (input, expected) => {
    expect(toCamelCase(input)).toBe(expected.camel);
    expect(toPascalCase(input)).toBe(expected.pascal);
    expect(toSnakeCase(input)).toBe(expected.snake);
    expect(toKebabCase(input)).toBe(expected.kebab);
    expect(toConstantCase(input)).toBe(expected.constant);
    expect(toDotCase(input)).toBe(expected.dot);
  });

  it("各风格互相幂等（同风格再转一次结果不变）", () => {
    const input = "Weekly Test Case";
    expect(toSnakeCase(toSnakeCase(input))).toBe(toSnakeCase(input));
    expect(toKebabCase(toKebabCase(input))).toBe(toKebabCase(input));
    expect(toDotCase(toDotCase(input))).toBe(toDotCase(input));
    expect(toCamelCase(toCamelCase(input))).toBe(toCamelCase(input));
    expect(toPascalCase(toPascalCase(input))).toBe(toPascalCase(input));
  });

  it("空输入返回空串", () => {
    for (const fn of [
      toCamelCase,
      toPascalCase,
      toSnakeCase,
      toKebabCase,
      toConstantCase,
      toDotCase,
    ]) {
      expect(fn("")).toBe("");
      expect(fn("   ")).toBe("");
    }
  });
});
