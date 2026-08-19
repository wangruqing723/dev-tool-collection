// src/utils/keyHistory.ts
//
// 对称密钥历史。由 sm4.tsx 内联逻辑抽出，现由 SM4 与 AES 共用。
//
// 每个算法用独立的 storage key（sm4-key-history / aes-key-history）：
// 两者的密钥长度规则不同，混在一起会互相污染下拉列表。
//
// RSA 私钥永不进入这里，见 docs/adr/0002。IV/Nonce 也不进——
// 它本就该每次不同，做成历史等于给重用递刀子。

import { LocalStorage } from "@raycast/api";

export const MANUAL_KEY = "__manual__";

const MAX_ENTRIES = 10;

type KeyEntry = { value: string; lastUsedAt: number };

// 保留 {value, lastUsedAt} 的存储结构：用户 LocalStorage 里已有的
// SM4 历史就是这个形状，换结构会让老数据读不出来。
async function readEntries(storageKey: string): Promise<KeyEntry[]> {
  const raw = await LocalStorage.getItem<string>(storageKey);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // 存储内容损坏时当作空历史，不要让一条坏记录卡死整个命令
    return [];
  }
}

async function writeEntries(storageKey: string, list: KeyEntry[]) {
  await LocalStorage.setItem(storageKey, JSON.stringify(list));
}

export async function loadKeyHistory(storageKey: string): Promise<string[]> {
  const entries = await readEntries(storageKey);
  return entries.map((e) => e.value).filter(Boolean);
}

export async function addKeyToHistory(storageKey: string, key: string) {
  if (!key) return;

  const list = await readEntries(storageKey);
  const filtered = list.filter((k) => k.value !== key);
  filtered.unshift({ value: key, lastUsedAt: Date.now() });

  await writeEntries(storageKey, filtered.slice(0, MAX_ENTRIES));
}

export async function deleteKey(storageKey: string, key: string) {
  const list = await readEntries(storageKey);
  await writeEntries(
    storageKey,
    list.filter((k) => k.value !== key),
  );
}
