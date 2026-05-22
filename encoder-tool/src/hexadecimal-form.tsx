import { Form, ActionPanel, Action } from "@raycast/api";
import { success, failure } from "./utils/result";

export default function Command() {
  async function handleSubmit(values: { text?: string }) {
    try {
      if (!values.text?.trim()) throw new Error("请输入文本");

      const text = values.text.trim();
      let result = "";

      // 自动检测是否为hex格式
      if (/^[0-9a-fA-F]+$/.test(text) && text.length % 2 === 0) {
        // 如果是 hex 格式，则解码
        result = Buffer.from(text, "hex").toString("utf8");
      } else {
        // 否则编码
        result = Buffer.from(text, "utf8").toString("hex");
      }

      await success(result, { title: "十六进制转换成功" });
    } catch (err) {
      await failure(err, "十六进制转换失败");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="转换" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="输入文本或十六进制"
        placeholder="输入文本或十六进制字符串"
      />
    </Form>
  );
}
