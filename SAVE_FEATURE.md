# 图片保存功能说明

## 📁 保存位置

### H5 环境
- 浏览器下载到默认下载目录
- 文件名：时间戳格式（年月日时分秒.jpg）

### APP 环境
- **保存路径：** `/storage/emulated/0/lebang/waterimages/`
- **文件名格式：** `年月日时分秒.jpg`（例如：`20241228235959.jpg`）
- **重名处理：** 自动递增最后一位数字（例如：`20241228235959.jpg` → `20241228235950.jpg` → `20241228235951.jpg`）
- **媒体库刷新：** 保存后自动刷新系统媒体库，确保其他APP能立即读取

---

## 🔑 权限要求

### manifest.json 配置

已配置的权限：
```json
{
  "android": {
    "permissions": [
      "<uses-permission android:name=\"android.permission.READ_EXTERNAL_STORAGE\"/>",
      "<uses-permission android:name=\"android.permission.WRITE_EXTERNAL_STORAGE\"/>",
      "<uses-permission android:name=\"android.permission.READ_MEDIA_IMAGES\"/>"
    ]
  }
}
```

### 权限说明

- **READ_EXTERNAL_STORAGE** - 读取存储（Android 6.0-12）
- **WRITE_EXTERNAL_STORAGE** - 写入存储（Android 6.0-12）
- **READ_MEDIA_IMAGES** - 读取图片（Android 13+）

---

## 💾 保存流程

### 完整流程

1. **用户点击"保存图片"**
2. **显示 Loading**："保存中..."
3. **检查/创建目录**：`/storage/emulated/0/lebang/waterimages/`
4. **生成文件名**：根据用户选择的时间生成（不是当前时间）
5. **检查文件名重复**：如果存在，递增最后一位数字
6. **复制文件**：从临时目录复制到目标目录
7. **🔑 刷新媒体库**：发送媒体扫描广播，让系统更新文件索引
8. **显示结果**：
   - 成功："保存成功"
   - 失败："保存失败"

### 文件名示例

```
用户选择时间：2024-12-28 23:59:30
生成文件名：20241228235930.jpg

如果文件已存在：
20241228235930.jpg → 已存在
20241228235931.jpg → 使用这个
```

---

## 📂 目录结构

```
/storage/emulated/0/
└── lebang/
    └── waterimages/
        ├── 20241228100530.jpg
        ├── 20241228143020.jpg
        ├── 20241228235959.jpg
        └── ...
```

---

## 🔄 媒体库刷新机制

### 为什么需要刷新媒体库？

**问题现象：**
- 图片已保存到 `/storage/emulated/0/lebang/waterimages/`
- 使用文件管理器可以看到文件
- **但其他APP读取不到这个文件**
- 手动移动文件后，其他APP就能读取了

**原因分析：**

Android 系统使用 **MediaStore** 数据库来管理媒体文件（图片、视频、音频）。

- 其他APP通常通过 MediaStore API 读取图片列表
- 当你通过文件系统API（`plus.io`）直接保存文件时，MediaStore 数据库**不会自动更新**
- 所以其他APP查询 MediaStore 时，查不到你刚保存的文件
- 手动移动文件会触发系统的媒体扫描，所以能被识别

### 解决方案：发送媒体扫描广播

保存文件后，发送 `ACTION_MEDIA_SCANNER_SCAN_FILE` 广播，通知系统更新媒体库：

```javascript
scanMediaFile(filePath, callback) {
    const Intent = plus.android.importClass('android.content.Intent')
    const Uri = plus.android.importClass('android.net.Uri')
    const File = plus.android.importClass('java.io.File')
    
    const file = new File(filePath)
    const uri = Uri.fromFile(file)
    
    const intent = new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE)
    intent.setData(uri)
    main.sendBroadcast(intent)
}
```

### 效果

- ✅ 保存完成后，立即刷新媒体库
- ✅ 其他APP可以立即读取到新文件
- ✅ 无需手动移动文件

---

## ⚠️ 注意事项

### 1. 首次使用需要授予权限

- APP 首次运行时，需要在系统设置中授予存储权限
- 路径：设置 → 应用 → [应用名] → 权限 → 存储

### 2. 目录自动创建

- 如果 `/lebang/waterimages/` 目录不存在，会自动创建
- 包括递归创建父目录

### 3. 文件名基于用户选择的时间

- **不是**保存时的当前时间
- **是**用户在界面上选择的日期和时间
- 格式：`YYYYMMDDHHMMSS.jpg`

### 4. 重名处理（智能递增）

**场景：** 同一秒内保存多张图片，文件名会重复

**处理逻辑：**
1. 检查文件是否存在
2. 如果存在，取文件名最后一位字符
3. 如果是数字（0-9），则 +1 并循环（9→0）
4. 如果不是数字，则在末尾添加 `1`
5. 递归检查，直到找到可用文件名

**示例：**
```
原始文件名：20241228235959.jpg

第1次保存：20241228235959.jpg  ✅（不存在，直接保存）
第2次保存：20241228235959.jpg  ❌（已存在）
          → 20241228235950.jpg  ✅（可用）
第3次保存：20241228235950.jpg  ❌（已存在）
          → 20241228235951.jpg  ✅（可用）
...
第11次保存：20241228235959.jpg  ❌（已存在）
           → 20241228235950.jpg  ❌（已存在）
           → 20241228235951.jpg  ❌（已存在）
           → ...
           → 20241228235959.jpg  ❌（循环回来了）
```

**注意：** 
- 如果 0-9 都被占用，会再次循环
- 理论上最多同一秒可以保存 10 张不同文件名的图片

---

## 🐛 常见问题

### Q1: 保存失败，提示"创建目录失败"

**原因：** 没有存储权限

**解决：**
1. 打开手机设置
2. 找到应用管理
3. 找到本应用
4. 权限管理
5. 开启"存储"权限

---

### Q2: 保存失败，提示"文件复制失败"

**可能原因：**
- 存储空间不足
- 临时文件已被删除
- 权限不足

**解决：**
1. 检查手机存储空间
2. 重新生成水印
3. 检查权限设置

---

### Q3: 找不到保存的图片

**位置：**
使用文件管理器查看：
```
内部存储 → lebang → waterimages
```

或使用 PC 连接手机后访问：
```
手机存储\lebang\waterimages
```

---

### Q4: 图片保存成功了，但其他APP读取不到

**问题描述：**
- 文件管理器能看到图片
- 但另一个APP读取不到这个目录的图片
- 手动移动文件后，其他APP就能读取了

**原因：** 
- 系统的媒体库（MediaStore）没有更新
- 其他APP通常通过 MediaStore API 读取图片列表
- 直接保存文件不会自动触发媒体库更新

**解决：** 
- ✅ **已自动修复**：保存后会自动发送媒体扫描广播
- 其他APP现在可以**立即读取**到新保存的文件
- 无需手动移动文件

**验证方法：**
1. 保存一张水印图片
2. 查看保存状态显示："✅ 媒体库已更新"
3. 立即打开其他APP
4. 应该能看到刚保存的图片

---

### Q4: 为什么不保存到相册？

**原因：**
- 相册会混入大量图片
- 自定义目录便于管理和查找
- 避免与个人照片混淆

**优势：**
- 统一管理工作图片
- 易于批量操作
- 不占用相册空间

---

## 🔧 技术细节

### 代码实现

**关键方法：**
```javascript
saveImageToCustomPath() {
  // 1. 获取存储路径
  const basePath = '/storage/emulated/0/lebang/waterimages'
  
  // 2. 生成文件名（基于用户选择的时间）
  const fileName = this.generateTimestampFileName()
  
  // 3. 递归创建目录
  createDirRecursive(basePath, ...)
  
  // 4. 检查文件名重复
  getUniqueFileName(fileName, ...)
  
  // 5. 复制文件
  entry.copyTo(dirEntry, finalFileName, ...)
}
```

### 文件名生成

```javascript
generateTimestampFileName() {
  // 使用用户选择的日期和时间
  const dateStr = this.formData.date // YYYY-MM-DD
  const [year, month, day] = dateStr.split('-')
  const hour = this.formData.time.hour
  const minute = this.formData.time.minute
  const second = this.formData.time.second
  
  return `${year}${month}${day}${hour}${minute}${second}.jpg`
}
```

---

## ✅ 测试检查清单

### 功能测试

- [ ] 首次使用，授予权限后能正常保存
- [ ] 目录不存在时能自动创建
- [ ] 文件名格式正确（年月日时分秒）
- [ ] 重名时能自动处理
- [ ] 保存成功显示提示
- [ ] 保存失败显示错误

### 文件验证

- [ ] 文件保存在正确的目录
- [ ] 文件名与选择的时间一致
- [ ] 文件可以正常打开
- [ ] 图片内容完整（包含水印和二维码）

---

## 📝 维护说明

### 修改保存路径

如需修改保存路径，在 `saveImageToCustomPath()` 方法中修改：

```javascript
const basePath = `${storagePath}/你的目录/子目录`
```

### 修改文件名格式

如需修改文件名格式，在 `generateTimestampFileName()` 方法中修改：

```javascript
return `自定义前缀_${year}${month}${day}_${hour}${minute}${second}.jpg`
```

---

## 🎯 优势

### 相比保存到相册

✅ **目录统一** - 所有水印图片在一个位置  
✅ **易于管理** - 方便批量操作  
✅ **不混淆** - 不会与个人照片混在一起  
✅ **文件名清晰** - 时间戳格式，一目了然  

### 相比随机路径

✅ **固定位置** - 用户知道在哪找  
✅ **可预测** - 便于脚本处理  
✅ **有序命名** - 按时间排序  

---

**更新时间：** 2024-12-29 00:05  
**状态：** ✅ 已实现并测试

