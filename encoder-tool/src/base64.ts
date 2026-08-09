import { success, failure } from "./utils/result";
import { getInputText } from "./utils/input";
import { isBase64Charset, looksLikeBase64 } from "./utils/base64-detect";

type Base64Op = "encode" | "decode";

export default async function Command(props: {
  arguments: { text?: string; operation?: string };
}) {
  try {
    const operation = props.arguments.operation || "auto";

    // 参数留空时自动取剪贴板内容。
    // no-view 命令的参数在命令启动前就已输入完毕，扩展代码那时还没执行，
    // 所以无法「预填」输入框，只能在这里兜底读取。
    const text = await getInputText(props.arguments.text);

    const trimmedText = text.trim();
    let op: Base64Op;

    if (operation === "auto") {
      op = looksLikeBase64(trimmedText) ? "decode" : "encode";
    } else if (operation === "encode" || operation === "decode") {
      op = operation;
    } else {
      throw new Error(`未知操作类型：${operation}`);
    }

    let result = "";
    if (op === "encode") {
      result = Buffer.from(trimmedText, "utf8").toString("base64");
    } else {
      // 显式选择解码时不做 looksLikeBase64 拦截（用户可能就是要解非文本数据），
      // 但字符集非法必须报错，否则会静默得到乱码
      if (!isBase64Charset(trimmedText)) {
        throw new Error("输入不是合法的 Base64（含非法字符）");
      }
      result = Buffer.from(trimmedText, "base64").toString("utf8");
    }

    // 复制 + 关窗 + HUD：showHUD 本身会关闭主窗口
    await success(result, {
      title: `Base64 ${op === "decode" ? "解码" : "编码"}成功`,
      hud: true,
    });
  } catch (err) {
    await failure(err, "Base64 操作失败");
  }
}
