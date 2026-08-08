import {
  Form,
  ActionPanel,
  Action,
  Detail,
  environment,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import QRCode from "qrcode";
import { success, failure } from "./utils/result";

type QRMode = "generate" | "parse";

const QR_PREFIX = "qr-";
const KEEP_FILES = 20;

// 本地生成二维码并写入扩展的 support 目录。
//
// 原实现把用户输入拼进 https://api.qrserver.com/... 发给第三方服务：
// 离线不可用，企业网络的代理/防火墙下也可能失败，且输入内容会外发。
// 改为用 qrcode 包本地生成（纯 JS，无原生模块）。
//
// Detail 的 markdown 支持绝对本地路径引用图片，但没有文档说明支持
// data URI，所以这里落盘再引用。路径用 path.join 拼接以兼容 Windows。
async function renderToFile(text: string): Promise<string> {
  // 用内容 hash 做文件名：相同输入复用同一文件，不重复写；
  // 不同输入得到不同路径，避免 Raycast 的图片缓存返回上一张图。
  const hash = crypto
    .createHash("sha256")
    .update(text)
    .digest("hex")
    .slice(0, 16);
  const filePath = path.join(
    environment.supportPath,
    `${QR_PREFIX}${hash}.png`,
  );

  // supportPath 由 Raycast 创建，但首次运行时不保证已存在
  await fs.mkdir(environment.supportPath, { recursive: true });

  await QRCode.toFile(filePath, text, {
    width: 512,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  await pruneOldFiles();
  return filePath;
}

// 只保留最近的若干张，避免 support 目录随不同输入无限增长
async function pruneOldFiles() {
  try {
    const entries = await fs.readdir(environment.supportPath);
    const qrFiles = entries.filter(
      (name) => name.startsWith(QR_PREFIX) && name.endsWith(".png"),
    );
    if (qrFiles.length <= KEEP_FILES) return;

    const withTime = await Promise.all(
      qrFiles.map(async (name) => {
        const full = path.join(environment.supportPath, name);
        const stat = await fs.stat(full);
        return { full, mtime: stat.mtimeMs };
      }),
    );

    withTime.sort((a, b) => b.mtime - a.mtime);
    await Promise.all(
      withTime.slice(KEEP_FILES).map((f) => fs.rm(f.full, { force: true })),
    );
  } catch {
    // 清理失败不影响主流程
  }
}

function QRCodeDetail({ filePath, text }: { filePath: string; text: string }) {
  return (
    <Detail
      markdown={`# 二维码\n\n![QR Code](${filePath}?raycast-width=300&raycast-height=300)`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={text} title="复制原文" />
          <Action.ShowInFinder path={filePath} title="在文件管理器中显示" />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="内容长度"
            text={`${text.length} 字符`}
          />
          <Detail.Metadata.Label title="图片路径" text={filePath} />
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
      const filePath = await renderToFile(text);

      push(<QRCodeDetail filePath={filePath} text={text} />);
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
