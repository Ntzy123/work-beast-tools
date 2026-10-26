# 牛马工具箱 (WBTools)

基于 uni-app (Vue 3 + Vite) 的日常工具集，主要面向一线员工：给照片打水印、扫码还原水印、查看夜答实例、查询送水、多图拼接。

主要运行环境是 **Android App**（HBuilderX 打包），H5 可用于开发调试。

## 功能

| 模块 | 说明 |
|------|------|
| 添加水印 | 批量给照片叠加时间 / 姓名 / 项目定位 + 加密二维码；支持多图模式（按倍数与时间跨度生成多条时间递增的记录） |
| 扫码解密 | 首页扫码，识别外层 `text/version` 后 AES 解密，展示姓名、工号、时间、坐标 |
| 自动夜答 | 调 `aec.kyrian.asia` 创建 / 查询自动夜答实例 |
| 查询送水 | 首页展示今日白班送水统计 |
| 拼图 | 纯前端 Canvas 多图拼接，无需后端 |
| 版本更新 | 启动静默检查 `/api/wbtools_version/latest`，强制更新不可跳过 |

## 目录

```
src/pages/index       首页（工具列表 / 扫码 / 人员状态 / 设置）
src/pages/watermark   添加水印（Canvas 绘制 + 二维码）
src/pages/collage     拼图
src/utils             collage.js、update.js、staffMap.json
src/config            后端地址与抓包配置
src/assets/icons      图标 SVG 源文件（纳入版本控制）
src/static            运行时静态资源
docs/                 协议、接口、设计文档
scripts/svg-to-png.mjs  SVG → PNG 图标生成
```

## 环境要求

| 项 | 版本 |
|----|------|
| Node.js | **24.12.0**（本机实测版本，换版本前先在干净目录试装） |
| npm | **11.6.2**（会升级 lockfile 结构的 npm 大版本不要用） |
| 包管理器 | 仅 npm，**不要用 pnpm / yarn** |
| Registry | 官方源 `https://registry.npmjs.org/`（已写入 `.npmrc`） |

`package-lock.json` 由仓库统一维护，**提交前不要让它出现改动**。以下操作会污染 lock、制造无意义的千行 diff：

- 切换 registry 镜像（npmmirror、公司私服等），会让全文件 `resolved` 地址变化
- 用 pnpm / yarn 安装，或混用不同大版本 npm
- 在不同操作系统上无谓地重装依赖（lock 中有 80+ 条平台相关的可选二进制依赖）

真有依赖需要升级时，单独开一个提交，并在此注明 Node / npm 版本。

## 快速开始

```bash
npm install          # 第一次会自动生成 node_modules，lock 应保持无改动
npm run icons        # 必做：由 SVG 生成 src/static/images/*.png
npm run dev:h5       # 浏览器调试
npm run build:h5     # H5 构建
```

`src/static/images/*.png` 是**构建期生成的产物**，不入 git。没有它页面图标会全部空白，所以 `npm install` 之后必须跑一次 `npm run icons`（源文件在 `src/assets/icons/*.svg`，转换靠 devDependencies 里的 `sharp`，无需手动拷贝任何图片）。

App 端请用 **HBuilderX** 打开项目根目录，运行到手机或云打包（CLI 未提供 app 构建脚本）。

其余被忽略的只有 `node_modules/` 和 `unpackage/`（构建产物），都无需移植。

## 用户配置建议

| 配置 | 位置 | 说明 |
|------|------|------|
| 后端地址 | `src/config/base.js` → `API_BASE` | 送水查询、人员状态、版本检查统一走这里 |
| H5 代理 | `vite.config.js` → `server.proxy` | target 写死 `http://kyrian.asia`，改域名需同步修改 |
| 夜答服务 | `src/pages/index/index.vue:311` → `AEC_API_BASE` | 默认 `https://aec.kyrian.asia` |
| 员工 ID 映射 | `src/utils/staffMap.json` | `姓名 → 员工ID`。**换人/换项目必须维护**，命不中会退化为随机 ID，生成的水印二维码无法对应真人 |
| 水印密钥 | 默认 `e373d090928170eb`，缓存于 storage `watermark_encryption_key` | 扫码时会先请求 `api.config.json` 里的远端接口刷新密钥，失败则用本地值；该文件中的 Cookie 会过期，属抓包遗留 |
| 定位文案 / 坐标 | `src/pages/watermark/index.vue:633`、`generateRandomCoordinates()` | 位置名写死，经纬度在固定矩形区域内随机取点（GCJ-02）。换项目需改这两处 |
| 版本号 | `src/manifest.json` → `versionName` / `versionCode` | 发版必须递增 `versionCode`，否则更新检查判定为最新 |
| 应用标识 | `src/manifest.json` → `appid`、`mp-weixin.appid` | 迁移到自己的账号下需替换，否则无法打包/发布 |

水印二维码的加密协议、二维码参数见 [`docs/qr-code-spec.md`](docs/qr-code-spec.md)。

## 文档

- `docs/qr-code-spec.md` — 水印加密协议与二维码生成参数
- `docs/update-flow-design.md` / `docs/wbtools-version-api.md` — 版本更新设计与接口
- `docs/get-easycheck-url-flow.md` / `docs/auto_easycheck_webserver-api.md` — 夜答登录与接口
- `docs/person-device-status-api.md` — 人员设备状态接口
- `docs/utils/collage.md` — 拼图工具 API
- `docs/svg-icon-management.md` — 图标管理
- `docs/roadmap.md` — 待办
