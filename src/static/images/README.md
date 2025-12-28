# 📸 静态图片目录

## 快速说明

此目录用于存放运行时使用的图片资源（PNG/JPG）。

### ⚠️ 重要

- ❌ **此目录中的图片不会被 Git 跟踪**（已在 .gitignore 中配置）
- ✅ **图片源文件（SVG）请放在 `/src/assets/icons/` 目录**
- ✅ **SVG 文件会被 Git 跟踪，作为设计源文件保存**

---

## 📋 当前需要的文件

### location-pin.png

**用途：** 水印中的定位图标

**规格：**
- 尺寸：48x48px（推荐）或 64x64px
- 格式：PNG-32（带透明通道）
- 背景：完全透明
- 主体：白色水滴形状，中间镂空

**如何获取：**
1. 从 `/src/assets/icons/location-pin.svg` 导出
2. 或使用在线工具转换 SVG 到 PNG
3. 确保导出时选择"透明背景"

**放置位置：**
```
src/static/images/location-pin.png  ← 放这里
```

---

## 🔧 导出 PNG 的快速方法

### 在线工具（最简单）

1. 打开 https://svgtopng.com/
2. 上传 `location-pin.svg`
3. 设置尺寸为 48x48
4. 下载 PNG
5. 重命名为 `location-pin.png`
6. 放到此目录

### Figma/Sketch

1. 导入 SVG
2. 选择图层
3. Export → PNG → 2x
4. 保存到此目录

---

## ✅ 验证

使用图片查看器打开 PNG 文件，应该看到：
- 白色水滴形状
- 中间镂空（显示为棋盘格背景）
- 背景透明（显示为棋盘格背景）

---

详细说明请查看项目根目录的 `ICON_SETUP.md` 文件。

