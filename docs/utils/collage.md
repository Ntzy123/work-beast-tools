# 拼图工具 API

将多张图片拼合成一张拼图，纯客户端 Canvas 渲染，无需后端。

## 安装

`src/utils/collage.js` 已内置在项目中，直接 import 即可。

## 导出方法

### `renderCollage(opts)`

核心渲染函数，将图片按模板绘制到 Canvas 并导出为临时文件。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `opts.canvasId` | `string` | 是 | Canvas 组件的 id |
| `opts.images` | `string[]` | 是 | 图片路径数组（由 `uni.chooseImage` 等获得） |
| `opts.template` | `number[][]` | 是 | 模板归一化坐标，格式 `[[left,top,width,height],...]` |
| `opts.width` | `number` | 是 | 输出图片宽度（px） |
| `opts.height` | `number` | 是 | 输出图片高度（px） |
| `opts.thisArg` | `object` | 否 | `createCanvasContext` 的 `this` 指向（组件内必传） |
| `opts.borderWidth` | `number` | 否 | 格子边框宽度，默认 `2` |
| `opts.borderColor` | `string` | 否 | 格子边框颜色，默认 `'#ffffff'` |

**返回值**: `Promise<string>` — 临时文件路径 `tempFilePath`

**示例**:

```js
import { renderCollage, TEMPLATES } from '@/utils/collage'

const tempPath = await renderCollage({
    canvasId: 'myCanvas',
    images: ['/path/1.jpg', '/path/2.jpg', '/path/3.jpg'],
    template: TEMPLATES[3][0],    // 3 张图片，第 0 套模板
    width: 1080,
    height: 1440,
    thisArg: this,
})
// tempPath → "file:///tmp/.../collage_xxx.png"
```

### `saveToAlbum(filePath)`

将临时图片保存到系统相册。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `filePath` | `string` | 是 | `renderCollage` 返回的临时路径 |

**返回值**: `Promise<void>`

```js
import { saveToAlbum } from '@/utils/collage'
await saveToAlbum(tempPath)
```

## 模板数据

### `TEMPLATES`

`TEMPLATES[n]` 返回 n 张图片的所有可用模板数组，每套模板是归一化坐标的数组。

```js
TEMPLATES[3]   // 3 张图片的模板列表
TEMPLATES[3][0]  // 第 0 套：上一下二
// → [[0, 0, 1, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]]
```

**支持的图片数量**: 2 ~ 9 张。

| 张数 | 模板 | 样式 |
|------|------|------|
| 2 | 3 套 | 左右各半 / 上下各半 / 左大右小 |
| 3 | 3 套 | 上一下二 / 左一右二 / 上二下一 |
| 4 | 3 套 | 田字格 / 上一下三 / 左一右三 |
| 5 | 3 套 | 上二中二下一 / 左二右三 / 上三下二 |
| 6 | 3 套 | 两行三列 / 三行两列 / 上三下三 |
| 7 | 2 套 | 上六下一 / 上二中三下二 |
| 8 | 2 套 | 四行两列 / 上三下五 |
| 9 | 2 套 | 三行三列 / 上三中二下四 |

### `TEMPLATE_NAMES`

模板的中文名称，同 TEMPLATES 结构一致。

```js
TEMPLATE_NAMES[3]  // ['上一下二', '左一右二', '上二下一']
```

## 比例数据

### `RATIOS`

```js
RATIOS  // [{ label: '2:3', value: '2:3' }, ...]
```

### `RATIO_MAP`

映射到宽高比数值。

```js
RATIO_MAP['2:3']  → [2, 3]
RATIO_MAP['16:9'] → [16, 9]
```

## 在水印页面中一键拼图

```js
import { renderCollage, saveToAlbum, TEMPLATES, RATIO_MAP } from '@/utils/collage'

// 选择多张图片后
uni.chooseImage({
    count: 6,
    success: async (res) => {
        const [rw, rh] = RATIO_MAP['1:1']
        const size = 1080
        const w = size * rw / Math.min(rw, rh)
        const h = size * rh / Math.min(rw, rh)

        const collagePath = await renderCollage({
            canvasId: 'tempCanvas',
            images: res.tempFilePaths.slice(0, 6),
            template: TEMPLATES[6][0],  // 两行三列
            width: Math.round(w),
            height: Math.round(h),
            thisArg: this,
        })

        // collagePath 可进一步画水印或直接保存
        // await saveToAlbum(collagePath)
    },
})
```
