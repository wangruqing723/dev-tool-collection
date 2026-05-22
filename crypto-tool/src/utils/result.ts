// src/utils/result.ts
import {
  Clipboard,
  showToast,
  showHUD,
  Toast,
  environment,
} from "@raycast/api";

type SuccessOptions = {
  title?: string;
  message?: string;
  copy?: boolean; // 是否自动复制
  hud?: boolean; // 是否显示 HUD
};

export async function success(result: string, options: SuccessOptions = {}) {
  const { title = "成功", message = result, copy = true } = options;

  if (copy) {
    await Clipboard.copy(result);
  }

  if (options.hud && environment.isDevelopment === false) {
    try {
      await showHUD(`${options.title}  ${result}`);
    } catch {
      // showHUD is only available on macOS, fall back to showToast on Windows
      await showToast({
        title,
        message,
        style: Toast.Style.Success,
      });
    }
  } else {
    await showToast({
      title,
      message,
      style: Toast.Style.Success,
    });
  }
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
