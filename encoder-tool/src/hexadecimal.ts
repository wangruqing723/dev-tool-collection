import { success, failure } from "./utils/result";

export default async function Command(props: { arguments: { text?: string } }) {
  try {
    const text = props.arguments.text;

    if (!text?.trim()) {
      throw new Error("请输入文本");
    }

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

    await success(result, { title: "十六进制转换成功" });
  } catch (err) {
    await failure(err, "十六进制转换失败");
  }
}
