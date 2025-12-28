# 定位图标设置说明

## 📁 目录结构

```
work-beast-tools/
├── src/
│   ├── assets/
│   │   └── icons/
│   │       ├── location-pin.svg      ← SVG 源文件（纳入版本控制）
│   │       └── README.md
│   └── static/
│       └── images/
│           ├── location-pin.png      ← PNG 图片（不纳入版本控制）
│           └── .gitkeep
└── .gitignore                        ← 已配置忽略 PNG 图片
```

---

## 🎯 文件放置

### 1. SVG 源文件（纳入 Git）

**位置：** `src/assets/icons/location-pin.svg`

**说明：**
- ✅ 纳入版本控制
- ✅ 作为设计源文件保存
- ✅ 可随时修改和导出

---

### 2. PNG 图片（不纳入 Git）

**位置：** `src/static/images/location-pin.png`

**说明：**
- ❌ 不纳入版本控制（已在 .gitignore 中配置）
- ✅ 从 SVG 导出生成
- ✅ 实际运行时使用的文件

---

## 📐 图标规格要求

### PNG 图片规格

| 属性 | 要求 |
|------|------|
| 尺寸 | 48x48px（2x）或 64x64px |
| 格式 | PNG-32（带 Alpha 通道） |
| 背景 | 完全透明 |
| 主体颜色 | 白色 (#FFFFFF) |
| 形状 | 水滴形（上半部分圆形 + 下半部分尖角） |
| 中间 | 镂空透明 |

### 设计要点

```
    ⚪ ← 上半部分：白色圆环
   (  )  ← 中间：完全透明（镂空）
    💧 ← 下半部分：白色尖角
```

---

## 🔧 导出 PNG 的方法

### 方法一：使用 Figma/Sketch

1. 打开 `location-pin.svg`
2. 选择图标图层
3. 导出设置：
   - 格式：PNG
   - 尺寸：2x（48x48px）
   - 背景：透明
4. 导出到 `src/static/images/location-pin.png`

---

### 方法二：使用在线工具

推荐工具：
- https://svgtopng.com/
- https://cloudconvert.com/svg-to-png

导出设置：
- Width: 48px（或 64px）
- Height: 48px（或 64px）
- Background: Transparent
- Quality: High

---

### 方法三：使用命令行（需要 ImageMagick）

```bash
# 安装 ImageMagick
# Windows: choco install imagemagick
# Mac: brew install imagemagick

# 转换 SVG 到 PNG
magick convert -background none -resize 48x48 \
  src/assets/icons/location-pin.svg \
  src/static/images/location-pin.png
```

---

## ✅ 验证图标

### 检查清单

- [ ] PNG 文件已放置在 `src/static/images/location-pin.png`
- [ ] 文件尺寸为 48x48px 或更大
- [ ] 使用图片查看器确认背景透明
- [ ] 使用图片查看器确认中间镂空透明
- [ ] 主体为白色
- [ ] SVG 源文件已放置在 `src/assets/icons/location-pin.svg`

---

## 🚀 使用说明

### 代码中的使用

图标已在代码中配置：

```javascript
// src/pages/watermark/index.vue (约 495 行)
ctx.drawImage(
  '/static/images/location-pin.png',
  iconX,
  iconY,
  24,  // 显示宽度
  24   // 显示高度
)
```

### 路径说明

- **代码中的路径：** `/static/images/location-pin.png`
- **实际文件路径：** `src/static/images/location-pin.png`
- **打包后路径：** 会被复制到 `dist/static/images/location-pin.png`

---

## 🔍 测试步骤

### 1. 放置图标

将 `location-pin.png` 放到 `src/static/images/` 目录

### 2. 运行项目

```bash
# H5 测试
npm run dev:h5

# APP 测试
npm run dev:app
```

### 3. 生成水印

1. 选择图片
2. 输入姓名
3. 点击"生成水印"
4. 查看左下角定位框中的图标

### 4. 检查效果

- ✅ 图标显示为白色
- ✅ 中间镂空，可以看到半透明黑色背景
- ✅ H5 和 APP 效果一致

---

## 📝 Git 配置说明

### .gitignore 配置

已添加以下规则：

```gitignore
# Static images (generated from SVG, not version controlled)
src/static/images/*.png
src/static/images/*.jpg
src/static/images/*.jpeg
# Keep the directory structure
!src/static/images/.gitkeep
```

**效果：**
- ✅ SVG 文件会被 Git 跟踪
- ✅ PNG 文件不会被 Git 跟踪
- ✅ 目录结构会被保留（通过 .gitkeep）

---

## 🛠️ 修改图标

### 如果需要修改图标：

1. **修改 SVG 源文件**
   - 编辑 `src/assets/icons/location-pin.svg`
   - 提交到 Git

2. **重新导出 PNG**
   - 使用上述任一方法导出 PNG
   - 覆盖 `src/static/images/location-pin.png`
   - 不需要提交 PNG（已被 .gitignore）

3. **测试效果**
   - 重新运行项目
   - 生成水印查看效果

---

## ❓ 常见问题

### Q1: 图标不显示怎么办？

**检查：**
1. 文件是否存在：`src/static/images/location-pin.png`
2. 文件名是否正确（区分大小写）
3. 文件是否损坏（尝试用图片查看器打开）

**解决：**
- 重新导出 PNG 文件
- 确保文件路径正确

---

### Q2: 图标显示为黑色方块？

**原因：** PNG 文件没有透明通道

**解决：**
1. 重新导出时选择"透明背景"
2. 确保导出为 PNG-32 格式（不是 PNG-8）
3. 使用图片编辑器检查 Alpha 通道

---

### Q3: 图标太大或太小？

**调整：**

修改代码中的显示尺寸（约 497 行）：

```javascript
const iconSize = 24  // 改为其他值，如 20 或 28
```

或者重新导出不同尺寸的 PNG。

---

### Q4: 中间没有镂空效果？

**原因：** SVG 源文件中间不是透明的

**解决：**
1. 在设计软件中确保中间部分是镂空的
2. 导出 PNG 时确保保留透明度
3. 使用图片查看器确认中间是透明的

---

## 📞 需要帮助？

如果遇到问题：

1. **检查文件：**
   - 使用图片查看器打开 PNG
   - 确认背景和中间都是透明的（通常显示为棋盘格）

2. **查看调试信息：**
   - 生成水印后点击"显示调试信息"
   - 查看是否有图片加载错误

3. **提供信息：**
   - PNG 文件截图
   - 生成的水印截图
   - 调试信息截图

---

## 📌 快速开始

### 最简单的方式：

1. **将你的 PNG 图标文件重命名为 `location-pin.png`**
2. **放到 `src/static/images/` 目录**
3. **重新运行项目测试**

就这么简单！✨

---

## 更新日志

**2024-12-28**
- ✅ 创建目录结构
- ✅ 配置 .gitignore
- ✅ 修改代码使用 PNG 图标
- ✅ 添加完整的使用说明

