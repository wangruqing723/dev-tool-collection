import { List, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import { useClipboardPrefill } from "./hooks/useClipboardPrefill";

interface NameConversion {
  style: string;
  value: string;
}

function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(/^(.)/, (c) => c.toLowerCase());
}

function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(/^(.)/, (c) => c.toUpperCase());
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .replace(/[-\s]+/g, "_")
    .toLowerCase()
    .replace(/^_/, "");
}

function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "-$1")
    .replace(/[_\s]+/g, "-")
    .toLowerCase()
    .replace(/^-/, "");
}

function toConstantCase(str: string): string {
  return toSnakeCase(str).toUpperCase();
}

function toDotCase(str: string): string {
  return str
    .replace(/([A-Z])/g, ".$1")
    .replace(/[-_\s]+/g, ".")
    .toLowerCase()
    .replace(/^\./, "");
}

export default function VariableNameCommand() {
  const [searchText, setSearchText] = useState("");
  const [conversions, setConversions] = useState<NameConversion[]>([]);

  useEffect(() => {
    if (!searchText.trim()) {
      setConversions([]);
      return;
    }

    const input = searchText.trim();
    const results: NameConversion[] = [
      { style: "camelCase", value: toCamelCase(input) },
      { style: "PascalCase", value: toPascalCase(input) },
      { style: "snake_case", value: toSnakeCase(input) },
      { style: "kebab-case", value: toKebabCase(input) },
      { style: "CONSTANT_CASE", value: toConstantCase(input) },
      { style: "dot.case", value: toDotCase(input) },
    ];

    setConversions(results);
  }, [searchText]);

  useClipboardPrefill(setSearchText);

  return (
    <List
      searchBarPlaceholder="输入变量名（已自动填入剪贴板内容）"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
    >
      {conversions.length > 0 && (
        <List.Section title={`变量名转换结果`}>
          {conversions.map((conversion) => (
            <List.Item
              key={conversion.style}
              title={conversion.style}
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
