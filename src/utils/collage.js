/**
 * 拼图排版引擎
 * 纯函数工具，不依赖页面状态，其他页面可直接调用
 */

// ── 模板数据 ──────────────────────────────────────────
export const TEMPLATES = {
	2: [
		[[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]],
		[[0, 0, 1, 0.5], [0, 0.5, 1, 0.5]],
		[[0, 0, 0.6, 1], [0.6, 0, 0.4, 1]],
	],
	3: [
		[[0, 0, 1, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]],
		[[0, 0, 0.5, 1], [0.5, 0, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]],
		[[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 1, 0.5]],
	],
	4: [
		[[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]],
		[[0, 0, 1, 0.4], [0, 0.4, 0.33, 0.6], [0.33, 0.4, 0.33, 0.6], [0.66, 0.4, 0.33, 0.6]],
		[[0, 0, 0.4, 1], [0.4, 0, 0.6, 0.33], [0.4, 0.33, 0.6, 0.33], [0.4, 0.66, 0.6, 0.34]],
	],
	5: [
		[[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.33, 0.5], [0.33, 0.5, 0.33, 0.5], [0.66, 0.5, 0.33, 0.5]],
		[[0, 0, 0.33, 0.5], [0.33, 0, 0.33, 0.5], [0.66, 0, 0.33, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]],
		[[0, 0, 1, 0.33], [0, 0.33, 0.5, 0.33], [0.5, 0.33, 0.5, 0.33], [0, 0.66, 0.33, 0.34], [0.33, 0.66, 0.33, 0.34]],
	],
	6: [
		[[0, 0, 0.33, 0.5], [0.33, 0, 0.33, 0.5], [0.66, 0, 0.33, 0.5], [0, 0.5, 0.33, 0.5], [0.33, 0.5, 0.33, 0.5], [0.66, 0.5, 0.33, 0.5]],
		[[0, 0, 0.5, 0.33], [0.5, 0, 0.5, 0.33], [0, 0.33, 0.5, 0.33], [0.5, 0.33, 0.5, 0.33], [0, 0.66, 0.5, 0.33], [0.5, 0.66, 0.5, 0.33]],
		[[0, 0, 1, 0.33], [0, 0.33, 0.33, 0.33], [0.33, 0.33, 0.33, 0.33], [0.66, 0.33, 0.33, 0.33], [0, 0.66, 0.5, 0.34], [0.5, 0.66, 0.5, 0.34]],
	],
	7: [
		[[0, 0, 0.33, 0.33], [0.33, 0, 0.33, 0.33], [0.66, 0, 0.33, 0.33], [0, 0.33, 0.33, 0.33], [0.33, 0.33, 0.33, 0.33], [0.66, 0.33, 0.33, 0.33], [0, 0.66, 1, 0.34]],
		[[0, 0, 0.5, 0.33], [0.5, 0, 0.5, 0.33], [0, 0.33, 0.33, 0.33], [0.33, 0.33, 0.33, 0.33], [0.66, 0.33, 0.33, 0.33], [0, 0.66, 0.5, 0.34], [0.5, 0.66, 0.5, 0.34]],
	],
	8: [
		[[0, 0, 0.5, 0.25], [0.5, 0, 0.5, 0.25], [0, 0.25, 0.5, 0.25], [0.5, 0.25, 0.5, 0.25], [0, 0.5, 0.5, 0.25], [0.5, 0.5, 0.5, 0.25], [0, 0.75, 0.5, 0.25], [0.5, 0.75, 0.5, 0.25]],
		[[0, 0, 0.33, 0.5], [0.33, 0, 0.33, 0.5], [0.66, 0, 0.33, 0.5], [0, 0.5, 0.25, 0.5], [0.25, 0.5, 0.25, 0.5], [0.5, 0.5, 0.25, 0.5], [0.75, 0.5, 0.25, 0.5], [0.66, 0, 0.34, 0.5]],
	],
	9: [
		[[0, 0, 0.33, 0.33], [0.33, 0, 0.33, 0.33], [0.66, 0, 0.33, 0.33], [0, 0.33, 0.33, 0.33], [0.33, 0.33, 0.33, 0.33], [0.66, 0.33, 0.33, 0.33], [0, 0.66, 0.33, 0.33], [0.33, 0.66, 0.33, 0.33], [0.66, 0.66, 0.33, 0.33]],
		[[0, 0, 0.33, 0.3], [0.33, 0, 0.33, 0.3], [0.66, 0, 0.33, 0.3], [0.25, 0.3, 0.25, 0.35], [0.5, 0.3, 0.25, 0.35], [0, 0.65, 0.25, 0.35], [0.25, 0.65, 0.25, 0.35], [0.5, 0.65, 0.25, 0.35], [0.75, 0.65, 0.25, 0.35]],
	],
}

export const TEMPLATE_NAMES = {
	2: ['左右各半', '上下各半', '左大右小'],
	3: ['上一下二', '左一右二', '上二下一'],
	4: ['田字格', '上一下三', '左一右三'],
	5: ['上二中二下一', '左二右三', '上三下二'],
	6: ['两行三列', '三行两列', '上三下三'],
	7: ['上六下一', '上二中三下二'],
	8: ['四行两列', '上三下五'],
	9: ['三行三列', '上三中二下四'],
}

export const RATIOS = [
	{ label: '2:3', value: '2:3' },
	{ label: '3:4', value: '3:4' },
	{ label: '9:16', value: '9:16' },
	{ label: '1:2', value: '1:2' },
	{ label: '1:1', value: '1:1' },
	{ label: '3:2', value: '3:2' },
	{ label: '4:3', value: '4:3' },
	{ label: '16:9', value: '16:9' },
]

export const RATIO_MAP = { '1:1': [1,1], '3:4': [3,4], '4:3': [4,3], '9:16': [9,16], '16:9': [16,9], '2:3': [2,3], '1:2': [1,2], '3:2': [3,2] }

// ── 尺寸计算 ──────────────────────────────────────────

/**
 * 加载图片信息
 * @param {string[]} images - 图片路径数组
 * @returns {Promise<object[]>}
 */
export function loadImageInfos(images) {
	return Promise.all(
		images.map((src) => new Promise((resolve, reject) => {
			uni.getImageInfo({ src, success: resolve, fail: reject })
		}))
	)
}

/**
 * 根据原图分辨率 × 模板计算输出尺寸
 * 保证每张图在格子内满分辨率渲染
 * @param {object[]} infos      - 图片信息 [{width, height}, ...]
 * @param {number[][]} template - 模板归一化坐标
 * @param {number} rw           - 比例宽
 * @param {number} rh           - 比例高
 * @returns {{ width: number, height: number }}
 */
export function calcCollageSize(infos, template, rw, rh) {
	const cellAspect = rw / rh
	const isPortrait = rh > rw
	let primary = 0

	for (let i = 0; i < Math.min(infos.length, template.length); i++) {
		const img = infos[i]
		const [, , nw, nh] = template[i]
		const imgAspect = img.width / img.height

		if (isPortrait) {
			// 竖向：高度是主维度
			if (imgAspect >= cellAspect) {
				// 图片比格子宽 → 填满格子高度
				primary = Math.max(primary, img.height / nh)
			} else {
				// 图片比格子高 → 填满格子宽度
				primary = Math.max(primary, img.width / nw * rh / rw)
			}
		} else {
			// 横向：宽度是主维度
			if (imgAspect >= cellAspect) {
				primary = Math.max(primary, img.height / nh * rw / rh)
			} else {
				primary = Math.max(primary, img.width / nw)
			}
		}
	}

	if (isPortrait) {
		const h = Math.round(primary)
		return { width: Math.round(h * rw / rh), height: h }
	} else {
		const w = Math.round(primary)
		return { width: w, height: Math.round(w * rh / rw) }
	}
}

// ── 核心渲染 ──────────────────────────────────────────

/**
 * 渲染拼图并导出为临时文件
 * @param {object} opts
 * @param {string}   opts.canvasId     - canvas 组件 id
 * @param {string[]} opts.images       - 图片路径数组
 * @param {number[][]} opts.template   - 模板归一化坐标 [[l,t,w,h],...]
 * @param {number} opts.width          - 输出宽度(px)
 * @param {number} opts.height         - 输出高度(px)
 * @param {object}  [opts.thisArg]     - createCanvasContext 的 this 指向
 * @param {object[]} [opts.infos]      - 已加载的图片信息（避免重复加载）
 * @param {number}  [opts.borderWidth=2]
 * @param {string}  [opts.borderColor='#ffffff']
 * @returns {Promise<string>} tempFilePath
 */
export function renderCollage(opts) {
	const {
		canvasId,
		images,
		template,
		width,
		height,
		thisArg,
		infos: externalInfos,
		borderWidth = 2,
		borderColor = '#ffffff',
	} = opts

	return new Promise(async (resolve, reject) => {
		try {
			const infos = externalInfos || await loadImageInfos(images)
			const ctx = uni.createCanvasContext(canvasId, thisArg)

			// 白底
			ctx.setFillStyle('#ffffff')
			ctx.fillRect(0, 0, width, height)
			ctx.draw(true)
			await new Promise((r) => setTimeout(r, 50))

			// 绘制每张图片（cover crop）
			for (let i = 0; i < template.length; i++) {
				if (i >= images.length) break
				const [nx, ny, nw, nh] = template[i]
				const x = Math.round(nx * width)
				const y = Math.round(ny * height)
				const w = Math.round(nw * width)
				const h = Math.round(nh * height)
				const info = infos[i]

				const imgAspect = info.width / info.height
				const regionAspect = w / h
				let sx, sy, sw, sh
				if (imgAspect > regionAspect) {
					sh = info.height
					sw = info.height * regionAspect
					sx = (info.width - sw) / 2
					sy = 0
				} else {
					sw = info.width
					sh = info.width / regionAspect
					sx = 0
					sy = (info.height - sh) / 2
				}

				ctx.drawImage(info.path, sx, sy, sw, sh, x, y, w, h)
			}

			// 格子边框
			ctx.setStrokeStyle(borderColor)
			ctx.setLineWidth(borderWidth)
			for (let i = 0; i < template.length; i++) {
				if (i >= images.length) break
				const [nx, ny, nw, nh] = template[i]
				ctx.strokeRect(
					Math.round(nx * width) + 0.5,
					Math.round(ny * height) + 0.5,
					Math.round(nw * width),
					Math.round(nh * height)
				)
			}

			// 导出
			ctx.draw(false, () => {
				uni.canvasToTempFilePath({
					canvasId,
					x: 0, y: 0,
					width, height,
					destWidth: width,
					destHeight: height,
					fileType: 'png',
					success: (res) => resolve(res.tempFilePath),
					fail: reject,
				}, thisArg)
			})
		} catch (err) {
			reject(err)
		}
	})
}

/**
 * 保存图片到系统相册
 * @param {string} filePath
 * @returns {Promise}
 */
export function saveToAlbum(filePath) {
	return new Promise((resolve, reject) => {
		uni.saveImageToPhotosAlbum({
			filePath,
			success: resolve,
			fail: reject,
		})
	})
}
