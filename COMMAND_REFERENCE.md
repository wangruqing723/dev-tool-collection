# 三个项目完整命令参考

## 🔐 Crypto-Tool (加密工具)

### 1. Hash 生成
```
命令: hash
模式: view
功能: 生成多种 Hash 值（MD5、SHA-1、SHA-256、SHA-512、SM3）
特点: 
  - 支持加盐
  - 列表形式显示所有算法结果
  - 一键复制
```

### 2. SM4 加密
```
命令: sm4
模式: view
功能: SM4 加密和解密
特点:
  - 支持 ECB/CBC 模式
  - 支持 Hex/Base64/UTF-8 格式
  - 密钥历史记录
```

### 3. Bcrypt 密码处理
```
命令: bcrypt
模式: view
功能: Bcrypt 密码哈希和验证
特点:
  - 生成密码哈希
  - 验证密码
  - 可自定义 Salt 位数（4-31）
```

### 4. JWT 工具
```
命令: jwt
模式: view
功能: JWT 解析和生成
特点:
  - 解析 JWT Token
  - 生成 HS256 JWT
  - 显示 Header、Payload、Signature
```

---

## 🔤 Encoder-Tool (编解码工具)

### 1. Base64 编码/解码
```
命令: base64
模式: view
功能: Base64 编码和解码
特点:
  - 自动检测输入格式
  - 支持编码和解码
```

### 2. 十六进制编码/解码
```
命令: hexadecimal
模式: view
功能: 十六进制编码和解码
特点:
  - 自动检测输入格式
  - 支持编码和解码
```

### 3. Unicode 转换
```
命令: unicode-form
模式: view
功能: Unicode 编码转换
特点:
  - 支持多种格式：
    - JavaScript (\uXXXX)
    - Unicode 标准 (U+XXXX)
    - 十进制
    - 十六进制
  - 列表形式显示所有结果
```

### 4. 时间转换
```
命令: time-convert
模式: view
功能: 时间戳与日期互转
特点:
  - 实时显示当前时间
  - 支持 Unix 时间戳（秒/毫秒）
  - 支持日期时间输入
  - 显示多种格式：
    - ISO 8601
    - 本地时间
    - 中文本地时间
```

---

## 🎲 Generator-Tool (字符生成工具)

### 1. UUID / GUID 生成
```
命令: uuid
模式: no-view
参数:
  --type [uuid|guid]      生成类型（默认 UUID）
  --dash [true|false]     是否保留连字符（默认 true）
  --upper [true|false]    是否大写（默认 false）

示例:
  uuid
  uuid --type guid
  uuid --type guid --dash false --upper true
```

### 2. 二维码生成
```
命令: qrcode
模式: view
功能: 二维码生成和转换
特点:
  - 生成二维码图片预览
  - 复制二维码 URL
  - 支持文本和 URL
```

### 3. 变量名转换
```
命令: variable-name
模式: view
功能: 变量名格式转换
支持格式:
  - camelCase
  - PascalCase
  - snake_case
  - kebab-case
  - CONSTANT_CASE
  - dot.case
特点:
  - 列表形式显示所有格式
  - 一键复制
```

### 4. 随机字符串生成
```
命令: random-string
模式: no-view
参数:
  --length <number>       字符串长度（默认 16，范围 1-1000）
  --charset <type>        字符集类型（默认 alphanumeric）

字符集类型:
  - alphanumeric          字母 + 数字
  - lowercase             小写字母
  - uppercase             大写字母
  - numbers               数字
  - symbols               符号

示例:
  random-string
  random-string --length 32
  random-string --length 16 --charset lowercase
  random-string --length 20 --charset symbols
```

---

## 📊 命令总览

### 按模式分类

**View 模式** (进入界面):
- hash, sm4, bcrypt, jwt
- base64, hexadecimal, unicode-form, time-convert
- qrcode, variable-name

**No-View 模式** (直接返回结果):
- uuid, random-string

### 按功能分类

**加密相关**:
- hash, sm4, bcrypt, jwt

**编码相关**:
- base64, hexadecimal, unicode-form, time-convert

**生成相关**:
- uuid, qrcode, variable-name, random-string

---

## 🎯 快速使用场景

### 场景 1: 生成 UUID
```bash
# 快速生成 UUID
uuid

# 生成 GUID（大写，无连字符）
uuid --type guid --dash false --upper true
```

### 场景 2: 生成随机密钥
```bash
# 生成 32 字符的随机字符串
random-string --length 32 --charset alphanumeric

# 生成只包含数字的随机码
random-string --length 6 --charset numbers
```

### 场景 3: Hash 密码
```bash
# 进入 hash 命令，输入密码，选择算法和加盐
hash
```

### 场景 4: 转换时间戳
```bash
# 进入时间转换，自动显示当前时间
# 输入时间戳或日期进行转换
time-convert
```

### 场景 5: 编码文本
```bash
# Base64 编码/解码
base64

# 十六进制编码/解码
hexadecimal

# Unicode 转换
unicode-form
```

---

## 🔄 工作流示例

### 示例 1: 生成 API 密钥
1. 运行 `random-string --length 32 --charset alphanumeric`
2. 获得随机密钥
3. 自动复制到剪贴板

### 示例 2: 验证 JWT
1. 运行 `jwt` 进入 JWT 工具
2. 选择 "Parse"
3. 粘贴 JWT Token
4. 查看 Header、Payload、Signature

### 示例 3: 生成二维码
1. 运行 `qrcode` 进入二维码工具
2. 输入文本或 URL
3. 点击"生成"
4. 查看二维码预览
5. 复制 URL 或返回重新生成

### 示例 4: 转换变量名
1. 运行 `variable-name` 进入变量名转换
2. 输入变量名（如 `my_variable_name`）
3. 查看所有格式的转换结果
4. 选择需要的格式复制

---

**最后更新**: 2024-05-21  
**状态**: ✅ 完全完成
