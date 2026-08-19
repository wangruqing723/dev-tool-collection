# 加密类命令按「可逆性」划分扩展归属

加密类命令原先集中在 `crypto-tool`，SM4 迁出到 `crypto-advanced` 后，「哪个命令该放哪边」失去了判据——扩展名里的「高级」是主观词，无法据以判断新命令的归属。现决定以**算法是否可逆**为唯一判据：可逆加解密（SM4、AES、RSA）归 `crypto-advanced`，单向摘要与令牌（Hash、Bcrypt、JWT）归 `crypto-tool`。因此 `crypto-advanced` 的 description 从「高级加密工具」改为「加解密工具」，扩展名 `crypto-advanced` 与 owner 保持不变。

## Considered Options

- **按国密 / 国际标准划分**：被否。SM3 是国密但属单向摘要，会和 SM4 分家，判据自相矛盾。
- **按使用难度或高级程度划分**：被否。「高级」无客观标准，每加一个命令都要重新争论。
- **按可逆性划分**（采纳）：可逆性是算法的固有属性，对任何未来命令都能一眼判定。

## Consequences

扩展名 `crypto-advanced` 与它的实际含义（可逆加解密）不再字面对应。接受这一点：目录、owner `ruqingwang-crypto-advanced` 均已建立，改名的代价大于收益，判据写在此处即可。
