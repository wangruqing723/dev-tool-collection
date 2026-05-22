import { Form, ActionPanel, Action, Detail } from "@raycast/api";
import { useState } from "react";
import { success, failure } from "./utils/result";

type QRMode = "generate" | "parse";

export default function QRCodeCommand() {
  const [mode, setMode] = useState<QRMode>("generate");
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  async function handleSubmit(values: { text?: string }) {
    try {
      if (!values.text?.trim()) {
        throw new Error("请输入文本");
      }

      if (mode === "generate") {
        const text = encodeURIComponent(values.text.trim());
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${text}`;
        setQrUrl(url);
        await success(url, { title: "二维码已生成", copy: true });
      } else {
        throw new Error("二维码解析功能暂未实现");
      }
    } catch (err) {
      await failure(err, "操作失败");
    }
  }

  if (qrUrl && mode === "generate") {
    return (
      <Detail
        markdown={`# 二维码\n\n![QR Code](${qrUrl})`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={qrUrl} title="复制 URL" />
            <Action title="返回" onAction={() => setQrUrl(null)} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="生成" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="mode"
        title="操作"
        value={mode}
        onChange={(value) => setMode(value as QRMode)}
      >
        <Form.Dropdown.Item value="generate" title="生成二维码" />
        <Form.Dropdown.Item value="parse" title="解析二维码" />
      </Form.Dropdown>

      <Form.TextArea
        id="text"
        title="输入文本"
        placeholder="输入要转换为二维码的文本或 URL"
      />
    </Form>
  );
}
