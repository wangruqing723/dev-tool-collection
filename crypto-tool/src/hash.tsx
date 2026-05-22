import { Form, ActionPanel, Action, List } from "@raycast/api";
import { useState } from "react";
import crypto from "crypto";
import { SM3 } from "gm-crypto";

type HashAlgorithm = "md5" | "sha1" | "sha256" | "sha512" | "sm3";

interface HashResult {
  algorithm: HashAlgorithm;
  value: string;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [salt, setSalt] = useState("");
  const [results, setResults] = useState<HashResult[]>([]);
  const [showSaltForm, setShowSaltForm] = useState(false);

  function generateHashes(text: string, saltValue: string): HashResult[] {
    const algorithms: HashAlgorithm[] = [
      "md5",
      "sha1",
      "sha256",
      "sha512",
      "sm3",
    ];
    const hashes: HashResult[] = [];

    algorithms.forEach((alg) => {
      try {
        let hash: string;

        if (alg === "sm3") {
          const input = saltValue ? text + saltValue : text;
          const result = SM3.digest(input);
          hash =
            typeof result === "string"
              ? result
              : Buffer.from(result).toString("hex");
        } else {
          const input = saltValue ? text + saltValue : text;
          hash = crypto.createHash(alg).update(input).digest("hex");
        }

        hashes.push({
          algorithm: alg,
          value: hash,
        });
      } catch (err) {
        console.error(`Error generating ${alg}:`, err);
        hashes.push({
          algorithm: alg,
          value: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        });
      }
    });

    return hashes;
  }

  function handleSearchChange(text: string) {
    setSearchText(text);
    if (text.trim()) {
      const hashes = generateHashes(text, salt);
      setResults(hashes);
    } else {
      setResults([]);
    }
  }

  function handleSaltChange(newSalt: string) {
    setSalt(newSalt);
    if (searchText.trim()) {
      const hashes = generateHashes(searchText, newSalt);
      setResults(hashes);
    }
  }

  if (showSaltForm) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action
              title="保存"
              onAction={() => {
                setShowSaltForm(false);
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="salt"
          title="Salt 值"
          value={salt}
          onChange={handleSaltChange}
          placeholder="输入 salt 值（可选）"
        />
      </Form>
    );
  }

  return (
    <List
      searchBarPlaceholder="输入待 Hash 的文本..."
      onSearchTextChange={handleSearchChange}
      filtering={false}
    >
      {results.length > 0 && (
        <List.Section
          title={`Hash 结果 (${searchText.length} 字符${salt ? " + Salt" : ""})`}
        >
          {results.map((result) => (
            <List.Item
              key={result.algorithm}
              title={result.algorithm.toUpperCase()}
              subtitle={result.value}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard content={result.value} title="复制" />
                  <Action
                    title="编辑 Salt"
                    onAction={() => setShowSaltForm(true)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {results.length === 0 && searchText.trim() === "" && (
        <List.Section title="提示">
          <List.Item
            title="输入文本开始 Hash"
            subtitle="支持 MD5、SHA-1、SHA-256、SHA-512、SM3"
            actions={
              <ActionPanel>
                <Action
                  title="编辑 Salt"
                  onAction={() => setShowSaltForm(true)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
