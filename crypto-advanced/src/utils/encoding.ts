// src/utils/encoding.ts
//
// 编码识别与 AES 密钥解析。
// 纯逻辑、不依赖 @raycast/api，因此能被 jest 直接 require
//（jest.config.js 只收 src/**/*.test.ts，正是为了避开 @raycast/api）。

export type TextEncoding = "hex" | "base64" | "utf8";

export type AesBits = 128 | 192 | 256;

export type AesKeyInfo = {
  key: Buffer;
  encoding: "hex" | "base64";
  bits: AesBits;
};

// 从 sm4.tsx 原样移出，行为保持不变（SM4 命令现在也引用这里）。
export function detectEncoding(str: string): TextEncoding {
  const hexRegex = /^[0-9a-fA-F]+$/;
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;

  // 1) 先判断 hex
  if (hexRegex.test(str) && str.length % 2 === 0) {
    return "hex";
  }

  // 2) 再判断 base64
  if (
    base64Regex.test(str) &&
    str.length % 4 === 0 &&
    !/[^A-Za-z0-9+/=]/.test(str)
  ) {
    try {
      Buffer.from(str, "base64");
      return "base64";
    } catch {
      // 如果解码失败，就不是 base64
    }
  }

  // 3) 否则就是 utf8
  return "utf8";
}

const AES_BITS_BY_BYTES: Record<number, AesBits> = {
  16: 128,
  24: 192,
  32: 256,
};

function tryHex(s: string): Buffer | undefined {
  if (s.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(s)) return undefined;
  return Buffer.from(s, "hex");
}

function tryBase64(s: string): Buffer | undefined {
  if (s.length % 4 !== 0) return undefined;

  const strict =
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  if (!strict.test(s)) return undefined;

  const buf = Buffer.from(s, "base64");
  // Buffer 的 base64 解码很宽松：会跳过非法字符、容忍非规范的填充位。
  // 回环编码不一致说明输入不是规范 base64——宁可判为不匹配，
  // 也不要拿一个被悄悄改写过的密钥去加密。
  if (buf.toString("base64") !== s) return undefined;

  return buf;
}

// 解析 AES 密钥：Hex 或 Base64，解码后必须是 16 / 24 / 32 字节。
//
// Hex 优先。恰好 32 个字符且全为 [0-9a-fA-F] 的输入是二义的——
// 按 Hex 读是 16 字节（AES-128），按 Base64 读是 24 字节（AES-192），两者都是合法密钥长度。
// 选 Hex 是因为从 SM4（固定 32 位 Hex 密钥）过来的用户敲 32 个 Hex 字符时，
// 期望的就是 AES-128。其余长度不存在双解：48 / 64 字符按 Base64 解出 36 / 48 字节，
// 不是合法 AES 长度，会自然落到 Hex。
//
// 这处歧义无法靠规则消除，只能靠界面展示推定结果让用户核对，见 describeAesKey。
export function parseAesKey(input: string): AesKeyInfo {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("请输入 AES 密钥");
  }

  for (const encoding of ["hex", "base64"] as const) {
    const buf = encoding === "hex" ? tryHex(trimmed) : tryBase64(trimmed);
    const bits = buf && AES_BITS_BY_BYTES[buf.length];
    if (buf && bits) {
      return { key: buf, encoding, bits };
    }
  }

  throw new Error(
    "密钥必须是 Hex 或 Base64，且解码后为 16 / 24 / 32 字节（对应 AES-128 / 192 / 256）",
  );
}

// 给表单实时回显用：成功时说明推定结果，失败时直接给出错原因。
// 目的是让「工具的理解」在提交前就可见——加解密算错是静默的，
// 用户只会拿到一串看着挺像密文的垃圾。
export function describeAesKey(input: string): string {
  if (!input.trim()) {
    return "等待输入密钥（Hex 或 Base64）";
  }

  try {
    const { bits, encoding, key } = parseAesKey(input);
    const label = encoding === "hex" ? "Hex" : "Base64";
    return `已识别：AES-${bits}（${label}，${key.length} 字节）`;
  } catch (err) {
    return err instanceof Error ? err.message : "密钥无法识别";
  }
}

// 与长度无关的掩码。AES 密钥长度不固定（Hex 32/48/64、Base64 24/32/44 字符），
// 不能照搬 sm4.tsx 里硬编码 slice(28, 32) 的写法。
export function maskKey(key: string): string {
  if (key.length <= 12) {
    return "*".repeat(key.length);
  }
  return `${key.slice(0, 6)}******${key.slice(-4)}`;
}
