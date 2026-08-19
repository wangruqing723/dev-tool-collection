import {
  Form,
  ActionPanel,
  Action,
  Icon,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { success, failure } from "./utils/result";
import { describeAesKey, maskKey } from "./utils/encoding";
import {
  aesEncrypt,
  aesDecrypt,
  ivLabelFor,
  defaultIvSource,
  type AesMode,
  type AesAction,
  type IvSource,
  type CipherEncoding,
} from "./utils/aes";
import {
  loadKeyHistory,
  addKeyToHistory,
  deleteKey,
  MANUAL_KEY,
} from "./utils/keyHistory";

const STORAGE_KEY = "aes-key-history";

type AesFormValues = {
  text?: string;
  keyInput?: string;
  ivInput?: string;
};

export default function Command() {
  const [action, setAction] = useState<AesAction>("encrypt");
  const [mode, setMode] = useState<AesMode>("cbc");
  const [ivSource, setIvSource] = useState<IvSource>(defaultIvSource("cbc"));
  const [format, setFormat] = useState<CipherEncoding>("hex");
  const [keyHistory, setKeyHistory] = useState<string[]>([]);
  const [keySelect, setKeySelect] = useState(MANUAL_KEY);
  // 受控：密钥描述要随输入实时更新，所以不能只靠提交时的 values
  const [keyInput, setKeyInput] = useState("");

  useEffect(() => {
    loadKeyHistory(STORAGE_KEY).then(setKeyHistory);
  }, []);

  // 当前生效的密钥：手动输入 或 历史选中项
  const activeKey = keySelect === MANUAL_KEY ? keyInput : keySelect;

  async function handleSubmit(values: AesFormValues) {
    const label = action === "encrypt" ? "加密" : "解密";
    try {
      const key =
        keySelect === MANUAL_KEY ? (values.keyInput ?? "") : keySelect;

      if (action === "encrypt") {
        const result = aesEncrypt({
          text: values.text ?? "",
          keyInput: key,
          mode,
          ivSource,
          ivInput: values.ivInput,
          outputEncoding: format,
        });

        // 密钥历史要在关窗前写完：showHUD 会关闭主窗口，之后的异步步骤可能来不及执行
        await addKeyToHistory(STORAGE_KEY, key);
        setKeyHistory(await loadKeyHistory(STORAGE_KEY));

        const packedNote = result.ivPacked
          ? `，已打包 ${mode === "gcm" ? "Nonce" : "IV"}`
          : "";
        await success(result.cipher, {
          title: `加密成功（AES-${result.bits}/${mode.toUpperCase()}${packedNote}）`,
          hud: true,
        });
        return;
      }

      const result = aesDecrypt({
        cipherText: values.text ?? "",
        keyInput: key,
        mode,
        ivSource,
        ivInput: values.ivInput,
      });

      await addKeyToHistory(STORAGE_KEY, key);
      setKeyHistory(await loadKeyHistory(STORAGE_KEY));

      await success(result.plain, {
        title: `解密成功（AES-${result.bits}/${mode.toUpperCase()}）`,
        hud: true,
      });
    } catch (err) {
      await failure(err, `${label}失败`);
    }
  }

  return (
    <Form
      navigationTitle="AES 加密/解密"
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
                if (!confirmed) return;

                await deleteKey(STORAGE_KEY, keySelect);
                setKeyHistory(await loadKeyHistory(STORAGE_KEY));
                setKeySelect(MANUAL_KEY);
              }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title={action === "encrypt" ? "明文" : "密文"}
        placeholder={
          action === "encrypt" ? "输入要加密的内容" : "输入 Hex 或 Base64 密文"
        }
      />

      <Form.Dropdown
        id="keySelect"
        title="AES 密钥历史"
        value={keySelect}
        onChange={setKeySelect}
      >
        <Form.Dropdown.Item value={MANUAL_KEY} title="手动输入" />
        {keyHistory.map((k) => (
          <Form.Dropdown.Item key={k} value={k} title={maskKey(k)} />
        ))}
      </Form.Dropdown>

      {keySelect === MANUAL_KEY && (
        <Form.TextField
          id="keyInput"
          title="AES 密钥（Hex 或 Base64）"
          placeholder="0123456789abcdeffedcba9876543210"
          value={keyInput}
          onChange={setKeyInput}
        />
      )}

      {/* 实时回显密钥推定结果。
          恰好 32 个 Hex 字符的输入是二义的（Hex→AES-128 / Base64→AES-192），
          歧义无法靠规则消除，只能让用户在提交前看见工具的理解。 */}
      <Form.Description title="密钥识别" text={describeAesKey(activeKey)} />

      <Form.Dropdown
        id="action"
        title="操作"
        value={action}
        onChange={(v) => {
          const next = v as AesAction;
          setAction(next);
          // 解密固定输出 UTF-8 文本，输出格式选择器只在加密时有意义
          if (next === "encrypt") setFormat("hex");
        }}
      >
        <Form.Dropdown.Item value="encrypt" title="加密" />
        <Form.Dropdown.Item value="decrypt" title="解密" />
      </Form.Dropdown>

      <Form.Dropdown
        id="mode"
        title="模式"
        value={mode}
        onChange={(v) => {
          const next = v as AesMode;
          setMode(next);
          // 切模式时重置 IV 来源，否则从 CBC 带过来的 "manual"
          // 会让 GCM 落到「用户手打 nonce」——正是要避免的情形
          setIvSource(defaultIvSource(next));
        }}
      >
        <Form.Dropdown.Item value="cbc" title="CBC（默认）" />
        <Form.Dropdown.Item value="gcm" title="GCM（带认证）" />
        <Form.Dropdown.Item
          value="ecb"
          title="ECB（不安全，仅用于对接老系统）"
        />
      </Form.Dropdown>

      {mode === "ecb" && (
        <Form.Description
          title="⚠️ ECB 风险"
          text="ECB 对每个明文块独立加密，相同明文块会产出相同密文块，从而泄露明文结构。仅在对接只支持 ECB 的老系统时使用。"
        />
      )}

      {mode !== "ecb" && (
        <Form.Dropdown
          id="ivSource"
          title={mode === "gcm" ? "Nonce 来源" : "IV 来源"}
          value={ivSource}
          onChange={(v) => setIvSource(v as IvSource)}
        >
          <Form.Dropdown.Item
            value="auto"
            title="自动生成并打包进密文（推荐）"
          />
          <Form.Dropdown.Item value="manual" title="手动指定（不打包）" />
        </Form.Dropdown>
      )}

      {mode !== "ecb" && ivSource === "manual" && (
        <Form.TextField
          id="ivInput"
          title={ivLabelFor(mode)}
          placeholder={mode === "gcm" ? "24 个 Hex 字符" : "32 个 Hex 字符"}
        />
      )}

      {mode === "gcm" && ivSource === "manual" && (
        <Form.Description
          title="⚠️ Nonce 重用"
          text="同一密钥下重复使用 Nonce 会泄露认证密钥并使密文可被伪造。除对接外部系统外，建议改用自动生成。"
        />
      )}

      {action === "encrypt" && (
        <Form.Dropdown
          id="format"
          title="密文输出格式"
          value={format}
          onChange={(v) => setFormat(v as CipherEncoding)}
        >
          <Form.Dropdown.Item value="hex" title="Hex" />
          <Form.Dropdown.Item value="base64" title="Base64" />
        </Form.Dropdown>
      )}
    </Form>
  );
}
