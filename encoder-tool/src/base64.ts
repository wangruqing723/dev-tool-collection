import { success, failure } from "./utils/result";

type Base64Op = "encode" | "decode";

export default async function Command(props: {
  arguments: { text?: string; operation?: string };
}) {
  try {
    const text = props.arguments.text;
    const operation = (props.arguments.operation || "auto") as string;

    if (!text?.trim()) {
      throw new Error("请输入文本");
    }

    const trimmedText = text.trim();
    let result = "";
    let op: Base64Op = "encode";

    if (operation === "auto") {
      // 自动检测：如果看起来像 Base64，则解码；否则编码
      if (
        /^[A-Za-z0-9+/]*={0,2}$/.test(trimmedText) &&
        trimmedText.length % 4 === 0
      ) {
        try {
          Buffer.from(trimmedText, "base64").toString("utf8");
          op = "decode";
        } catch {
          op = "encode";
        }
      } else {
        op = "encode";
      }
    } else {
      op = operation as Base64Op;
    }

    if (op === "encode") {
      result = Buffer.from(trimmedText, "utf8").toString("base64");
    } else {
      result = Buffer.from(trimmedText, "base64").toString("utf8");
    }

    await success(result, {
      title: `Base64 ${op === "decode" ? "解码" : "编码"}成功`,
    });
  } catch (err) {
    await failure(err, "Base64 操作失败");
  }
}
