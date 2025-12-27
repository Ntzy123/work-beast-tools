# 水印相机二维码加密协议分析报告

本协议描述了水印相机如何将拍摄者信息、位置及时间戳加密并生成二维码 `text` 字段的完整过程。

## 1. 核心加密参数

该加密体系基于对称加密算法，参数配置如下：

| **配置项**         | **内容**                               |
| ------------------ | -------------------------------------- |
| **加密算法**       | **AES-128**                            |
| **工作模式**       | **ECB** (Electronic Codebook)          |
| **填充方式**       | **PKCS7Padding**                       |
| **加密密钥 (Key)** | `e373d090928170eb` (16位 ASCII 字符串) |
| **输出编码**       | **Base64**                             |

------

## 2. 数据结构分析 (JSON)

在加密前，所有水印信息被封装为一个紧凑型 JSON 字符串。

### 字段映射表

| **字段名** | **类型** | **含义**         | **官方说明 / 代码参考** | **示例**                     |
| ---------- | -------- | ---------------- | ----------------------- | ---------------------------- |
| **`g`**    | Object   | **地理位置信息** | `CipherText.g`          | -                            |
| `g.c`      | String   | 坐标系类型       | `GeoBean.c`             | `"GCJ-02"` (火星坐标系)      |
| `g.la`     | Double   | 纬度             | `GeoBean.la`            | `26.553921`                  |
| `g.lo`     | Double   | 经度             | `GeoBean.lo`            | `106.730588`                 |
| `g.n`      | String   | 地理位置名称     | `GeoBean.n`             | 可为空字符串或地址描述       |
| **`n`**    | String   | **人员姓名**     | `CipherText.n`          | `"马绍平"`                   |
| **`or`**   | Integer  | **时间可靠性**   | `CipherText.or`         | `2` (表示特定时间来源类型)   |
| **`ot`**   | Long     | **原始时间戳**   | `CipherText.ot`         | `1766852178` (Unix时间戳/秒) |
| **`s`**    | Integer  | **员工ID**       | `CipherText.s`          | `2154401` (唯一识别码)       |

### 明文串示例

JSON

```
{"g":{"c":"GCJ-02","la":26.588579,"lo":106.71359,"n":""},"n":"张三","or":2,"ot":1766803031,"s":1702071}
```

------

## 3. 加密流程复现

1. **序列化 (Serialization)**: 将数据对象转换为 JSON 字符串，要求**无空格**且**字段顺序固定**。
2. **补位 (Padding)**: 对字符串进行 PKCS7 处理，使其长度补齐为 16 字节的整数倍。
3. **加密 (Encryption)**: 使用 `AES-128-ECB` 算法配合密钥进行加密，得到二进制密文。
4. **编码 (Encoding)**: 将二进制密文转换为 `Base64` 字符串，作为最终输出。

------

## 4. Python 实现参考

Python

```
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
import base64
import json

def generate_watermark_text(data_dict):
    """
    输入原始字典，输出加密后的二维码字符串
    """
    # 1. 设置密钥
    key = b"e373d090928170eb"
    
    # 2. 序列化 (separators 去除多余空格)
    plain_json = json.dumps(data_dict, separators=(',', ':'), ensure_ascii=False)
    
    # 3. 执行加密
    cipher = AES.new(key, AES.MODE_ECB)
    encrypted_bytes = cipher.encrypt(pad(plain_json.encode('utf-8'), 16))
    
    # 4. Base64 编码
    return base64.b64encode(encrypted_bytes).decode('utf-8')
```

------

**文档说明**: 本报告仅供技术研究使用。由于采用的是 **ECB** 模式，其安全性相对较低（存在明文块攻击风险），建议在生产环境中使用更安全的 **CBC** 或 **GCM** 模式并引入动态 **IV**。