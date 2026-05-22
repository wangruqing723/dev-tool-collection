import { success, failure } from "./utils/result";

type CharacterSet =
  | "alphanumeric"
  | "lowercase"
  | "uppercase"
  | "numbers"
  | "symbols";

export default async function Command(props: {
  arguments: { length?: string; charset?: string };
}) {
  try {
    const lengthStr = props.arguments.length || "16";
    const len = parseInt(lengthStr, 10);

    if (isNaN(len) || len < 1 || len > 1000) {
      throw new Error("长度必须在 1-1000 之间");
    }

    const charset = (props.arguments.charset || "alphanumeric") as CharacterSet;

    let chars = "";
    switch (charset) {
      case "alphanumeric":
        chars =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        break;
      case "lowercase":
        chars = "abcdefghijklmnopqrstuvwxyz";
        break;
      case "uppercase":
        chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        break;
      case "numbers":
        chars = "0123456789";
        break;
      case "symbols":
        chars = "!@#$%^&*()_+-=[]{}|;:,.<>?";
        break;
    }

    let result = "";
    for (let i = 0; i < len; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    await success(result, { title: "随机字符串已生成", hud: true });
  } catch (err) {
    await failure(err, "生成失败");
  }
}
