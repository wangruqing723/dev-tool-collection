import { success, failure } from "./utils/result";
import { getInputText } from "./utils/input";

export default async function Command(props: { arguments: { text?: string } }) {
  try {
    // 参数留空时自动取剪贴板内容。
    // no-view 命令的参数在命令启动前就已输入完毕，扩展代码那时还没执行，
    // 所以无法「预填」输入框，只能在这里兜底读取。
    const text = await getInputText(props.arguments.text);

    const trimmedText = text.trim();
    let result = "";

    // 自动检测是否为hex格式
    if (/^[0-9a-fA-F]+$/.test(trimmedText) && trimmedText.length % 2 === 0) {
      // 如果是 hex 格式，则解码
      result = Buffer.from(trimmedText, "hex").toString("utf8");
    } else {
      // 否则编码
      result = Buffer.from(trimmedText, "utf8").toString("hex");
    }

    // 复制 + 关窗 + HUD：showHUD 本身会关闭主窗口
    await success(result, { title: "十六进制转换成功", hud: true });
  } catch (err) {
    await failure(err, "十六进制转换失败");
  }
}
