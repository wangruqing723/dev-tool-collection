// 变量名风格转换：纯逻辑，不依赖 @raycast/api，便于单测
//
// 统一先分词、再按风格拼接，避免在原串上做增量 replace——
// 那种写法会在「分隔符 + 大写字母」相邻时产出重复分隔符（如 weekly__test）。

// 词边界规则（顺序固定，先切缩写再切普通驼峰）：
//   1. 连续大写后紧跟「大写+小写」→ 缩写与后续单词分开：XMLHttp → XML Http
//   2. 小写或数字后紧跟大写 → 普通驼峰边界：fooBar → foo Bar
const ACRONYM_BOUNDARY = /(\p{Lu}+)(\p{Lu}\p{Ll})/gu;
const CAMEL_BOUNDARY = /(\p{Ll}|\p{N})(\p{Lu})/gu;

// 分隔符：所有非字母、非数字的字符。
// 用 Unicode 属性而非 [^a-zA-Z0-9]，以保留中文等非 ASCII 词字符。
const SEPARATORS = /[^\p{L}\p{N}]+/u;

// 把输入切成词序列。词内部保留原始大小写，由各风格自行决定输出大小写。
export function splitWords(str: string): string[] {
  return str
    .replace(ACRONYM_BOUNDARY, "$1 $2")
    .replace(CAMEL_BOUNDARY, "$1 $2")
    .split(SEPARATORS)
    .filter((w) => w.length > 0);
}

// 首字母大写、其余小写
function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function toCamelCase(str: string): string {
  const words = splitWords(str);
  if (words.length === 0) return "";
  return words[0].toLowerCase() + words.slice(1).map(capitalize).join("");
}

export function toPascalCase(str: string): string {
  return splitWords(str).map(capitalize).join("");
}

export function toSnakeCase(str: string): string {
  return splitWords(str)
    .map((w) => w.toLowerCase())
    .join("_");
}

export function toKebabCase(str: string): string {
  return splitWords(str)
    .map((w) => w.toLowerCase())
    .join("-");
}

export function toDotCase(str: string): string {
  return splitWords(str)
    .map((w) => w.toLowerCase())
    .join(".");
}

export function toConstantCase(str: string): string {
  return splitWords(str)
    .map((w) => w.toUpperCase())
    .join("_");
}
