import {
  Form,
  ActionPanel,
  Action,
  Icon,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { SM4 } from "gm-crypto";
import { success, failure } from "./utils/result";
import { detectEncoding, maskKey } from "./utils/encoding";
import {
  loadKeyHistory,
  addKeyToHistory,
  deleteKey,
  MANUAL_KEY,
} from "./utils/keyHistory";
import type { SM4EncryptOptions } from "./types/sm4";

type SM4FormValues = {
  text?: string;
  iv?: string;
  keyInput?: string;
};

const KEY_HISTORY_STORAGE = "sm4-key-history";

export default function Command() {
  const [mode, setMode] = useState<"ECB" | "CBC">("ECB");
  const [action, setAction] = useState<"encrypt" | "decrypt">("encrypt");
  const [keyHistory, setKeyHistory] = useState<string[]>([]);
  const [keySelect, setKeySelect] = useState(MANUAL_KEY);
  const [format, setFormat] = useState<"hex" | "base64" | "utf8">("hex");

  useEffect(() => {
    loadKeyHistory(KEY_HISTORY_STORAGE).then(setKeyHistory);
  }, []);

  useEffect(() => {
    setFormat(action === "encrypt" ? "hex" : "utf8");
  }, [action]);

  async function handleSubmit(values: SM4FormValues) {
    try {
      const { text, iv } = values;

      // 读 state 而非 values.keySelect：keySelect 是受控 Dropdown，
      // 受控场景下 values 里的值不一定是当前选中项。
      const key = keySelect === MANUAL_KEY ? values.keyInput : keySelect;

      if (!text) throw new Error("请输入要加/解密的文本");
      if (!key || key.length !== 32)
        throw new Error("请输入有效的 32 字符 Hex 密钥");

      // CBC 必须有 IV，否则 gm-crypto 行为不确定
      if (mode === "CBC" && !iv?.trim()) {
        throw new Error("CBC 模式必须提供 IV（32 个 Hex 字符）");
      }

      const opts: SM4EncryptOptions = {
        mode,
        iv: iv?.trim() || undefined,
        inputEncoding: "utf8",
        outputEncoding: format,
      };

      let result = "";
      if (action === "encrypt") {
        if (opts.outputEncoding === "utf8") {
          throw new Error("加密操作时输出格式不能为 UTF-8");
        }
        // gm-crypto 的 SM4 类型定义不完全，这里使用 any 来适配
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result = SM4.encrypt(text, key, opts as any);
      } else {
        const cipherIs = detectEncoding(text);
        if (cipherIs !== "hex" && cipherIs !== "base64") {
          throw new Error("输入看起来不像合法密文（hex 或 base64）");
        }
        opts.inputEncoding = cipherIs;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result = SM4.decrypt(text, key, opts as any);
      }

      // 密钥历史要在关窗前写完，否则 showHUD 关窗后这两步可能来不及执行
      await addKeyToHistory(KEY_HISTORY_STORAGE, key);
      setKeyHistory(await loadKeyHistory(KEY_HISTORY_STORAGE));

      // 复制 + 关窗 + HUD：showHUD 本身会关闭主窗口
      await success(result, {
        title: `${action === "encrypt" ? "加密" : "解密"}成功`,
        hud: true,
      });
    } catch (err) {
      await failure(err, `${action === "encrypt" ? "加密" : "解密"}失败`);
    }
  }

  return (
    <Form
      navigationTitle="SM4 加密/解密"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="运行" onSubmit={handleSubmit} />

          {keySelect !== MANUAL_KEY && (
            <Action
              title="删除当前密钥"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={async () => {
                const confirmed = await confirmAlert({
                  title: "确认删除密钥？",
                  message: "此操作无法撤销，将从历史记录中永久删除该密钥。",
                  primaryAction: {
                    title: "删除",
                    style: Alert.ActionStyle.Destructive,
                  },
                });

                if (!confirmed) {
                  return; // 用户取消
                }

                await deleteKey(KEY_HISTORY_STORAGE, keySelect);
                setKeyHistory(await loadKeyHistory(KEY_HISTORY_STORAGE));
                setKeySelect(MANUAL_KEY);
              }}
            />
          )}
        </ActionPanel>
      }
    >
      {/* 输入文本 */}
      <Form.TextArea
        id="text"
        title="文本（明文/密文）"
        placeholder="输入需要处理的内容"
      />

      {/* SM4 密钥历史 */}
      <Form.Dropdown
        id="keySelect"
        title="SM4 密钥历史"
        value={keySelect}
        onChange={setKeySelect}
      >
        <Form.Dropdown.Item value={MANUAL_KEY} title="手动输入" />
        {keyHistory.map((k) => (
          <Form.Dropdown.Item key={k} value={k} title={maskKey(k)} />
        ))}
      </Form.Dropdown>

      {/* 手动输入密钥 */}
      {keySelect === MANUAL_KEY && (
        <Form.TextField
          id="keyInput"
          title="SM4 密钥（32 位 Hex）"
          placeholder="0123456789abcdeffedcba9876543210"
        />
      )}

      {/* 操作 */}
      <Form.Dropdown
        id="action"
        title="操作"
        value={action}
        onChange={(v) => setAction(v as "encrypt" | "decrypt")}
      >
        <Form.Dropdown.Item value="encrypt" title="加密" />
        <Form.Dropdown.Item value="decrypt" title="解密" />
      </Form.Dropdown>

      {/* 模式 */}
      <Form.Dropdown
        id="mode"
        title="模式"
        value={mode}
        onChange={(v) => setMode(v as "ECB" | "CBC")}
      >
        <Form.Dropdown.Item value="ECB" title="ECB（默认）" />
        <Form.Dropdown.Item value="CBC" title="CBC（需 IV）" />
      </Form.Dropdown>

      {/* IV 仅在 CBC 时展示 */}
      {mode === "CBC" && (
        <Form.TextField
          id="iv"
          title="IV（32 个 Hex）"
          placeholder="CBC 模式下必填"
        />
      )}

      {/* 输出格式（受控） */}
      <Form.Dropdown
        id="format"
        title="输出格式"
        value={format}
        onChange={(v) => setFormat(v as "hex" | "base64" | "utf8")}
      >
        <Form.Dropdown.Item value="hex" title="Hex" />
        <Form.Dropdown.Item value="base64" title="Base64" />
        {action === "decrypt" && (
          <Form.Dropdown.Item value="utf8" title="UTF-8（文本）" />
        )}
      </Form.Dropdown>
    </Form>
  );
}
