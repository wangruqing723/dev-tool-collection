import { Form, ActionPanel, Action, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import crypto from "crypto";
import { SM3 } from "gm-crypto";

type HashAlgorithm = "md5" | "sha1" | "sha256" | "sha512" | "sm3";

interface HashResult {
  algorithm: HashAlgorithm;
  value: string;
}

// 独立的 Salt 编辑视图，通过 push 进入。
//
// 原先是在 Command 内部按 showSaltForm state 直接 return <Form>，即在同一个组件里
// 把根视图从 List 换成 Form。这在 Windows 上会导致窗口被关掉（命令进程仍存活）。
// useNavigation().push 是 Raycast 推荐做法，Esc 可返回列表。
function SaltForm({
  initialSalt,
  onChange,
}: {
  initialSalt: string;
  onChange: (value: string) => void;
}) {
  const { pop } = useNavigation();
  // 必须持有自己的 state：push 进导航栈的元素是推入那一刻的快照，
  // 父组件 setSalt 不会让它重新渲染。若直接用父组件传入的值做 value，
  // 受控输入框会冻结在推入时的值，打字看不到反馈。
  const [value, setValue] = useState(initialSalt);

  function handleChange(next: string) {
    setValue(next);
    onChange(next); // 同步给父组件，实时重算 hash
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="保存" onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="salt"
        title="Salt 值"
        value={value}
        onChange={handleChange}
        placeholder="输入 salt 值（可选）"
      />
    </Form>
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [salt, setSalt] = useState("");
  const [results, setResults] = useState<HashResult[]>([]);
  const { push } = useNavigation();

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

  function openSaltForm() {
    push(<SaltForm initialSalt={salt} onChange={handleSaltChange} />);
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
                  <Action title="编辑 Salt" onAction={openSaltForm} />
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
                <Action title="编辑 Salt" onAction={openSaltForm} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
