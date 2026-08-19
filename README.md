# Raycast 开发者工具扩展 - 项目拆分

## 📦 项目概述

原 `dev-tool` 项目已拆分为多个独立的 Raycast 扩展项目，每个项目专注于特定的功能领域。

加密类命令按**算法是否可逆**划分归属：可逆加解密归 `crypto-advanced`，单向摘要与令牌归 `crypto-tool`。判据详见 [ADR-0001](./docs/adr/0001-crypto-extension-boundary.md)，术语见 [CONTEXT.md](./CONTEXT.md)。

## 🎯 项目清单

### 1️⃣ **Crypto-Tool** (单向摘要与令牌)
位置: `./crypto-tool`

**功能**:
- **Hash 生成**: MD5、SHA-1、SHA-256、SHA-512、SM3 (支持加盐)
- **Bcrypt**: 密码哈希和验证
- **JWT**: 解析和生成

**特色**:
- Hash 命令以列表形式显示所有算法的结果
- 支持加盐值

---

### 2️⃣ **Crypto-Advanced** (加解密工具)
位置: `./crypto-advanced`

**功能**:
- **SM4 加密**: ECB/CBC 模式，支持 Hex/Base64/UTF-8 格式
- **AES 加密**: CBC/GCM/ECB 模式，密钥长度自动推定 (AES-128/192/256)
- **RSA**: 加解密、签名验签、生成密钥对

**特色**:
- SM4 / AES 密钥历史记录（各自独立，RSA 私钥永不记录）
- AES 自动生成 IV/Nonce 并打包进密文，实时回显密钥推定结果
- RSA 支持粘贴 PEM 或选择密钥文件

**已知约束**: RSA 的 PKCS#1 v1.5 填充只在加密方向可用——Node 已禁用其私钥解密 (CVE-2023-46809)，详见 [ADR-0004](./docs/adr/0004-rsa-defaults-and-scope.md)。

---

### 3️⃣ **Encoder-Tool** (编解码工具)
位置: `./encoder-tool`

**功能**:
- **Base64**: 编码/解码
- **Hexadecimal**: 编码/解码
- **Unicode**: 多格式转换 (JavaScript、Unicode 标准、十进制、十六进制)
- **时间转换**: Unix 时间戳 ↔ 日期时间

**特色**:
- Unicode 和时间转换以列表形式显示所有转换结果
- 支持多种时间格式 (ISO 8601、本地时间、中文本地时间)

---

### 4️⃣ **Generator-Tool** (字符生成工具)
位置: `./generator-tool`

**功能**:
- **UUID/GUID**: 随机生成，支持格式自定义
- **二维码**: 生成二维码 (基于 QR Server API)
- **变量名转换**: camelCase、PascalCase、snake_case、kebab-case、CONSTANT_CASE、dot.case
- **随机字符串**: 支持多种字符集和自定义长度

**特色**:
- 变量名转换以列表形式显示所有格式的结果
- 随机字符串支持自定义字符集

---

## 🚀 快速开始

### 开发

```bash
# Crypto-Tool
cd crypto-tool
npm run dev

# Encoder-Tool
cd encoder-tool
npm run dev

# Generator-Tool
cd generator-tool
npm run dev
```

### 构建

```bash
# 在各项目目录运行
npm run build
```

### 类型检查

```bash
# 在各项目目录运行
npm run type-check
```

### 发布

```bash
# 在各项目目录运行
npm run publish
```

---

## 📋 命令清单

### Crypto-Tool
| 命令 | 功能 | 模式 |
|------|------|------|
| `hash` | Hash 生成 (MD5/SHA-1/SHA-256/SHA-512/SM3) | view |
| `bcrypt` | 密码哈希和验证 | view |
| `jwt` | JWT 解析和生成 | view |

### Crypto-Advanced
| 命令 | 功能 | 模式 |
|------|------|------|
| `sm4` | SM4 加密/解密 (ECB/CBC) | view |
| `aes` | AES 加密/解密 (CBC/GCM/ECB) | view |
| `rsa` | RSA 加解密 / 签名验签 / 生成密钥对 | view |

### Encoder-Tool
| 命令 | 功能 | 模式 |
|------|------|------|
| `encoder-tool` | Base64/Hex/Unicode 编解码 | view |
| `unicode-form` | Unicode 多格式转换 | view |
| `time-convert` | 时间戳与日期互转 | view |

### Generator-Tool
| 命令 | 功能 | 模式 |
|------|------|------|
| `uuid` | UUID/GUID 生成 | no-view |
| `qrcode` | 二维码生成/转换 | view |
| `variable-name` | 变量名格式转换 | view |
| `random-string` | 随机字符串生成 | view |

---

## 🔧 技术栈

- **框架**: Raycast API
- **语言**: TypeScript + React
- **构建工具**: Raycast CLI
- **依赖管理**: npm

### 项目依赖

| 项目 | 依赖 |
|------|------|
| crypto-tool | bcryptjs, gm-crypto |
| crypto-advanced | gm-crypto（AES / RSA 走 Node 内置 crypto，无额外依赖） |
| encoder-tool | 无额外依赖 |
| generator-tool | 无额外依赖 |

---

## 📂 项目结构

```
./
├── crypto-tool/
│   ├── src/
│   │   ├── hash.tsx              # Hash 命令
│   │   ├── bcrypt.tsx            # Bcrypt 命令
│   │   ├── jwt.tsx               # JWT 命令
│   │   ├── utils/                # 共享工具函数
│   │   └── hooks/                # React hooks
│   ├── package.json
│   └── tsconfig.json
│
├── crypto-advanced/
│   ├── src/
│   │   ├── sm4.tsx               # SM4 命令
│   │   ├── aes.tsx               # AES 命令
│   │   ├── rsa.tsx               # RSA 命令
│   │   ├── utils/                # 加解密纯逻辑 + 单测
│   │   └── types/                # TypeScript 类型
│   ├── package.json
│   └── tsconfig.json
│
├── encoder-tool/
│   ├── src/
│   │   ├── encoder-tool.tsx      # 编码工具主界面
│   │   ├── unicode-form.tsx      # Unicode 转换
│   │   ├── time-convert.tsx      # 时间转换
│   │   ├── base64.ts             # Base64 命令
│   │   ├── hexadecimal.ts        # Hex 命令
│   │   └── utils/                # 共享工具函数
│   ├── package.json
│   └── tsconfig.json
│
├── generator-tool/
│   ├── src/
│   │   ├── uuid.ts               # UUID 命令
│   │   ├── qrcode.tsx            # 二维码工具
│   │   ├── variable-name.tsx     # 变量名转换
│   │   ├── random-string.tsx     # 随机字符串
│   │   └── utils/                # 共享工具函数
│   ├── package.json
│   └── tsconfig.json
│
├── SPLIT_SUMMARY.md              # 详细拆分总结
├── QUICK_REFERENCE.md            # 快速参考指南
├── COMPLETION_CHECKLIST.md       # 完成清单
└── README.md                      # 本文件
```

---

## ✨ 主要特性

### Hash 命令
- ✅ 支持 5 种算法
- ✅ 支持加盐
- ✅ 列表形式显示所有结果
- ✅ 一键复制

### Unicode 命令
- ✅ 支持多种格式转换
- ✅ 列表形式显示所有结果
- ✅ 自动格式检测

### 时间转换命令
- ✅ Unix 时间戳 ↔ 日期时间
- ✅ 支持秒/毫秒
- ✅ 列表形式显示所有结果
- ✅ 自动格式识别

### 变量名转换命令
- ✅ 支持 6 种格式
- ✅ 列表形式显示所有结果
- ✅ 一键复制

---

## 📖 文档

- **SPLIT_SUMMARY.md** - 详细的项目拆分说明
- **QUICK_REFERENCE.md** - 快速命令参考
- **COMPLETION_CHECKLIST.md** - 完成清单和功能列表

---

## 🔄 迁移说明

原 `dev-tool` 项目保留在:
```
./dev-tool (原项目，已归档)
```

可根据需要保留或删除。新项目完全独立，可分别开发和发布。

---

## 🤝 贡献

每个项目都可以独立维护和发布。遵循以下步骤:

1. 在项目目录中进行修改
2. 运行 `npm run type-check` 进行类型检查
3. 运行 `npm run build` 进行构建验证
4. 运行 `npm run publish` 发布到 Raycast Store

---

## 📄 许可证

MIT

---

**拆分完成**: 2024-05-21  
**状态**: ✅ 完全完成  
**所有项目**: ✅ 构建成功
