import { Form, ActionPanel, Action, Detail, useNavigation } from "@raycast/api";
import { useState } from "react";
import QRCode from "qrcode";
import { success, failure } from "./utils/result";

type QRMode = "generate" | "parse";

function QRCodeDetail({ dataUri, text }: { dataUri: string; text: string }) {
  // 用引用式 markdown 语法内嵌 base64 data URI：
  //
  //   ![alt][ref]
  //   [ref]: <data:image/png;base64,...>
  //
  // 之前是把 PNG 落盘再用绝对路径引用，但 macOS 的 supportPath 含空格
  // （~/Library/Application Support/...），markdown 图片 URL 里的未转义空格
  // 会让语法解析失败，整行退化成字面文本（就是之前看到的现象）。
  // data URI 同时免掉了落盘、目录清理和 Windows 路径渲染这三处麻烦。
  // 尖括号包裹是必要的，否则 data URI 里的特殊字符同样会破坏解析。
  const markdown = `![QR Code][qr]\n\n[qr]: <${dataUri}>`;

  return (
    <Detail
      navigationTitle="二维码"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={text} title="复制原文" />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="内容长度"
            text={`${[...text].length} 字符`}
          />
          <Detail.Metadata.Label
            title="内容"
            text={text.length > 60 ? text.slice(0, 60) + "…" : text}
          />
        </Detail.Metadata>
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

      const text = values.text.trim();

      // 本地生成，不经第三方服务
      // Detail 的 markdown 按图片原始尺寸渲染，不会自动缩放到面板宽度，
      // 所以尺寸由这里的 width 决定。400 会溢出到需要滚动，250 偏小。
      const dataUri = await QRCode.toDataURL(text, {
        width: 350,
        margin: 2,
        errorCorrectionLevel: "M",
      });

      push(<QRCodeDetail dataUri={dataUri} text={text} />);
      await success(text, { title: "二维码已生成", copy: false });
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
