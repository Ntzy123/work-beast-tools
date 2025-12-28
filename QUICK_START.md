# 🚀 快速开始 - 定位图标设置

## ✅ 已完成的配置

### 1. 目录结构 ✓

```
work-beast-tools/
├── src/
│   ├── assets/
│   │   └── icons/
│   │       ├── location-pin.svg      ← 请放 SVG 源文件（Git 跟踪）
│   │       └── README.md             ✓ 已创建
│   └── static/
│       └── images/
│           ├── location-pin.png      ← 请放 PNG 图片（Git 忽略）
│           ├── .gitkeep              ✓ 已创建
│           └── README.md             ✓ 已创建
└── .gitignore                        ✓ 已配置
```

### 2. Git 配置 ✓

`.gitignore` 已添加规则：
- ✅ PNG/JPG 图片不会被跟踪
- ✅ SVG 源文件会被跟踪
- ✅ 目录结构会被保留

### 3. 代码修改 ✓

`src/pages/watermark/index.vue` 已修改为使用 PNG 图标：

```javascript
// 约 495-507 行
ctx.drawImage(
  '/static/images/location-pin.png',
  iconX,
  iconY,
  24,  // 显示尺寸
  24
)
```

---

## 📝 你需要做的事

### 第一步：放置 SVG 源文件

将你的 `定位.svg` 文件：
1. 重命名为 `location-pin.svg`
2. 放到 `src/assets/icons/` 目录

### 第二步：生成并放置 PNG 文件

#### 方式 A：在线转换（推荐，最简单）

1. 打开 https://svgtopng.com/
2. 上传你的 SVG 文件
3. 设置尺寸：**48x48** 或 **64x64**
4. 勾选 **Transparent Background**
5. 下载 PNG
6. 重命名为 `location-pin.png`
7. 放到 `src/static/images/` 目录

#### 方式 B：使用设计软件

**Figma:**
1. 导入 SVG
2. 选择图层
3. Export → PNG → 2x
4. 保存为 `location-pin.png`
5. 放到 `src/static/images/` 目录

**Photoshop:**
1. 打开 SVG
2. File → Export → Export As
3. 格式：PNG
4. 尺寸：48x48px
5. 勾选"透明度"
6. 保存为 `location-pin.png`
7. 放到 `src/static/images/` 目录

### 第三步：验证

1. 用图片查看器打开 `location-pin.png`
2. 确认：
   - ✅ 背景透明（显示为棋盘格）
   - ✅ 中间镂空透明（显示为棋盘格）
   - ✅ 主体为白色

### 第四步：测试

```bash
# 运行项目
npm run dev:h5

# 或打包 APP
npm run build:app
```

生成水印，查看左下角定位框中的图标效果。

---

## 📐 图标规格要求

| 项目 | 要求 |
|------|------|
| 尺寸 | 48x48px 或 64x64px |
| 格式 | PNG-32（带 Alpha 通道） |
| 背景 | 完全透明 |
| 主体颜色 | 白色 (#FFFFFF) |
| 形状 | 水滴形，中间镂空 |

---

## ✨ 效果预期

### 当前（手绘实心）
```
左下角定位框：
┌────────────────────┐
│ 🔵 Q贵阳首钢...    │  ← 实心白色圆点
└────────────────────┘
```

### 使用 PNG 后（镂空）
```
左下角定位框：
┌────────────────────┐
│ ⚪ Q贵阳首钢...    │  ← 白色环形，中间透明
└────────────────────┘
```

中间的镂空部分可以看到半透明黑色背景！

---

## 🎯 一句话总结

**把你的 `定位.png` 重命名为 `location-pin.png`，放到 `src/static/images/` 目录，就完成了！**

---

## 📚 详细文档

- **完整设置指南：** `ICON_SETUP.md`
- **二维码调试：** `QR_DEBUG.md`
- **整体调试：** `DEBUG_GUIDE.md`

---

## ❓ 遇到问题？

### 图标不显示

**检查：**
1. 文件路径是否正确：`src/static/images/location-pin.png`
2. 文件名是否正确（区分大小写）
3. 文件是否损坏（用图片查看器打开测试）

### 图标显示为黑色

**原因：** PNG 没有透明通道

**解决：**
- 重新导出时选择"透明背景"
- 确保是 PNG-32 格式（不是 PNG-8）

### 中间没有镂空

**原因：** SVG 源文件中间不是透明的

**解决：**
- 在设计软件中确保中间是镂空的
- 重新导出 PNG

---

## 🎉 完成后

1. ✅ SVG 源文件在 `src/assets/icons/`（Git 跟踪）
2. ✅ PNG 图片在 `src/static/images/`（Git 忽略）
3. ✅ 代码已配置使用 PNG
4. ✅ 运行项目测试效果

---

**祝你使用愉快！** 🚀✨

