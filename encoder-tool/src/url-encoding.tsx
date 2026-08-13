import {
  Action,
  ActionPanel,
  Clipboard,
  List,
  getSelectedText,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { analyzeUrl } from "./utils/url";

export default function UrlEncodingCommand() {
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function prefill() {
      let text: string | undefined;

      // 先尝试当前前台应用的选中文本，适合从编辑器、浏览器直接转换。
      try {
        text = await getSelectedText();
      } catch {
        // 没有选中文本时回退到剪贴板。
      }

      if (!text?.trim()) {
        try {
          text = await Clipboard.readText();
        } catch {
          // 剪贴板不可读时保持空输入，用户仍可手动输入或粘贴。
        }
      }

      // 只用 trim 判断是否为空，不修改真正参与转换的内容。
      if (!cancelled && text?.trim()) {
        setSearchText(text);
      }
    }

    void prefill();
    return () => {
      cancelled = true;
    };
  }, []);

  const conversions = useMemo(
    () => (searchText.trim() ? analyzeUrl(searchText) : []),
    [searchText],
  );

  const operationTitle = conversions.some((item) => item.operation === "decode")
    ? conversions.some((item) => item.operation === "encode")
      ? "自动识别结果"
      : "自动解码结果"
    : "自动编码结果";

  return (
    <List
      searchBarPlaceholder="输入 URL 或文本（优先填入选中文本，其次读取剪贴板）"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
    >
      {conversions.length > 0 && (
        <List.Section title={operationTitle}>
          {conversions.map((conversion) => (
            <List.Item
              key={`${conversion.operation}-${conversion.format}`}
              title={conversion.label}
              subtitle={conversion.value}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content={conversion.value}
                    title="复制结果"
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
