# 项目拆分完成总结

## 概述
已成功将原 `dev-tool` 项目拆分为三个独立的 Raycast 扩展项目。

## 三个新项目

### 1. 加密工具 (crypto-tool)
**位置**: `./crypto-tool`

**命令**:
- `hash`: Hash 生成工具
  - 支持算法: MD5、SHA-1、SHA-256、SHA-512、SM3
  - 支持加盐
  - 列表形式显示所有转换结果
  
- `crypto-tool`: 统一的加密工具
  - SM4 加密/解密 (ECB/CBC 模式)
  - Bcrypt 密码哈希和验证
  - JWT 解析和生成

**源文件**:
- `src/hash.tsx` - Hash 命令入口
- `src/crypto-tool.tsx` - 加密工具主界面
- `src/bcrypt-form.tsx` - Bcrypt 表单
- `src/jwt-form.tsx` - JWT 表单
- `src/sm4-form.tsx` - SM4 表单
- `src/utils/` - 共享工具函数
- `src/types/` - TypeScript 类型定义
- `src/hooks/` - React hooks

**依赖**: bcryptjs, gm-crypto

**状态**: ✅ 构建成功

---

### 2. 编解码工具 (encoder-tool)
**位置**: `./encoder-tool`

**命令**:
- `encoder-tool`: 编码工具
  - Base64 编解码
  - 十六进制编解码
  - Unicode 转义序列解码
  
- `unicode-form`: Unicode 编码转换
  - 支持多种格式: JavaScript (\uXXXX)、Unicode 标准 (U+XXXX)、十进制、十六进制
  - 列表形式显示所有转换结果
  
- `time-convert`: 时间转换工具
  - Unix 时间戳 (秒/毫秒) ↔ 日期时间
  - 支持 ISO 8601、本地时间、中文本地时间格式
  - 列表形式显示所有转换结果

**源文件**:
- `src/encoder-tool.tsx` - 编码工具主界面
- `src/unicode-form.tsx` - Unicode 转换界面
- `src/time-convert.tsx` - 时间转换界面
- `src/base64.ts` - Base64 命令
- `src/hexadecimal.ts` - 十六进制命令
- `src/utils/` - 共享工具函数 (包含 unicode.ts)

**依赖**: 无额外依赖

**状态**: ✅ 构建成功

---

### 3. 字符生成工具 (generator-tool)
**位置**: `./generator-tool`

**命令**:
- `uuid`: UUID/GUID 生成
  - 支持保留/去掉连字符
  - 支持大写/小写
  
- `qrcode`: 二维码工具
  - 生成二维码 (基于 QR Server API)
  - 解析二维码 (预留接口)
  
- `variable-name`: 变量名转换
  - 支持格式: camelCase、PascalCase、snake_case、kebab-case、CONSTANT_CASE、dot.case
  - 列表形式显示所有转换结果
  
- `random-string`: 随机字符串生成
  - 支持字符集: 字母+数字、小写字母、大写字母、数字、符号、自定义
  - 可配置长度 (1-1000)

**源文件**:
- `src/uuid.ts` - UUID 命令
- `src/qrcode.tsx` - 二维码工具
- `src/variable-name.tsx` - 变量名转换
- `src/random-string.tsx` - 随机字符串生成
- `src/utils/` - 共享工具函数

**依赖**: 无额外依赖

**状态**: ✅ 构建成功

---

## 项目结构

每个项目都包含:
```
project-name/
├── package.json          # 项目配置
├── tsconfig.json         # TypeScript 配置
├── raycast-env.d.ts      # Raycast 环境定义
├── src/
│   ├── utils/           # 共享工具函数
│   ├── types/           # TypeScript 类型 (仅 crypto-tool)
│   ├── hooks/           # React hooks (仅 crypto-tool)
│   └── *.tsx/*.ts       # 命令入口文件
└── node_modules/        # 依赖包
```

## 构建验证

所有项目都已完成:
- ✅ npm install - 依赖安装成功
- ✅ npm run type-check - 类型检查通过
- ✅ npm run build - 构建成功

## 后续步骤

1. **开发**: 在各项目目录运行 `npm run dev` 进行开发
2. **发布**: 各项目可独立发布到 Raycast Store
3. **维护**: 每个项目独立维护版本和依赖

## 原项目状态

原 `dev-tool` 项目仍保留在:
`./dev-tool` (原项目，已归档)

可根据需要保留或删除。

---

**拆分完成时间**: 2024-05-21
**拆分状态**: ✅ 完成
