# 图标管理指南

## 概览

本项目使用 PNG 图片渲染图标，不依赖内联 SVG base64 或图标字体。

SVG 源文件统一存放在 `src/assets/icons/`，通过脚本自动转换为 PNG 输出到 `src/static/images/`。

## 目录结构

```
src/
├── assets/
│   └── icons/              ← SVG 源文件（唯一源头，Git 跟踪）
│       ├── search.svg
│       ├── settings.svg
│       ├── moon.svg
│       └── ...
├── static/
│   └── images/             ← 生成的 PNG（自动生成，.gitignore 忽略）
│       ├── search.png
│       ├── settings.png
│       └── ...
scripts/
└── svg-to-png.mjs          ← SVG → PNG 转换脚本
```

## 日常操作

### 新增图标

```
步骤 1 — 将 xxx.svg 放入 src/assets/icons/
步骤 2 — 运行一键生成
```

```bash
npm run icons
```

```
步骤 3 — 在页面中使用
```

```vue
<image src="/static/images/xxx.png" style="width:20px;height:20px;"></image>
```

### 删除图标

```
1. 从 src/assets/icons/ 删掉 SVG 文件
2. 运行 npm run icons 刷新
3. 从页面中删除引用
```

### 修改图标

```
1. 修改 src/assets/icons/xxx.svg
2. 运行 npm run icons 刷新 PNG
3. 页面自动生效（文件名不变）
```

## 可用脚本

```json
"icons": "node scripts/svg-to-png.mjs"
```

```bash
npm run icons              # 一键转换所有 SVG 为 PNG
npm run icons -- --size=32 # 自定义输出尺寸
```

## Git 管理

```
src/assets/icons/*.svg     →  提交到 Git（源文件）
src/static/images/*.png    →  .gitignore 已忽略（自动生成）
```

## SVG 注意事项

1. SVG 文件需使用 UTF-8 编码
2. 图标颜色由 SVG 自身定义（stroke / fill），PNG 会保留原始颜色
3. 新增 SVG 后运行 `npm run icons` 即可自动生成对应的 PNG
