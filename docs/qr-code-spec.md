# 水印加密 & 二维码生成参数

水印相机把拍摄者信息、位置、时间加密后写入二维码的 `text` 字段。本文件是协议与生成参数的完整参考。

## 1. 加密参数

| 配置 | 值 |
|------|----|
| 算法 | AES-128 |
| 模式 | ECB |
| 填充 | PKCS7Padding |
| 密钥 | `e373d090928170eb`（16 字节 ASCII，硬编码） |
| 输出 | Base64 |

## 2. 明文 JSON 结构

```json
{"g":{"c":"GCJ-02","la":26.588579,"lo":106.71359,"n":""},"n":"张三","or":2,"ot":1766803031,"s":1702071}
```

| 字段 | 类型 | 含义 | 官方类参考 |
|------|------|------|-----------|
| `g` | Object | 地理位置信息 | `CipherText.g` |
| `g.c` | String | 坐标系，固定 `"GCJ-02"` | `GeoBean.c` |
| `g.la` | Double | 纬度 | `GeoBean.la` |
| `g.lo` | Double | 经度 | `GeoBean.lo` |
| `g.n` | String | 位置名称（可空串） | `GeoBean.n` |
| `n` | String | 姓名 | `CipherText.n` |
| `or` | Integer | 时间可靠性/来源类型，固定 `2` | `CipherText.or` |
| `ot` | Long | Unix 时间戳（**秒**） | `CipherText.ot` |
| `s` | Integer | 员工 ID | `CipherText.s` |

序列化要求：**无空格**（`separators=(',',':')`）、字段顺序固定为 `g,n,or,ot,s`，与官方输出保持一致便于比对。

## 3. 加密流程

```
明文JSON → AES-128-ECB 加密(PKCS7) → Base64 → 包裹外层JSON
```

外层 JSON：

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

### 解密（crypto-js，前端同款）

```js
const b64 = JSON.parse(text).text.replace(/\\u003d/g, '=')  // 部分来源会把 '=' 转义成 \u003d
const key = CryptoJS.enc.Utf8.parse('e373d090928170eb')
const plain = CryptoJS.AES.decrypt(b64, key, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 })
  .toString(CryptoJS.enc.Utf8)
const data = JSON.parse(plain)
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

## 6. 安全说明

ECB 模式无 IV、相同明文块产生相同密文，且密钥硬编码在客户端，仅适合内部信息校验，不具备真实防伪能力。若要提升强度，应改用 CBC/GCM + 动态 IV 并下发密钥。
