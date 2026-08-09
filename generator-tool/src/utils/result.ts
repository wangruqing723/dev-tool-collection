// src/utils/result.ts
import { Clipboard, showToast, showHUD, Toast } from "@raycast/api";

type SuccessOptions = {
  title?: string;
  message?: string;
  copy?: boolean; // 是否自动复制
  hud?: boolean; // true = 关闭主窗口并显示 HUD；不可用时降级为 Toast
};

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

  // showHUD 会自动关闭主窗口，所以「关窗 + HUD」一次调用即可。
  //
  // 这里不再按 process.platform 预先拦掉非 macOS：官方文档会显式标注
  // 平台限制的 API（例如 BrowserExtension.getTabs 明确标注不支持 Windows），
  // 而 showHUD 并未被这样标注，原代码注释里「仅 macOS」的说法缺乏依据。
  // 两个平台都尝试，真的不可用再降级。
  if (hud) {
    try {
      await showHUD(title === "成功" ? result : `${title}  ${result}`);
      return;
    } catch {
      // 降级为 Toast：此时窗口仍开着，但用户至少能看到反馈。
      // 反过来（先关窗再 Toast）会导致提示不可见，宁可不关窗。
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
