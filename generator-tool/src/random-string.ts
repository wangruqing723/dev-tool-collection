import crypto from "crypto";
import { success, failure } from "./utils/result";
import { describeCharset, resolveCharset } from "./utils/charset";

export default async function Command(props: {
  arguments: { length?: string; charset?: string };
}) {
  try {
    const lengthStr = (props.arguments.length || "16").trim();

    // 先挡住非纯数字，否则 parseInt("12abc") 会静默得到 12
    if (!/^\d+$/.test(lengthStr)) {
      throw new Error("长度必须是正整数");
    }

    const len = parseInt(lengthStr, 10);
    if (len < 1 || len > 1000) {
      throw new Error("长度必须在 1-1000 之间");
    }

    // 字符集用简写组合：l=小写 u=大写 d=数字 s=符号，可任意组合
    const chars = resolveCharset(props.arguments.charset);

    // 用 crypto.randomInt 而非 Math.random：后者非加密安全，
    // 且 randomInt 本身是无模偏的均匀取值。
    let result = "";
    for (let i = 0; i < len; i++) {
      result += chars.charAt(crypto.randomInt(chars.length));
    }

    // 复制 + 关窗 + HUD：showHUD 本身会关闭主窗口
    await success(result, {
      title: `随机字符串（${describeCharset(props.arguments.charset)}）`,
      hud: true,
    });
  } catch (err) {
    await failure(err, "生成失败");
  }
}
