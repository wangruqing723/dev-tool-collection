import { Form, ActionPanel, Action, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { SM4 } from "gm-crypto";
import { success, failure } from "./utils/result";

type SM4Action = "encrypt" | "decrypt";
type Sm4KeyHistory = { value: string; lastUsedAt: number };

const KEY_HISTORY_STORAGE = "sm4-key-history";

async function loadKeyHistory(): Promise<Sm4KeyHistory[]> {
  const raw = await LocalStorage.getItem<string>(KEY_HISTORY_STORAGE);
  return raw ? JSON.parse(raw) : [];
}

async function saveKeyHistory(list: Sm4KeyHistory[]) {
  await LocalStorage.setItem(KEY_HISTORY_STORAGE, JSON.stringify(list));
}

async function addKeyToHistory(key: string) {
  const list = await loadKeyHistory();
  const filtered = list.filter((k) => k.value !== key);
  filtered.unshift({ value: key, lastUsedAt: Date.now() });
  await saveKeyHistory(filtered.slice(0, 10));
}

function detectEncoding(str: string): "hex" | "base64" | "utf8" {
  const hexRegex = /^[0-9a-fA-F]+$/;
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;

  if (hexRegex.test(str) && str.length % 2 === 0) {
    return "hex";
  }

  if (base64Regex.test(str) && str.length % 4 === 0) {
    try {
      Buffer.from(str, "base64");
      return "base64";
    } catch {
      return "utf8";
    }
  }

  return "utf8";
}

type FormValues = {
  text?: string;
  iv?: string;
  keySelect?: string;
  keyInput?: string;
};

export default function Command() {
  const [sm4Action, setSM4Action] = useState<SM4Action>("encrypt");
  const [sm4Mode, setSM4Mode] = useState<"ECB" | "CBC">("ECB");
  const [sm4Format, setSM4Format] = useState<"hex" | "base64" | "utf8">("hex");
  const [keyHistory, setKeyHistory] = useState<Sm4KeyHistory[]>([]);

  useEffect(() => {
    loadKeyHistory().then(setKeyHistory);
  }, []);

  async function handleSubmit(values: FormValues) {
    try {
      if (!values.text?.trim()) throw new Error("请输入待加密/解密文本");

      const key =
        values.keySelect && values.keySelect !== "__manual__"
          ? values.keySelect
          : values.keyInput;
      if (!key?.trim()) throw new Error("请输入或选择密钥");
      if (key.length !== 32) throw new Error("请输入有效的 32 字符 Hex 密钥");

      const inputEncoding = detectEncoding(values.text);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opts: any = {
        mode: sm4Mode,
        inputEncoding: sm4Action === "decrypt" ? inputEncoding : "utf8",
        outputEncoding: sm4Format,
      };

      if (sm4Mode === "CBC" && values.iv?.trim()) {
        opts.iv = values.iv;
      }

      let result = "";
      if (sm4Action === "encrypt") {
        if (sm4Format === "utf8") throw new Error("加密输出格式不能为 UTF-8");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result = SM4.encrypt(values.text, key, opts as any);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result = SM4.decrypt(values.text, key, opts as any);
      }

      await addKeyToHistory(key);
      await success(result, { title: "SM4 操作成功" });
    } catch (err) {
      await failure(err, "SM4 操作失败");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="运行" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="sm4Action"
        title="操作"
        value={sm4Action}
        onChange={(value) => setSM4Action(value as SM4Action)}
      >
        <Form.Dropdown.Item value="encrypt" title="加密" />
        <Form.Dropdown.Item value="decrypt" title="解密" />
      </Form.Dropdown>

      <Form.TextArea id="text" title="文本（明文/密文）" />

      <Form.Dropdown id="keySelect" title="SM4 密钥" defaultValue="__manual__">
        <Form.Dropdown.Item value="__manual__" title="手动输入" />
        {keyHistory.map((k) => (
          <Form.Dropdown.Item
            key={k.value}
            value={k.value}
            title={`${k.value.slice(0, 6)}...${k.value.slice(26)}`}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="keyInput"
        title="密钥（32 位 Hex）"
        placeholder="0123456789abcdeffedcba9876543210"
      />

      <Form.Dropdown
        id="sm4Mode"
        title="模式"
        value={sm4Mode}
        onChange={(value) => setSM4Mode(value as "ECB" | "CBC")}
      >
        <Form.Dropdown.Item value="ECB" title="ECB" />
        <Form.Dropdown.Item value="CBC" title="CBC" />
      </Form.Dropdown>

      {sm4Mode === "CBC" && (
        <Form.TextField id="iv" title="初始化向量（32 位 Hex）" />
      )}

      <Form.Dropdown
        id="sm4Format"
        title="输出格式"
        value={sm4Format}
        onChange={(value) => setSM4Format(value as "hex" | "base64" | "utf8")}
      >
        <Form.Dropdown.Item value="hex" title="十六进制" />
        <Form.Dropdown.Item value="base64" title="Base64" />
        {sm4Action === "decrypt" && (
          <Form.Dropdown.Item value="utf8" title="UTF-8" />
        )}
      </Form.Dropdown>
    </Form>
  );
}
