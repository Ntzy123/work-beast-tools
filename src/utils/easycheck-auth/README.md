# easycheck-auth

根据 `docs/get-easycheck-url-flow.md` 实现的 Node.js OAuth 授权工具。

## 安装

无需额外依赖，仅用 Node 内置 fetch（Node >= 18）。

## 用法

```js
import { getEasycheckUrl } from './src/utils/easycheck-auth/index.mjs'

try {
  const url = await getEasycheckUrl('138xxxxxxxx', 'your_password')
  console.log('easycheck URL:', url)
  // → https://rm.vankeservice.com/easycheck/#/nightAnswer?accessToken=...
} catch (err) {
  console.error('获取失败:', err.message)
}
```

### 开启调试日志

```js
const url = await getEasycheckUrl('138xxxxxxxx', 'your_password', { verbose: true })
```

## 导出接口

| 名称               | 类型                                  | 说明   |
| ------------------ | ------------------------------------- | ------ |
| `getEasycheckUrl`  | `async (mobile, password, opts?)`     | 主入口 |
| `easycheckAuth`    | 同上                                  | 别名   |

## 流程

完整的 7 步流程参见：`docs/get-easycheck-url-flow.md`

- **阶段一**：账号密码登录，建立 `X-heimdall` 会话 Cookie
- **阶段二**：利用会话 Cookie 免密跳转到 easycheck，获取最终 accessToken
