// src/utils/result.ts
import { Clipboard, showToast, showHUD, Toast } from "@raycast/api";

type SuccessOptions = {
  title?: string;
  message?: string;
  copy?: boolean; // 是否自动复制
  hud?: boolean; // 是否显示 HUD（仅 macOS，其他平台自动降级为 Toast）
};

// showHUD 仅 macOS 可用。Windows 上它可能抛错，也可能静默无反应，
// 光靠 try/catch 兜不住「静默无反应」的情况（用户会完全收不到反馈），
// 所以先按平台判断，再用 try/catch 兜住抛错的情况。
const SUPPORTS_HUD = process.platform === "darwin";

// Windows 的部分程序不接受纯 LF，多行文本粘贴过去会挤成一行，
// 因此写入剪贴板前按平台转换行尾。
export function normalizeNewlines(text: string): string {
  if (process.platform !== "win32") {
    return text;
  }
  return text.replace(/\r?\n/g, "\r\n");
}

export async function success(result: string, options: SuccessOptions = {}) {
  const {
    title = "成功",
    message = result,
    copy = true,
    hud = false,
  } = options;

  if (copy) {
    await Clipboard.copy(normalizeNewlines(result));
  }

  if (hud && SUPPORTS_HUD) {
    try {
      // 原实现这里误用了 options.title（未取默认值），未传 title 时会显示 "undefined"
      await showHUD(`${title}  ${result}`);
      return;
    } catch {
      // 落到下面的 Toast
    }
  }

  await showToast({
    title,
    message,
    style: Toast.Style.Success,
  });
}

export async function failure(err: unknown, title = "失败") {
  const message =
    err instanceof Error ? err.message : String(err ?? "未知错误");
  await showToast({
    title,
    message,
    style: Toast.Style.Failure,
  });
}
