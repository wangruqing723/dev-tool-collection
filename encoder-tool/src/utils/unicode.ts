// Unicode 编码转换工具函数库

export interface UnicodeAnalysis {
  originalText: string;
  hex: string;
  javascript: string;
  unicode: string;
  decimal: string;
  codePoints: CodePoint[];
}

export interface CodePoint {
  char: string;
  code: number;
  hex: string;
  decimal: string;
}

// 检测输入类型
export function detectInputType(input: string): "text" | "unicode" | "unknown" {
  const trimmed = input.trim();

  // 检查 \uXXXX 与 \u{XXXXX} 格式（后者用于 BMP 外字符，如 emoji）
  if (/\\u(\{[0-9a-fA-F]{1,6}\}|[0-9a-fA-F]{4})/.test(trimmed)) {
    return "unicode";
  }

  // 检查 U+XXXX 格式（码点可多于 4 位）
  if (/U\+[0-9a-fA-F]{4,6}/i.test(trimmed)) {
    return "unicode";
  }

  // 检查十进制格式（纯数字和空格）
  if (/^\d+(\s+\d+)*$/.test(trimmed)) {
    return "unicode";
  }

  // 否则当作普通文本
  return "text";
}

// 取字符的完整码点。
// 注意：[...text] 已按码点拆分，但 charCodeAt(0) 只取第一个 UTF-16 码元，
// 对 BMP 外字符（emoji 等代理对）会丢掉低位，必须用 codePointAt。
function codePointOf(char: string): number {
  return char.codePointAt(0) as number;
}

// 将文本转换为十六进制格式（空格分隔）
export function toHexFormat(text: string): string {
  return [...text]
    .map((char) =>
      codePointOf(char).toString(16).toUpperCase().padStart(4, "0"),
    )
    .join(" ");
}

// 将文本转换为 JavaScript 格式。
// BMP 内用 \uXXXX；BMP 外用 \u{XXXXX}（\uXXXX 表示不了超过 0xFFFF 的码点）。
export function toJSFormat(text: string): string {
  return [...text]
    .map((char) => {
      const cp = codePointOf(char);
      return cp > 0xffff
        ? `\\u{${cp.toString(16).toUpperCase()}}`
        : "\\u" + cp.toString(16).padStart(4, "0");
    })
    .join("");
}

// 将文本转换为 Unicode 标准 U+XXXX 格式（空格分隔）
export function toUnicodeStdFormat(text: string): string {
  return [...text]
    .map(
      (char) =>
        "U+" + codePointOf(char).toString(16).toUpperCase().padStart(4, "0"),
    )
    .join(" ");
}

// 将文本转换为十进制格式（空格分隔）
export function toDecimalFormat(text: string): string {
  return [...text].map((char) => codePointOf(char).toString()).join(" ");
}

// 从 \uXXXX 与 \u{XXXXX} 格式解码。
// 用 fromCodePoint 而非 fromCharCode，才能还原 BMP 外字符。
function decodeJSFormat(input: string): string {
  return input.replace(
    /\\u(?:\{([0-9a-fA-F]{1,6})\}|([0-9a-fA-F]{4}))/g,
    (_, braced, plain) => String.fromCodePoint(parseInt(braced ?? plain, 16)),
  );
}

// 从 U+XXXX 格式解码（码点可多于 4 位）。
// 按 token 提取而非 replace：toUnicodeStdFormat 是用空格连接的，
// 用 replace 会把分隔空格留在结果里（"U+4F60 U+597D" 会解成 "你 好"）。
function decodeUnicodeStdFormat(input: string): string {
  const matches = input.match(/[Uu]\+[0-9a-fA-F]{4,6}/g) ?? [];
  return matches
    .map((token) => String.fromCodePoint(parseInt(token.slice(2), 16)))
    .join("");
}

// 从十进制格式解码
function decodeDecimalFormat(input: string): string {
  const numbers = input
    .trim()
    .split(/\s+/)
    .filter((n) => n && /^\d+$/.test(n));
  return numbers.map((num) => String.fromCodePoint(parseInt(num, 10))).join("");
}

// 从十六进制格式解码。
// 带空格时按空格切分（这样才支持 emoji 的 5-6 位码点，如 "1F600"）；
// 不带空格时退回按 4 位一组切分，兼容 "4F60597D" 这种旧写法。
function decodeHexFormat(input: string): string {
  const trimmed = input.trim();

  if (/\s/.test(trimmed)) {
    return trimmed
      .split(/\s+/)
      .filter(Boolean)
      .map((hex) => String.fromCodePoint(parseInt(hex, 16)))
      .join("");
  }

  // 无空格时有歧义："1F600" 既可能是 4 位分组，也可能是单个 5 位码点。
  // 长度不能被 4 整除，说明它不是 4 位分组，整体当一个码点处理
  // （否则 "1F600" 会被切成 "1F60" + 残余 "0"，解出错字 ὠ）。
  if (trimmed.length % 4 !== 0) {
    return String.fromCodePoint(parseInt(trimmed, 16));
  }

  const result = [];
  for (let i = 0; i < trimmed.length; i += 4) {
    const hex = trimmed.slice(i, i + 4);
    if (hex.length === 4) {
      result.push(String.fromCodePoint(parseInt(hex, 16)));
    }
  }
  return result.join("");
}

// 解码 Unicode 序列
export function decodeUnicodeSequence(input: string): string {
  const trimmed = input.trim();

  // 尝试 \uXXXX 与 \u{XXXXX} 格式
  if (/\\u(\{[0-9a-fA-F]{1,6}\}|[0-9a-fA-F]{4})/.test(trimmed)) {
    return decodeJSFormat(trimmed);
  }

  // 尝试 U+XXXX 格式
  if (/[Uu]\+[0-9a-fA-F]{4,6}/.test(trimmed)) {
    return decodeUnicodeStdFormat(trimmed);
  }

  // 纯数字串存在歧义："0061" 既是合法十六进制也是合法十进制。
  // 判别信号是前导零：十进制不会写前导零，而 toHexFormat 固定补齐 4 位，
  // 所以 ASCII 字符的十六进制必然带前导零（"abc" → "0061 0062 0063"）。
  // 不这样区分，"abc" 的十六进制会被当成十进制 61/62/63 解出 "=>?"。
  const digitTokens = trimmed.split(/\s+/).filter(Boolean);
  const looksLikePaddedHex =
    digitTokens.length > 0 &&
    digitTokens.every((t) => /^\d{4,6}$/.test(t)) &&
    digitTokens.some((t) => t.startsWith("0"));

  // 尝试十进制格式（纯数字和空格）
  if (/^\d+(\s+\d+)*$/.test(trimmed) && !looksLikePaddedHex) {
    return decodeDecimalFormat(trimmed);
  }

  // 尝试十六进制格式。
  // 空格分隔时每组允许 4-6 位（emoji 码点如 1F600 有 5 位）；
  // 无空格时仍按 4 位一组，兼容 "4F60597D"。
  if (
    /^[0-9a-fA-F]{4,6}(\s+[0-9a-fA-F]{4,6})*$/.test(trimmed) ||
    /^([0-9a-fA-F]{4})+$/.test(trimmed)
  ) {
    return decodeHexFormat(trimmed);
  }

  throw new Error("无法识别的 Unicode 格式");
}

// 生成代码点信息
export function getCodePoints(text: string): CodePoint[] {
  return [...text].map((char) => {
    const cp = codePointOf(char);
    return {
      char,
      code: cp,
      hex: cp.toString(16).toUpperCase().padStart(4, "0"),
      decimal: cp.toString(),
    };
  });
}

// 主函数：分析 Unicode
export function analyzeUnicode(input: string): UnicodeAnalysis {
  const inputType = detectInputType(input);

  // 获取原始文本
  let originalText = "";
  if (inputType === "text") {
    originalText = input;
  } else {
    originalText = decodeUnicodeSequence(input);
  }

  return {
    originalText,
    hex: toHexFormat(originalText),
    javascript: toJSFormat(originalText),
    unicode: toUnicodeStdFormat(originalText),
    decimal: toDecimalFormat(originalText),
    codePoints: getCodePoints(originalText),
  };
}

// 生成 Markdown 展示结果
export function generateMarkdown(analysis: UnicodeAnalysis): string {
  const { originalText, hex, javascript, unicode, decimal, codePoints } =
    analysis;

  let markdown = `## Unicode 转换结果\n\n`;
  markdown += `**原始文本：** ${originalText}\n`;
  // 用码点数而非 .length：后者是 UTF-16 长度，emoji 会被算成 2
  markdown += `**字符数：** ${codePoints.length}\n\n`;

  markdown += `### 格式转换\n\n`;

  markdown += `#### 十六进制格式\n`;
  markdown += "```\n";
  markdown += hex + "\n";
  markdown += "```\n\n";

  markdown += `#### JavaScript 格式 (\\uXXXX)\n`;
  markdown += "```\n";
  markdown += javascript + "\n";
  markdown += "```\n\n";

  markdown += `#### Unicode 标准格式 (U+XXXX)\n`;
  markdown += "```\n";
  markdown += unicode + "\n";
  markdown += "```\n\n";

  markdown += `#### 十进制格式\n`;
  markdown += "```\n";
  markdown += decimal + "\n";
  markdown += "```\n\n";

  markdown += `### 字符详情\n\n`;
  markdown += `| 字符 | 十六进制 | 十进制 | JavaScript |\n`;
  markdown += `|------|--------|--------|------------|\n`;

  codePoints.forEach((cp) => {
    const jsFormat = `\\u${cp.hex}`;
    markdown += `| ${cp.char} | ${cp.hex} | ${cp.decimal} | ${jsFormat} |\n`;
  });

  return markdown;
}
