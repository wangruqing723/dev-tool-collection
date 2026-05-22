import { List, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";

interface TimeConversion {
  label: string;
  value: string;
}

export default function TimeConvertCommand() {
  const [searchText, setSearchText] = useState("");
  const [conversions, setConversions] = useState<TimeConversion[]>([]);
  const [currentTime, setCurrentTime] = useState<TimeConversion[]>([]);

  useEffect(() => {
    // 显示当前时间
    const updateCurrentTime = () => {
      const now = new Date();
      const unixSeconds = Math.floor(now.getTime() / 1000);
      const unixMillis = now.getTime();
      const isoString = now.toISOString();

      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const date = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const formattedTime = `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`;

      setCurrentTime([
        { label: "当前时间", value: formattedTime },
        { label: "ISO 8601", value: isoString },
        { label: "Unix 时间戳（秒）", value: unixSeconds.toString() },
        { label: "Unix 时间戳（毫秒）", value: unixMillis.toString() },
      ]);
    };

    updateCurrentTime();
    const interval = setInterval(updateCurrentTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!searchText.trim()) {
      setConversions([]);
      return;
    }

    const input = searchText.trim();
    const results: TimeConversion[] = [];

    try {
      const num = Number(input);

      if (!isNaN(num)) {
        let timestamp = num;

        if (num.toString().length <= 10) {
          timestamp = num * 1000;
        }

        const date = new Date(timestamp);

        if (!isNaN(date.getTime())) {
          const isoString = date.toISOString();
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const dateNum = String(date.getDate()).padStart(2, "0");
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");
          const seconds = String(date.getSeconds()).padStart(2, "0");
          const formattedTime = `${year}-${month}-${dateNum} ${hours}:${minutes}:${seconds}`;
          const unixSeconds = Math.floor(date.getTime() / 1000);
          const unixMillis = date.getTime();

          results.push(
            { label: "本地时间", value: formattedTime },
            { label: "ISO 8601", value: isoString },
            { label: "Unix 时间戳（秒）", value: unixSeconds.toString() },
            { label: "Unix 时间戳（毫秒）", value: unixMillis.toString() },
          );
        }
      } else {
        try {
          const date = new Date(input);
          if (!isNaN(date.getTime())) {
            const unixSeconds = Math.floor(date.getTime() / 1000);
            const unixMillis = date.getTime();
            const isoString = date.toISOString();

            results.push(
              { label: "Unix 时间戳（秒）", value: unixSeconds.toString() },
              { label: "Unix 时间戳（毫秒）", value: unixMillis.toString() },
              { label: "ISO 8601", value: isoString },
            );
          }
        } catch {
          // 无法解析
        }
      }
    } catch {
      // 错误处理
    }

    setConversions(results);
  }, [searchText]);

  return (
    <List
      searchBarPlaceholder="输入时间戳或日期时间..."
      onSearchTextChange={setSearchText}
      filtering={false}
    >
      {currentTime.length > 0 && (
        <List.Section title="当前时间">
          {currentTime.map((item, index) => (
            <List.Item
              key={`current-${index}`}
              title={item.label}
              subtitle={item.value}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard content={item.value} title="复制" />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {conversions.length > 0 && (
        <List.Section title="转换结果">
          {conversions.map((conversion, index) => (
            <List.Item
              key={`convert-${index}`}
              title={conversion.label}
              subtitle={conversion.value}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content={conversion.value}
                    title="复制"
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
