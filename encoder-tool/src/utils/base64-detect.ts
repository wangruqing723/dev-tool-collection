// Base64 判别：纯逻辑，不依赖 @raycast/api，便于单测

const BASE64_CHARS = /^[A-Za-z0-9+/]+={0,2}$/;

// 字符集与填充是否合法。显式选择解码时用这个做拦截，
// 避免非法输入被 Node 宽容地跳过非法字符、静默解出乱码。
export function isBase64Charset(text: string): boolean {
  return BASE64_CHARS.test(text);
}

// 判断一段文本是否「确实是」Base64。
//
// 不能只靠字符集正则 + 长度是 4 倍数：Buffer.from(s, "base64") 对非法输入
// 不抛错（Node 会宽容地跳过非法字符），所以原来的 try/catch 形同虚设，
// 像 "abcd" 这种普通单词会被误判成 Base64 解成乱码。
//
// 这里改用往返校验：解码再编码，能还原回原串才认定是 Base64。
export function looksLikeBase64(text: string): boolean {
  if (text.length === 0 || text.length % 4 !== 0) return false;
  if (!isBase64Charset(text)) return false;

  const decoded = Buffer.from(text, "base64");
  if (decoded.length === 0) return false;

  // 往返不一致说明原串不是规范的 Base64
  if (decoded.toString("base64") !== text) return false;

  // 解码结果必须是有效 UTF-8 文本，否则解出来是乱码，
  // 用户大概率是想编码而不是解码
  if (decoded.toString("utf8").includes("�")) return false;

  return true;
}
