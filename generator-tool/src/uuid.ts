import crypto from "crypto";
import { success, failure } from "./utils/result";

export default async function Command(props: {
  arguments: { type?: string; dash?: string; upper?: string };
}) {
  try {
    const { type, dash, upper } = props.arguments;

    // 将字符串参数转换为布尔值
    // 默认：dash 为 true （保留连接符）， upper 为 true （小写）
    const delDash = dash !== undefined && dash !== "" && dash !== "true";
    const toUpper = upper !== undefined && upper !== "" && upper !== "true";

    let uuid: string;

    // 如果指定为 GUID，则使用大括号格式
    if (type === "guid") {
      uuid = `{${crypto.randomUUID()}}`;
      if (delDash) {
        uuid = uuid.replace(/-/g, "");
      }
    } else {
      uuid = crypto.randomUUID();
      if (delDash) {
        uuid = uuid.replace(/-/g, "");
      }
    }

    if (toUpper) {
      uuid = uuid.toUpperCase();
    }

    await success(uuid, {
      title: `${type === "guid" ? "GUID" : "UUID"} 成功`,
      hud: true,
    });
  } catch (error) {
    await failure(
      error,
      `生成 ${props.arguments.type === "guid" ? "GUID" : "UUID"} 失败`,
    );
  }
}
