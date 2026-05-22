import { Form, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";
import { ensureBase64 } from "./utils/guard";
import { success, failure } from "./utils/result";

type Base64Op = "encode" | "decode";

export default function Command() {
  const [base64Op, setBase64Op] = useState<Base64Op>("decode");

  async function handleSubmit(values: { text?: string }) {
    try {
      if (!values.text?.trim()) throw new Error("请输入文本");

      const text = values.text.trim();
      let result = "";

      if (base64Op === "encode") {
        result = Buffer.from(text, "utf8").toString("base64");
      } else {
        result = Buffer.from(ensureBase64(text), "base64").toString("utf8");
      }

      await success(result, {
        title: `Base64 ${base64Op === "decode" ? "Decode" : "Encode"} 成功`,
      });
    } catch (err) {
      await failure(err, "Base64 操作失败");
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
      <Form.Dropdown
        id="base64Op"
        title="操作"
        value={base64Op}
        onChange={(value) => setBase64Op(value as Base64Op)}
      >
        <Form.Dropdown.Item value="encode" title="编码（文本 → Base64）" />
        <Form.Dropdown.Item value="decode" title="解码（Base64 → 文本）" />
      </Form.Dropdown>

      <Form.TextArea
        id="text"
        title={`输入${base64Op === "encode" ? "文本" : "Base64"}`}
      />
    </Form>
  );
}
