import { Form, ActionPanel, Action, Detail, useNavigation } from "@raycast/api";
import { useState } from "react";
import { success, failure, normalizeNewlines } from "./utils/result";
import {
  rsaEncrypt,
  rsaDecrypt,
  rsaSign,
  rsaVerify,
  generateRsaKeyPair,
  resolveKeyMaterial,
  type RsaOperation,
  type CryptoPadding,
  type SignPadding,
  type Digest,
  type SigEncoding,
  type ModulusLength,
  type PrivateKeyFormat,
  type KeyPair,
} from "./utils/rsa";

type RsaFormValues = {
  text?: string;
  signature?: string;
  keyPaste?: string;
  keyFile?: string[];
};

// 密钥对结果用独立视图 push 进导航栈。
//
// 不自动写磁盘：把私钥落到用户没指定的路径属于越权且难撤销的副作用。
// 也不走 showHUD——两段 PEM 合计上千字符，HUD 装不下。
function KeyPairDetail({ pair }: { pair: KeyPair }) {
  const markdown = [
    "## 公钥（SPKI PEM）",
    "```",
    pair.publicKey.trim(),
    "```",
    "## 私钥",
    "```",
    pair.privateKey.trim(),
    "```",
    "> 私钥不会写入磁盘，也不会进入密钥历史。请自行妥善保存。",
  ].join("\n");

  return (
    <Detail
      navigationTitle="RSA 密钥对"
      markdown={markdown}
      actions={
        <ActionPanel>
          {/* 多行 PEM：Windows 上纯 LF 粘贴到部分程序会挤成一行 */}
          <Action.CopyToClipboard
            title="复制公钥"
            content={normalizeNewlines(pair.publicKey.trim())}
          />
          <Action.CopyToClipboard
            title="复制私钥"
            content={normalizeNewlines(pair.privateKey.trim())}
          />
        </ActionPanel>
      }
    />
  );
}

// 各操作需要哪种密钥：加密与验签用公钥，解密与签名用私钥
function keyRoleFor(op: RsaOperation): "public" | "private" | undefined {
  switch (op) {
    case "encrypt":
    case "verify":
      return "public";
    case "decrypt":
    case "sign":
      return "private";
    default:
      return undefined;
  }
}

export default function Command() {
  const [operation, setOperation] = useState<RsaOperation>("encrypt");
  const [cryptoPadding, setCryptoPadding] =
    useState<CryptoPadding>("oaep-sha256");
  const [signPadding, setSignPadding] = useState<SignPadding>("pkcs1");
  const [digest, setDigest] = useState<Digest>("sha256");
  const [encoding, setEncoding] = useState<SigEncoding>("base64");
  const [modulusLength, setModulusLength] = useState<ModulusLength>(2048);
  const [privateFormat, setPrivateFormat] = useState<PrivateKeyFormat>("pkcs8");
  const { push } = useNavigation();

  const role = keyRoleFor(operation);
  const isKeygen = operation === "keygen";
  const isSignOp = operation === "sign" || operation === "verify";

  async function handleSubmit(values: RsaFormValues) {
    try {
      if (isKeygen) {
        const pair = generateRsaKeyPair(modulusLength, privateFormat);
        push(<KeyPairDetail pair={pair} />);
        return;
      }

      const keyName = role === "public" ? "公钥" : "私钥";
      const pem = resolveKeyMaterial(values.keyPaste, values.keyFile, keyName);
      const text = values.text ?? "";

      switch (operation) {
        case "encrypt": {
          const cipher = rsaEncrypt({
            text,
            publicKeyPem: pem,
            padding: cryptoPadding,
            outputEncoding: encoding,
          });
          await success(cipher, { title: "加密成功", hud: true });
          return;
        }

        case "decrypt": {
          const plain = rsaDecrypt({
            cipherText: text,
            privateKeyPem: pem,
            padding: cryptoPadding,
            inputEncoding: encoding,
          });
          await success(plain, { title: "解密成功", hud: true });
          return;
        }

        case "sign": {
          const sig = rsaSign({
            text,
            privateKeyPem: pem,
            padding: signPadding,
            digest,
            outputEncoding: encoding,
          });
          await success(sig, { title: "签名成功", hud: true });
          return;
        }

        case "verify": {
          const ok = rsaVerify({
            text,
            signature: values.signature ?? "",
            publicKeyPem: pem,
            padding: signPadding,
            digest,
            signatureEncoding: encoding,
          });
          // 验签结果是布尔值，复制到剪贴板没有意义
          await success(ok ? "签名有效 ✅" : "签名无效 ❌", {
            title: "验签完成",
            copy: false,
            hud: true,
          });
          return;
        }
      }
    } catch (err) {
      await failure(err, "RSA 操作失败");
    }
  }

  return (
    <Form
      navigationTitle="RSA"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="运行" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="operation"
        title="操作"
        value={operation}
        onChange={(v) => {
          const next = v as RsaOperation;
          setOperation(next);
          // 切到解密时若当前选着 PKCS1，回落到默认 OAEP：
          // 该项在解密方向不可用，留着会让受控 Dropdown 显示一个已被移除的值
          if (next === "decrypt" && cryptoPadding === "pkcs1") {
            setCryptoPadding("oaep-sha256");
          }
        }}
      >
        <Form.Dropdown.Item value="encrypt" title="加密" />
        <Form.Dropdown.Item value="decrypt" title="解密" />
        <Form.Dropdown.Item value="sign" title="签名" />
        <Form.Dropdown.Item value="verify" title="验签" />
        <Form.Dropdown.Item value="keygen" title="生成密钥对" />
      </Form.Dropdown>

      {isKeygen && (
        <>
          <Form.Dropdown
            id="modulusLength"
            title="密钥长度"
            value={String(modulusLength)}
            onChange={(v) => setModulusLength(Number(v) as ModulusLength)}
          >
            <Form.Dropdown.Item value="2048" title="2048（默认）" />
            <Form.Dropdown.Item value="3072" title="3072" />
            <Form.Dropdown.Item value="4096" title="4096" />
          </Form.Dropdown>

          <Form.Dropdown
            id="privateFormat"
            title="私钥格式"
            value={privateFormat}
            onChange={(v) => setPrivateFormat(v as PrivateKeyFormat)}
          >
            <Form.Dropdown.Item value="pkcs8" title="PKCS#8（默认，通用）" />
            <Form.Dropdown.Item
              value="pkcs1"
              title="PKCS#1（老工具链 / 部分 Java 库）"
            />
          </Form.Dropdown>

          <Form.Description
            title="说明"
            text="公钥固定为 SPKI PEM。生成结果只展示在结果页供复制，不会写入磁盘。"
          />
        </>
      )}

      {!isKeygen && (
        <>
          <Form.TextArea
            id="text"
            title={
              operation === "encrypt"
                ? "明文"
                : operation === "decrypt"
                  ? "密文"
                  : "原文"
            }
            placeholder={
              operation === "decrypt" ? "输入 Base64 或 Hex 密文" : "输入内容"
            }
          />

          {operation === "verify" && (
            <Form.TextArea
              id="signature"
              title="签名值"
              placeholder="待验证的签名（Base64 或 Hex）"
            />
          )}

          <Form.TextArea
            id="keyPaste"
            title={`${role === "public" ? "公钥" : "私钥"} PEM`}
            placeholder={
              role === "public"
                ? "-----BEGIN PUBLIC KEY-----"
                : "-----BEGIN PRIVATE KEY-----"
            }
          />

          <Form.FilePicker
            id="keyFile"
            title="或选择密钥文件"
            allowMultipleSelection={false}
          />

          <Form.Description
            title="密钥来源"
            text="粘贴内容优先于文件。私钥不会被保存到密钥历史。"
          />

          {isSignOp ? (
            <>
              <Form.Dropdown
                id="signPadding"
                title="签名填充"
                value={signPadding}
                onChange={(v) => setSignPadding(v as SignPadding)}
              >
                <Form.Dropdown.Item
                  value="pkcs1"
                  title="PKCS#1 v1.5（默认，SHA256withRSA）"
                />
                <Form.Dropdown.Item value="pss" title="PSS" />
              </Form.Dropdown>

              <Form.Dropdown
                id="digest"
                title="摘要算法"
                value={digest}
                onChange={(v) => setDigest(v as Digest)}
              >
                <Form.Dropdown.Item value="sha256" title="SHA-256（默认）" />
                <Form.Dropdown.Item value="sha1" title="SHA-1" />
                <Form.Dropdown.Item value="sha384" title="SHA-384" />
                <Form.Dropdown.Item value="sha512" title="SHA-512" />
              </Form.Dropdown>
            </>
          ) : (
            <>
              <Form.Dropdown
                id="cryptoPadding"
                title="加密填充"
                value={cryptoPadding}
                onChange={(v) => setCryptoPadding(v as CryptoPadding)}
              >
                <Form.Dropdown.Item
                  value="oaep-sha256"
                  title="OAEP + SHA-256（默认）"
                />
                <Form.Dropdown.Item value="oaep-sha1" title="OAEP + SHA-1" />
                {/* PKCS#1 v1.5 只在加密方向可选：Node 禁用了它的私钥解密。
                    解密时不列出该项，避免用户选中一个必然失败的组合。 */}
                {operation === "encrypt" && (
                  <Form.Dropdown.Item
                    value="pkcs1"
                    title="PKCS#1 v1.5（老系统兼容，仅加密）"
                  />
                )}
              </Form.Dropdown>

              {operation === "decrypt" && (
                <Form.Description
                  title="ℹ️ 关于 PKCS#1 v1.5"
                  text="Node 已禁用 PKCS#1 v1.5 的私钥解密（CVE-2023-46809，Marvin 攻击），故解密只提供 OAEP。若必须解 PKCS#1 v1.5 密文，请改用 openssl 命令行。"
                />
              )}
            </>
          )}

          <Form.Dropdown
            id="encoding"
            title={
              operation === "sign" || operation === "verify"
                ? "签名值编码"
                : "密文编码"
            }
            value={encoding}
            onChange={(v) => setEncoding(v as SigEncoding)}
          >
            <Form.Dropdown.Item value="base64" title="Base64（默认）" />
            <Form.Dropdown.Item value="hex" title="Hex" />
          </Form.Dropdown>
        </>
      )}
    </Form>
  );
}
