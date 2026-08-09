import { Clipboard } from "@raycast/api";
import { useEffect, useRef } from "react";

// 挂载时读剪贴板文本并回填输入框。
//
// Clipboard.readText 是跨平台核心 API，macOS / Windows 行为一致。
// 剪贴板为空、内容非文本、或读取被拒时静默跳过——预填只是便利功能，
// 失败不该打断命令本身。
export function useClipboardPrefill(onText: (text: string) => void) {
  // 用 ref 持有回调，这样依赖数组可以保持为空（只在挂载时跑一次），
  // 又不会闭包捕获到过期的 setter
  const callbackRef = useRef(onText);
  callbackRef.current = onText;

  useEffect(() => {
    let cancelled = false;

    Clipboard.readText()
      .then((text) => {
        if (cancelled) return;
        const trimmed = text?.trim();
        if (!trimmed) return;

        // 只预填单行内容。搜索栏是单行控件，多行文本填进去显示会被规范化，
        // 导致「看到的输入」和「实际参与计算的内容」不一致。
        // 而且 Windows 多行剪贴板是 \r\n、macOS 是 \n，同样的内容会得出
        // 不同结果，跨平台不一致。
        // 多行时跳过预填，用户仍可自己按 Cmd/Ctrl+V 粘贴（Raycast 原生处理）。
        if (/[\r\n]/.test(trimmed)) return;

        callbackRef.current(trimmed);
      })
      .catch(() => {
        // 剪贴板不可读或不是文本类型，忽略
      });

    return () => {
      cancelled = true;
    };
  }, []);
}
