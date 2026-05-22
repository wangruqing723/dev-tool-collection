# 三个项目快速参考

## 项目位置

```
./
├── crypto-tool/          # 加密工具
├── encoder-tool/         # 编解码工具
└── generator-tool/       # 字符生成工具
```

## 快速命令

### Crypto-Tool (加密工具)
```bash
cd crypto-tool

# 开发
npm run dev

# 构建
npm run build

# 类型检查
npm run type-check

# 发布
npm run publish
```

**包含命令**:
- `hash` - Hash 生成 (MD5, SHA-1, SHA-256, SHA-512, SM3) + 加盐
- `crypto-tool` - SM4/Bcrypt/JWT 工具

---

### Encoder-Tool (编解码工具)
```bash
cd encoder-tool

# 开发
npm run dev

# 构建
npm run build

# 类型检查
npm run type-check

# 发布
npm run publish
```

**包含命令**:
- `encoder-tool` - Base64/Hex/Unicode 编解码
- `unicode-form` - Unicode 多格式转换
- `time-convert` - 时间戳与日期互转

---

### Generator-Tool (字符生成工具)
```bash
cd generator-tool

# 开发
npm run dev

# 构建
npm run build

# 类型检查
npm run type-check

# 发布
npm run publish
```

**包含命令**:
- `uuid` - UUID/GUID 生成
- `qrcode` - 二维码生成/转换
- `variable-name` - 变量名格式转换 (camelCase/snake_case 等)
- `random-string` - 随机字符串生成

---

## 关键特性

### Hash 命令 (crypto-tool)
- ✅ 支持 5 种算法: MD5、SHA-1、SHA-256、SHA-512、SM3
- ✅ 支持加盐
- ✅ 列表形式显示所有结果

### Unicode 命令 (encoder-tool)
- ✅ 支持多种格式转换
- ✅ 列表形式显示所有结果

### 时间转换命令 (encoder-tool)
- ✅ Unix 时间戳 ↔ 日期时间
- ✅ 支持秒/毫秒
- ✅ 列表形式显示所有结果

### 变量名转换命令 (generator-tool)
- ✅ 支持 6 种格式: camelCase、PascalCase、snake_case、kebab-case、CONSTANT_CASE、dot.case
- ✅ 列表形式显示所有结果

---

## 依赖关系

### Crypto-Tool
- bcryptjs (Bcrypt 密码哈希)
- gm-crypto (SM3/SM4 加密)

### Encoder-Tool
- 无额外依赖

### Generator-Tool
- 无额外依赖

---

## 开发提示

1. **共享代码**: 三个项目都有 `src/utils/` 目录，包含共享的工具函数
2. **类型定义**: crypto-tool 有 `src/types/` 目录用于 SM4 类型
3. **Hooks**: crypto-tool 有 `src/hooks/` 目录用于 React hooks

## 原项目

原 `dev-tool` 项目仍保留在:
```
./dev-tool (原项目，已归档)
```

可根据需要保留或删除。
