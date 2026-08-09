import { Form, ActionPanel, Action, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import crypto from "crypto";
import { SM3 } from "gm-crypto";
import { useClipboardPrefill } from "./hooks/useClipboardPrefill";

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

// 提到模块作用域：不依赖任何组件状态，这样它是稳定引用，
// 可以直接进 effect 的依赖数组而不必用 eslint 抑制注释
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
      const input = saltValue ? text + saltValue : text;
      let hash: string;

      if (alg === "sm3") {
        const result = SM3.digest(input);
        hash =
          typeof result === "string"
            ? result
            : Buffer.from(result).toString("hex");
      } else {
        hash = crypto.createHash(alg).update(input).digest("hex");
      }

      hashes.push({ algorithm: alg, value: hash });
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

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [salt, setSalt] = useState("");
  const [results, setResults] = useState<HashResult[]>([]);
  const { push } = useNavigation();

  // 在 effect 里按 searchText/salt 重算，而不是只在 onChange 回调里算：
  // 剪贴板预填是直接 setSearchText 的，不走 onChange，
  // 若把计算留在回调里，预填后不会出结果。
  useEffect(() => {
    setResults(searchText.trim() ? generateHashes(searchText, salt) : []);
  }, [searchText, salt]);

  useClipboardPrefill(setSearchText);

  function openSaltForm() {
    // 只 setSalt，重算交给上面的 effect
    push(<SaltForm initialSalt={salt} onChange={setSalt} />);
  }

  return (
    <List
      searchBarPlaceholder="输入待 Hash 的文本（已自动填入剪贴板内容）"
      searchText={searchText}
      onSearchTextChange={setSearchText}
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
