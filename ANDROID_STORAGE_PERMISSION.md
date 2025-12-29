# Android 10+ 存储权限配置说明

## 📱 问题说明

在 Android 10（API 29）及以上版本中，Google 引入了**分区存储（Scoped Storage）**机制，限制应用对外部存储的直接访问。

要保存文件到 `/storage/emulated/0/lebang/waterimages/`，需要申请特殊权限。

---

## 🔑 解决方案：申请"所有文件访问权限"

### 1. manifest.json 配置

已添加以下权限：

```json
"permissions": [
  // ... 其他权限 ...
  "<uses-permission android:name=\"android.permission.MANAGE_EXTERNAL_STORAGE\"/>"
]
```

**权限说明：**
- `MANAGE_EXTERNAL_STORAGE`：所有文件访问权限（Android 11+）
- `WRITE_EXTERNAL_STORAGE`：写入外部存储权限（Android 10 及以下）
- `READ_EXTERNAL_STORAGE`：读取外部存储权限

---

### 2. 代码实现

#### Android 版本判断

```javascript
const Build = plus.android.importClass('android.os.Build')
const sdkInt = Build.VERSION.SDK_INT

if (sdkInt >= 30) {
  // Android 11+ 使用 MANAGE_EXTERNAL_STORAGE
} else {
  // Android 10 及以下使用 WRITE_EXTERNAL_STORAGE
}
```

#### Android 11+ 权限检查

```javascript
const Environment = plus.android.importClass('android.os.Environment')
const hasPermission = Environment.isExternalStorageManager()
```

#### 跳转到设置页面

```javascript
const Intent = plus.android.importClass('android.content.Intent')
const Settings = plus.android.importClass('android.provider.Settings')
const Uri = plus.android.importClass('android.net.Uri')

const intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
const uri = Uri.parse('package:' + main.getPackageName())
intent.setData(uri)
main.startActivity(intent)
```

---

## 🎯 工作流程

### 首次保存时

1. **用户点击"保存图片"**
2. **检查 Android 版本**
3. **Android 11+：**
   - 检查是否有"所有文件访问权限"
   - 如果没有 → 弹出提示框
   - 用户点击"去设置" → 跳转到系统设置页面
   - 用户开启"允许访问所有文件" → 返回应用
   - 再次点击"保存图片" → 成功保存

4. **Android 10 及以下：**
   - 检查是否有 `WRITE_EXTERNAL_STORAGE` 权限
   - 如果没有 → 弹出系统权限请求对话框
   - 用户允许 → 直接保存

### 已授权后

- 直接保存到 `/storage/emulated/0/lebang/waterimages/`
- 无需再次请求权限

---

## 📝 用户操作指南

### Android 11+ 授权步骤

1. 点击"保存图片"
2. 看到提示框："需要授予权限"
3. 点击"去设置"
4. 在设置页面中找到"允许访问所有文件"开关
5. **开启开关**
6. 返回应用
7. 再次点击"保存图片"
8. 保存成功！

### 设置页面截图说明

```
┌─────────────────────────────────┐
│  所有文件访问权限                 │
│                                  │
│  牛马工具箱                       │
│                                  │
│  允许访问所有文件  ⭘ → ⦿        │  ← 开启此开关
│                                  │
│  警告：允许此应用访问设备上的     │
│  所有文件。请谨慎授权。           │
└─────────────────────────────────┘
```

---

## ⚠️ 注意事项

### 1. Google Play 商店限制

Google Play 对 `MANAGE_EXTERNAL_STORAGE` 权限审核非常严格。

**仅以下类型应用可以使用：**
- 文件管理器
- 备份和恢复应用
- 防病毒应用
- 文档管理应用

**如果你的应用在 Google Play 上架：**
- 可能会被拒绝
- 需要提供详细的使用说明和理由

**替代方案：**
- 使用应用专属目录：`/Android/data/[包名]/files/`
- 使用 MediaStore API 保存到公共媒体目录

**如果只在国内应用商店或企业内部使用：**
- ✅ 无影响，可以正常使用

---

### 2. Android 版本差异

| Android 版本 | API 级别 | 权限要求 | 申请方式 |
|-------------|---------|---------|---------|
| 9 及以下 | ≤ 28 | WRITE_EXTERNAL_STORAGE | 动态申请 |
| 10 | 29 | WRITE_EXTERNAL_STORAGE | 动态申请 |
| 11+ | ≥ 30 | MANAGE_EXTERNAL_STORAGE | 跳转设置 |

---

### 3. 权限被拒绝的情况

**用户点击"取消"：**
- 不会保存文件
- 不会弹出任何错误提示

**用户去设置但没有开启权限：**
- 返回应用后，再次点击"保存图片"
- 会再次弹出权限请求

**建议优化：**
可以监听应用回到前台事件，自动检测权限状态：

```javascript
// 应用回到前台时重新检查权限
plus.globalEvent.addEventListener('resume', () => {
  // 自动检查权限并保存
})
```

---

## 🔍 调试信息

### 控制台日志

保存时会输出以下日志：

```
Android SDK 版本: 31
是否有所有文件访问权限: false
```

或

```
Android SDK 版本: 29
WRITE_EXTERNAL_STORAGE 权限状态: 0
```

**权限状态说明：**
- `0`：已授予
- `-1`：未授予

---

### 屏幕状态显示

点击"保存图片"后，屏幕上会显示详细状态：

```
📋 保存状态

📱 开始保存...
源文件: _doc/.../temp.jpg

📁 目标目录: /storage/emulated/0/lebang/waterimages/
📄 文件名: 20241229120000.jpg

🔄 检查目录...
✅ 目录已存在

🔄 开始复制文件...
✅ 保存成功！
📍 完整路径: /storage/emulated/0/lebang/waterimages/20241229120000.jpg
```

---

## 🚀 测试步骤

### 1. 首次安装测试

1. 卸载旧版本 APK（如果有）
2. 安装新版本 APK
3. 生成水印
4. 点击"保存图片"
5. **应该弹出权限请求对话框**
6. 点击"去设置"
7. 开启"允许访问所有文件"
8. 返回应用
9. 再次点击"保存图片"
10. **应该保存成功**

### 2. 已授权测试

1. 生成水印
2. 点击"保存图片"
3. **应该直接保存成功，无需再次授权**

### 3. 文件验证

使用文件管理器查看：
```
内部存储 → lebang → waterimages → [时间戳].jpg
```

或连接电脑查看：
```
手机存储\lebang\waterimages\[时间戳].jpg
```

---

## 📚 参考资料

### 官方文档

- [Android 官方 - 管理存储设备上的所有文件](https://developer.android.com/training/data-storage/manage-all-files)
- [DCloud - Android平台应用启用targetSdkVersion=29+注意事项](https://ask.dcloud.net.cn/article/36199)
- [UniApp - 5+ App权限判断和提示](https://www.html5plus.org/doc/zh_cn/android.html#plus.android.checkPermission)

### 错误码参考

- 错误码 15：`INVALID_MODIFICATION_ERR` - targetSdkVersion >= 29 且 Android 10+ 不支持当前路径

---

## 💡 未来优化建议

### 1. 添加权限状态监听

应用回到前台时自动检查权限并继续保存操作。

### 2. 优化用户体验

```javascript
// 记住用户的选择
if (userCancelledBefore) {
  uni.showToast({
    title: '需要先授予存储权限',
    icon: 'none'
  })
}
```

### 3. 提供降级方案

如果用户拒绝授权，提供"保存到相册"的备选方案：

```javascript
if (!hasPermission) {
  uni.showModal({
    content: '可以选择保存到相册',
    success: (res) => {
      if (res.confirm) {
        uni.saveImageToPhotosAlbum({
          filePath: this.resultImage
        })
      }
    }
  })
}
```

---

## ✅ 当前实现总结

- ✅ 支持 Android 9-14 所有版本
- ✅ 自动判断 Android 版本并使用对应权限
- ✅ Android 11+ 自动跳转到设置页面
- ✅ Android 10 及以下动态申请权限
- ✅ 保存路径：`/storage/emulated/0/lebang/waterimages/`
- ✅ 文件名格式：`年月日时分秒.jpg`
- ✅ 屏幕实时显示保存状态

**完全符合你的需求！** 🎉

