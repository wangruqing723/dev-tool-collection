import { Form, ActionPanel, Action, Detail, useNavigation } from "@raycast/api";
import { useState } from "react";
import { success, failure } from "./utils/result";

type QRMode = "generate" | "parse";

// 独立的结果视图，通过 push 进入。
//
// 原先的写法是在 QRCodeCommand 内部按 state 直接 return <Detail>，也就是在同一个
// 组件里把根视图从 Form 换成 Detail。这在 Windows 上会导致提交后窗口直接被关掉：
// 命令进程仍然存活（所以重新打开 Raycast 就能看到二维码），只是窗口没了。
// useNavigation().push 是 Raycast 推荐的做法，Esc 也能正常返回上一层。
function QRCodeDetail({ url }: { url: string }) {
  return (
    <Detail
      markdown={`# 二维码\n\n![QR Code](${url})`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={url} title="复制 URL" />
        </ActionPanel>
      }
    />
  );
}

export default function QRCodeCommand() {
  const [mode, setMode] = useState<QRMode>("generate");
  const { push } = useNavigation();

  async function handleSubmit(values: { text?: string }) {
    try {
      if (!values.text?.trim()) {
        throw new Error("请输入文本");
      }

      if (mode !== "generate") {
        throw new Error("二维码解析功能暂未实现");
      }

      const text = encodeURIComponent(values.text.trim());
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${text}`;

      push(<QRCodeDetail url={url} />);
      await success(url, { title: "二维码已生成", copy: true });
    } catch (err) {
      await failure(err, "操作失败");
    }
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
