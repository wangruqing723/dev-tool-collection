// URL 编解码的纯逻辑。命令层只负责输入和展示，方便在 Node/Jest 中验证边界行为。

export type UrlFormat = "component" | "uri" | "form";
export type UrlOperation = "encode" | "decode";

export interface UrlConversion {
  format: UrlFormat;
  operation: UrlOperation;
  label: string;
  value: string;
}

const FORMAT_LABELS: Record<UrlFormat, string> = {
  component: "URL 组件",
  uri: "完整 URL",
  form: "表单（空格 → +）",
};

/**
 * 判断输入是否包含完整的百分号转义序列。
 * 没有百分号时不能据此判断为编码文本；带有孤立或非法百分号时也不解码。
 */
function hasValidPercentEscapes(input: string): boolean {
  return /%[0-9a-fA-F]{2}/.test(input) && !/%(?![0-9a-fA-F]{2})/.test(input);
}

/** 只有成功还原为 UTF-8 文本时，自动模式才把输入视为待解码内容。 */
function canDecode(input: string): boolean {
  if (!hasValidPercentEscapes(input)) {
    return false;
  }

  try {
    decodeURIComponent(input);
    return true;
  } catch {
    // 例如 %FF 虽然语法上完整，但不是合法的 UTF-8 文本。
    return false;
  }
}

export function detectUrlOperation(input: string): UrlOperation {
  return canDecode(input) ? "decode" : "encode";
}

/** URL 组件编码：会编码协议分隔符、查询分隔符等保留字符。 */
export function encodeUrlComponent(input: string): string {
  return encodeURIComponent(input);
}

/** 完整 URL 编码：保留 URL 的结构分隔符，只编码不安全字符。 */
export function encodeFullUrl(input: string): string {
  return encodeURI(input);
}

/** application/x-www-form-urlencoded 风格编码：空格写成 +，加号自身仍会被编码。 */
export function encodeFormUrl(input: string): string {
  return encodeURIComponent(input).replace(/%20/g, "+");
}

/** URL 组件解码。 */
export function decodeUrlComponent(input: string): string {
  return decodeURIComponent(input);
}

/** 完整 URL 解码：保留仍代表 URL 结构的保留字符转义。 */
export function decodeFullUrl(input: string): string {
  return decodeURI(input);
}

/** 表单解码：先把 + 还原为空格，再执行百分号解码。 */
export function decodeFormUrl(input: string): string {
  return decodeURIComponent(input.replace(/\+/g, " "));
}

export function encodeUrl(input: string, format: UrlFormat): string {
  switch (format) {
    case "component":
      return encodeUrlComponent(input);
    case "uri":
      return encodeFullUrl(input);
    case "form":
      return encodeFormUrl(input);
  }
}

export function decodeUrl(input: string, format: UrlFormat): string {
  switch (format) {
    case "component":
      return decodeUrlComponent(input);
    case "uri":
      return decodeFullUrl(input);
    case "form":
      return decodeFormUrl(input);
  }
}

function conversionLabel(operation: UrlOperation, format: UrlFormat): string {
  return `${FORMAT_LABELS[format]}${operation === "encode" ? "编码" : "解码"}`;
}

/**
 * 生成命令中展示的候选结果。
 *
 * 普通文本（包括没有百分号的 URL）默认进入编码分支，三个候选分别对应
 * encodeURIComponent、encodeURI 和表单编码。输入只有加号时还会额外展示
 * 表单解码，提醒用户 + 在表单语义中可能代表空格。
 */
export function analyzeUrl(input: string): UrlConversion[] {
  const operation = detectUrlOperation(input);
  const formats: UrlFormat[] = ["component", "uri", "form"];

  const conversions = formats.map((format) => ({
    format,
    operation,
    label: conversionLabel(operation, format),
    value:
      operation === "encode"
        ? encodeUrl(input, format)
        : decodeUrl(input, format),
  }));

  // a+b 没有百分号，无法可靠判断它是原文还是表单编码结果。
  // 编码候选照常保留，同时给出唯一有额外语义的表单解码候选。
  if (operation === "encode" && input.includes("+")) {
    try {
      conversions.push({
        format: "form",
        operation: "decode",
        label: "表单解码（+ → 空格）",
        value: decodeFormUrl(input),
      });
    } catch {
      // 孤立百分号等非法内容不能作为表单解码结果展示。
    }
  }

  return conversions;
}
