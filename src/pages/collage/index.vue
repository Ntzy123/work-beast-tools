<template>
	<view class="page">
		<!-- 状态栏占位 -->
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<!-- 头部 -->
		<view class="collage-header">
			<view class="header-left">
				<view class="back-btn" @click="goBack">
					<image src="/static/images/arrow-left.png" style="width:22px;height:22px;"></image>
				</view>
				<text class="header-title">拼图</text>
			</view>
			<view
				:class="['generate-btn-tiny', { disabled: images.length < 2 }]"
				@click="generateCollage"
			>
				<text>生成拼图</text>
			</view>
		</view>

		<!-- 大预览区 -->
		<view class="preview-wrap">
			<view class="preview-container" :style="previewContainerStyle">
				<view
					v-for="(cell, idx) in currentTemplate"
					:key="idx"
					:class="['preview-cell', { 'cell-selected': selectedCell === idx }]"
					:style="cellStyle(cell)"
					@tap="handleCellTap(idx)"
				>
					<image v-if="idx < images.length" :src="images[idx]" mode="aspectFill" class="cell-image"></image>
					<view v-else class="cell-empty">
						<text class="cell-empty-text">?</text>
					</view>
					<view v-if="selectedCell === idx" class="cell-highlight"></view>
				</view>
			</view>
		</view>

		<!-- 底部固定栏：比例 + 排版模板 -->
		<view class="bottom-bar">
			<view class="ratio-list">
				<view
					v-for="r in ratios"
					:key="r.value"
					:class="['ratio-item', { active: ratio === r.value }]"
					@click="onRatioChange(r.value)"
				>
					<text>{{ r.label }}</text>
				</view>
			</view>
			<view class="template-list" v-if="currentTemplates.length > 0">
				<view
					v-for="(tpl, tIdx) in currentTemplates"
					:key="tIdx"
					:class="['template-item', { active: templateIndex === tIdx }]"
					@click="onTemplateChange(tIdx)"
				>
					<view
						v-for="(cell, cIdx) in tpl"
						:key="cIdx"
						class="template-cell"
						:style="{ left: cell[0]*100+'%', top: cell[1]*100+'%', width: cell[2]*100+'%', height: cell[3]*100+'%' }"
					></view>
				</view>
			</view>
		</view>

		<!-- 隐藏 Canvas -->
		<canvas
			canvas-id="collageCanvas"
			:style="{ position: 'fixed', left: '-9999px', top: 0, width: canvasStyle.width+'px', height: canvasStyle.height+'px' }"
		></canvas>
	</view>
</template>

<script>
// ponytail: template data as plain arrays, no class/interface overhead
import { renderCollage, saveToAlbum, loadImageInfos, calcCollageSize, TEMPLATES, TEMPLATE_NAMES, RATIOS, RATIO_MAP } from '@/utils/collage'

export default {
	data() {
		return {
			statusBarHeight: 0,
			windowHeight: 0,
			images: [],
			ratio: '2:3',
			templateIndex: 0,
			selectedCell: null,
			canvasStyle: { width: 300, height: 300 },
			generating: false,
		}
	},
	computed: {
		ratios() { return RATIOS },
		currentTemplates() {
			return TEMPLATES[this.images.length] || []
		},
		currentTemplate() {
			const tpls = TEMPLATES[this.images.length]
			if (!tpls) return []
			const idx = Math.min(this.templateIndex, tpls.length - 1)
			return tpls[idx] || []
		},
		templateNames() { return TEMPLATE_NAMES },
		previewWidth() {
			const sys = uni.getSystemInfoSync()
			return sys.windowWidth - 32
		},
		previewContainerStyle() {
			const [rw, rh] = RATIO_MAP[this.ratio]
			const pw = this.previewWidth
			const maxH = this.windowHeight - this.statusBarHeight - 44 - 170 // 总可用高度
			const isPortrait = rh > rw
			if (isPortrait) {
				// 竖向：以3:4(最宽竖向)为基准固定高度，宽度等比
				const baseH = Math.round(pw * 4 / 3)
				const h = Math.min(baseH, maxH - 20)
				const w = h * rw / rh
				return { width: Math.round(w) + 'px', height: Math.round(h) + 'px' }
			} else {
				// 横向：横向顶满，高度等比
				const w = pw
				const h = w * rh / rw
				if (h > maxH) {
					const ch = maxH
					const cw = ch * rw / rh
					return { width: Math.round(cw) + 'px', height: Math.round(ch) + 'px' }
				}
				return { width: Math.round(w) + 'px', height: Math.round(h) + 'px' }
			}
		},
	},
	watch: {
		'images.length'(newLen) {
			const tpls = TEMPLATES[newLen]
			if (tpls && this.templateIndex >= tpls.length) {
				this.templateIndex = 0
			}
			this.selectedCell = null
		},
	},
	onLoad() {
		const sys = uni.getSystemInfoSync()
		this.statusBarHeight = sys.statusBarHeight || 0
		this.windowHeight = sys.windowHeight

		const app = getApp()
		if (app.globalData && app.globalData.collageImages && app.globalData.collageImages.length >= 2) {
			this.images = app.globalData.collageImages
			app.globalData.collageImages = null
		} else {
			uni.showToast({ title: '请通过首页进入拼图', icon: 'none' })
			setTimeout(() => uni.navigateBack(), 500)
		}
	},
	methods: {
		goBack() {
			uni.navigateBack()
		},
		cellStyle(cell) {
			return {
				left: cell[0] * 100 + '%',
				top: cell[1] * 100 + '%',
				width: cell[2] * 100 + '%',
				height: cell[3] * 100 + '%',
			}
		},
		onRatioChange(val) {
			this.ratio = val
			this.selectedCell = null
		},
		onTemplateChange(idx) {
			this.templateIndex = idx
			this.selectedCell = null
		},
		handleCellTap(idx) {
			if (idx >= this.images.length) return
			if (this.selectedCell === null) {
				this.selectedCell = idx
			} else if (this.selectedCell === idx) {
				this.selectedCell = null
			} else {
				const arr = [...this.images]
				const tmp = arr[this.selectedCell]
				arr[this.selectedCell] = arr[idx]
				arr[idx] = tmp
				this.images = arr
				this.selectedCell = null
			}
		},
		async generateCollage() {
			if (this.images.length < 2 || this.generating) return
			this.generating = true
			uni.showLoading({ title: '生成中...' })

			try {
				const tpl = TEMPLATES[this.images.length]?.[this.templateIndex]
				if (!tpl) throw new Error('模板数据异常')

				// 加载原图信息，按分辨率计算输出尺寸
				const infos = await loadImageInfos(this.images)
				const [rw, rh] = RATIO_MAP[this.ratio]
				const { width: canvasW, height: canvasH } = calcCollageSize(infos, tpl, rw, rh)
				this.canvasStyle = { width: canvasW, height: canvasH }

				const tempPath = await renderCollage({
					canvasId: 'collageCanvas',
					images: this.images,
					infos,
					template: tpl,
					width: canvasW,
					height: canvasH,
					thisArg: this,
				})

				uni.hideLoading()

				// 保存到相册
				try {
					await saveToAlbum(tempPath)
					uni.showToast({ title: '已保存到相册', icon: 'success', duration: 2000 })
					setTimeout(() => uni.navigateBack(), 100)
				} catch (saveErr) {
					// #ifdef H5
					const link = document.createElement('a')
					link.href = tempPath
					link.download = 'collage.png'
					link.click()
					uni.showToast({ title: '已开始下载', icon: 'none', duration: 2000 })
					setTimeout(() => uni.navigateBack(), 100)
					// #endif
					// #ifndef H5
					if (saveErr.errMsg && saveErr.errMsg.includes('auth')) {
						uni.showModal({
							title: '提示',
							content: '需要相册权限才能保存',
							success: (modal) => {
								if (modal.confirm) {
									// #ifdef APP-PLUS
									uni.openSetting()
									// #endif
								}
							},
						})
					} else {
						uni.showToast({ title: '保存失败', icon: 'none', duration: 2000 })
					}
					// #endif
				}

				this.generating = false
			} catch (err) {
				console.error('拼图生成失败:', err)
				uni.hideLoading()
				uni.showToast({ title: '生成失败，请重试', icon: 'none', duration: 2000 })
				this.generating = false
			}
		},
	},
}
</script>

<style lang="scss" scoped>
$bg: #f5f5f7;
$card: #ffffff;
$text: #1c1c1e;
$subtext: #8e8e93;
$primary: #7c5cfc;
$radius: 14px;

.page {
	min-height: 100vh;
	background: $bg;
	box-sizing: border-box;
	overflow-x: hidden;
	display: flex;
	flex-direction: column;
}
.status-bar { width: 100%; background: transparent; flex-shrink: 0; }

/* Header */
.collage-header {
	padding: 12px 16px 0;
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-shrink: 0;
}
.header-left {
	display: flex;
	align-items: center;
	gap: 8px;
}
.back-btn {
	width: 32px; height: 32px;
	display: flex; align-items: center; justify-content: center;
	color: $text;
	background: none;
	border: none;
	opacity: 0.6;
}
.back-btn:active { opacity: 1; }
.header-title {
	font-size: 18px;
	font-weight: 700;
	color: $text;
}
.generate-btn-tiny {
	padding: 6px 16px;
	border-radius: 16px;
	background: linear-gradient(135deg, #7c5cfc 0%, #a78bfa 100%);
	color: #fff;
	font-size: 13px;
	font-weight: 600;
	transition: all 0.2s;
}
.generate-btn-tiny:active { opacity: 0.85; transform: scale(0.95); }
.generate-btn-tiny.disabled {
	opacity: 0.4;
	pointer-events: none;
}

/* Preview */
.preview-wrap {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	overflow: hidden;
}
.preview-container {
	position: relative;
	background: #fff;
	overflow: hidden;
	flex-shrink: 0;
}
.preview-cell {
	position: absolute;
	overflow: hidden;
}
.cell-image {
	width: 100%;
	height: 100%;
}
.cell-empty {
	width: 100%;
	height: 100%;
	background: #444;
	display: flex;
	align-items: center;
	justify-content: center;
}
.cell-empty-text {
	font-size: 24px;
	color: #666;
	font-weight: 700;
}
.cell-highlight {
	position: absolute;
	top: 0; left: 0; right: 0; bottom: 0;
	border: 3px solid $primary;
	box-sizing: border-box;
	z-index: 2;
	box-shadow: inset 0 0 8px rgba($primary, 0.4);
}
.cell-selected {
	z-index: 1;
}


/* Bottom bar (~1/4屏估算) */
.bottom-bar {
	flex-shrink: 0;
	padding: 22px 16px;
	padding-bottom: calc(77px + env(safe-area-inset-bottom, 12px));
	background: $card;
	border-top: 1px solid #e8e8ed;
}

/* Ratio */
.ratio-list {
	display: flex;
	flex-wrap: nowrap;
	gap: 8px;
	overflow-x: auto;
	padding-bottom: 30px;
	scrollbar-width: none;
	-ms-overflow-style: none;
}
.ratio-list::-webkit-scrollbar,
.template-list::-webkit-scrollbar {
	display: none;
}
.ratio-item {
	flex-shrink: 0;
	padding: 6px 16px;
	border-radius: 16px;
	font-size: 13px;
	font-weight: 500;
	color: $text;
	background: #f0f0f5;
	border: 1px solid #e5e5ea;
	transition: all 0.2s;
}
.ratio-item.active {
	background: $primary;
	color: #fff;
	border-color: $primary;
}
.ratio-item:active { transform: scale(0.95); }

/* Template */
.template-list {
	display: flex;
	flex-wrap: nowrap;
	gap: 8px;
	overflow-x: auto;
	scrollbar-width: none;
	-ms-overflow-style: none;
}
.template-item {
	flex-shrink: 0;
	width: 46px;
	height: 46px;
	position: relative;
	border-radius: 8px;
	background: #f0f0f5;
	border: 2px solid transparent;
	overflow: hidden;
	box-sizing: border-box;
	transition: all 0.2s;
}
.template-item.active {
	border-color: $primary;
}
.template-cell {
	position: absolute;
	background: #c7c7cc;
	border: 1px solid #fff;
	box-sizing: border-box;
}
</style>
