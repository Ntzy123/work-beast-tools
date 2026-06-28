# 水印加密 & 二维码生成参数

快速手动生成参考。加密协议详情见 `README.md`。

## 1. 加密参数

| 配置 | 值 |
|------|----|
| 算法 | AES-128 |
| 模式 | ECB |
| 填充 | PKCS7Padding |
| 密钥 | `e373d090928170eb` (16字节 ASCII) |
| 输出 | Base64 |

## 2. 明文 JSON 结构

```json
{"g":{"c":"GCJ-02","la":26.588579,"lo":106.71359,"n":""},"n":"张三","or":2,"ot":1766803031,"s":1702071}
```

| 字段 | 类型 | 含义 |
|------|------|------|
| `g.c` | String | 坐标系，固定 `"GCJ-02"` |
| `g.la` | Double | 纬度 |
| `g.lo` | Double | 经度 |
| `g.n` | String | 位置名称（可空） |
| `n` | String | 姓名 |
| `or` | Integer | 时间可靠性，固定 `2` |
| `ot` | Long | Unix 时间戳（秒） |
| `s` | Integer | 员工 ID |

## 3. 加密流程

```
明文JSON → AES-128-ECB加密 → Base64编码 → 包裹外层JSON
```

外层 JSON 格式：

```json
{"text":"<base64密文>","version":"v1.0"}
```

### Python 实现

```python
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
import base64, json

def encrypt(data: dict) -> str:
    plain = json.dumps(data, separators=(',', ':'), ensure_ascii=False)
    cipher = AES.new(b"e373d090928170eb", AES.MODE_ECB)
    ct = cipher.encrypt(pad(plain.encode('utf-8'), 16))
    b64 = base64.b64encode(ct).decode()
    return json.dumps({"text": b64, "version": "v1.0"}, separators=(',', ':'))

# 使用
data = {"g":{"c":"GCJ-02","la":26.588579,"lo":106.71359,"n":""},"n":"张三","or":2,"ot":1766803031,"s":1702071}
qr_content = encrypt(data)
```

## 4. 二维码生成参数

| 参数 | 值 |
|------|----|
| 库 | `qrcode` v1.5.4 |
| 纠错等级 | `L` (≈7%) |
| 版本 | 自动 → Version 7（45×45 模块） |
| 掩码 | 自动优选（当前 Pattern 2） |
| 编码 | Byte mode |
| 内容长度 | ≈200 字符 |

### 边距（Quiet Zone）

| 项 | 值 |
|---|----|
| 白色背景尺寸 | `258 × watermarkScale` px |
| 内部边距 margin | `6 × watermarkScale` px（每边） |
| QR 标准要求 | **4 个模块宽**（当前 ≈5.47px × 4 ≈ 22px） |
| 当前是否达标 | **否**，6px 远小于标准要求的 ≈22px |

> 当前边距偏小，大部分扫码器仍可识别（背景图片提供额外对比度），但在极端光照或畸变条件下可能失败。建议改为 `margin = moduleSize * 4` 确保符合标准。

### 代码实现

```js
import QRCode from 'qrcode'

const qrData = QRCode.create(qrContent, { errorCorrectionLevel: 'L' })
// qrData.modules.size  → 45
// qrData.modules.data  → 2025 个元素 (1=黑, 0=白)

const mCount = qrData.modules.size
const moduleSize = (258 - 12) / mCount     // 258px 总宽，两边各 6px margin
const margin = 6

ctx.fillStyle = '#ffffff'
ctx.fillRect(qrX, qrY, 258, 258)           // 白色底

ctx.fillStyle = '#000000'
for (let r = 0; r < mCount; r++)
  for (let c = 0; c < mCount; c++)
    if (qrData.modules.data[r * mCount + c])
      ctx.fillRect(
        qrX + margin + c * moduleSize,      // ← 加上 margin 偏移
        qrY + margin + r * moduleSize,
        moduleSize, moduleSize
      )
```

### 纠错等级 vs 版本

| 等级 | 恢复能力 | 需版本 |
|------|----------|:------:|
| **L (当前)** | ≈7% | 7 |
| M | ≈15% | 8 |
| Q | ≈25% | 11 |
| H | ≈30% | 14 |

## 5. 扫码识别

```js
try {
  const p = JSON.parse(text)
  return !!(p && p.text && p.version)    // 有 text + version 字段即视为有效
} catch { return false }
```
