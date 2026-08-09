// 字符集简写解析：纯逻辑，不依赖 @raycast/api，便于单测

export const CHARSET_PARTS = {
  l: "abcdefghijklmnopqrstuvwxyz",
  u: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  d: "0123456789",
  s: "!@#$%^&*()_+-=[]{}|;:,.<>?",
} as const;

export type CharsetKey = keyof typeof CHARSET_PARTS;

export const DEFAULT_CHARSET = "lud"; // 小写 + 大写 + 数字

const KEY_LABELS: Record<CharsetKey, string> = {
  l: "l=小写",
  u: "u=大写",
  d: "d=数字",
  s: "s=符号",
};

// 把 "lud" 这样的简写展开成实际字符集。
// 允许任意顺序、重复（去重）、大小写不敏感。
export function resolveCharset(spec?: string): string {
  const raw = (spec ?? "").trim().toLowerCase();
  const source = raw.length === 0 ? DEFAULT_CHARSET : raw;

  const seen = new Set<CharsetKey>();
  for (const ch of source) {
    if (!(ch in CHARSET_PARTS)) {
      const allowed = Object.values(KEY_LABELS).join("  ");
      throw new Error(
        `未知的字符集标识「${ch}」。可用：${allowed}，例如 lud 表示小写+大写+数字`,
      );
    }
    seen.add(ch as CharsetKey);
  }

  if (seen.size === 0) {
    throw new Error("字符集不能为空");
  }

  // 按 l/u/d/s 的固定顺序拼接，保证同一 spec 得到确定的字符集
  const order: CharsetKey[] = ["l", "u", "d", "s"];
  return order
    .filter((k) => seen.has(k))
    .map((k) => CHARSET_PARTS[k])
    .join("");
}

// 用于提示文案：把 spec 转成人类可读的描述
export function describeCharset(spec?: string): string {
  const raw = (spec ?? "").trim().toLowerCase();
  const source = raw.length === 0 ? DEFAULT_CHARSET : raw;
  const order: CharsetKey[] = ["l", "u", "d", "s"];
  const names: Record<CharsetKey, string> = {
    l: "小写",
    u: "大写",
    d: "数字",
    s: "符号",
  };
  return order
    .filter((k) => source.includes(k))
    .map((k) => names[k])
    .join("+");
}
