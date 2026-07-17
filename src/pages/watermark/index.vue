<template>
	<view class="page">
		<!-- 状态栏占位 -->
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<!-- 头部 -->
		<view class="watermark-header">
			<view class="header-left">
				<view class="back-btn" @click="goBack">
					<image src="/static/images/arrow-left.png" style="width:22px;height:22px;"></image>
				</view>
				<text class="header-title">添加水印</text>
			</view>
			<view class="header-right">
				<view class="collage-btn" @click="goToCollage">
					<text>拼图</text>
					<image src="/static/images/arrow-right.png" style="width:14px;height:14px;"></image>
				</view>
			</view>
		</view>

		<view class="content">
			<!-- 上传 -->
			<view class="upload-card">
				<view class="upload-area" @click="chooseImage" v-if="!imagePath && imagePaths.length === 0">
					<view class="upload-icon">
						<image src="/static/images/camera.png" style="width:28px;height:28px;"></image>
					</view>
					<text class="upload-title">点击上传图片</text>
					<text class="upload-hint">支持 JPG / PNG，最多 9 张</text>
				</view>
					<view class="image-preview" v-else-if="imagePath">
					<image :src="imagePath" mode="aspectFit" class="preview-img" @click="previewImage(imagePath)"></image>
					<view class="image-actions">
						<view class="action-link primary" @click="chooseImage">
							<image src="/static/images/refresh.png" style="width:16px;height:16px;"></image>
							重新选择
						</view>
						<view class="action-link danger" @click="removeImage">
							<image src="/static/images/delete.png" style="width:16px;height:16px;"></image>
							删除
						</view>
					</view>
				</view>
				<view class="images-preview" v-else-if="imagePaths.length > 0">
					<text class="images-count">已选择 {{ imagePaths.length }} 张照片</text>
					<view class="image-actions">
						<view class="action-link primary" @click="chooseImage">
							<image src="/static/images/refresh.png" style="width:16px;height:16px;"></image>
							重新选择
						</view>
						<view class="action-link danger" @click="removeImage">
							<image src="/static/images/delete.png" style="width:16px;height:16px;"></image>
							删除
						</view>
					</view>
				</view>
			</view>

			<!-- 姓名 -->
			<view class="section-title">姓名</view>
			<view class="form-card">
				<input 
					class="form-input" 
					v-model="formData.name"
					placeholder="请输入姓名"
					type="text"
				/>
			</view>

			<!-- 时间 -->
			<view class="section-title">时间</view>
			<view class="time-row">
				<picker mode="date" :value="formData.date" @change="onDateChange">
					<view class="time-box date-box">
						<text class="time-label">日期</text>
						<text class="time-value">{{ formatDate(formData.date) }}</text>
					</view>
				</picker>
				<picker mode="time" :value="timeValue" @change="onTimeChange">
					<view class="time-box">
						<text class="time-label">时间</text>
						<text class="time-value">{{ formatTime(formData.time) }}</text>
					</view>
				</picker>
				<picker mode="selector" :range="secondRange" :value="formData.time.second" @change="onSecondChange">
					<view class="time-box small">
						<text class="time-label">秒</text>
						<text class="time-value">{{ String(formData.time.second).padStart(2, '0') }}</text>
					</view>
				</picker>
			<view class="sync-btn" @click="syncTime">
				<image src="/static/images/refresh.png" style="width:22px;height:22px;"></image>
			</view>
			</view>

			<!-- 多图模式 -->
			<view class="section-title">多图模式</view>
			<view class="multi-row">
				<view class="multi-col">
					<picker mode="selector" :range="multiImageModeRange" :value="multiImageMode - 1" @change="onMultiImageModeChange">
						<view class="multi-box">
							<text class="time-label">倍数</text>
							<text class="time-value">×{{ multiImageMode }}</text>
						</view>
					</picker>
				</view>
				<view class="multi-col" v-if="multiImageMode > 1 || (multiImageMode === 1 && imagePaths.length > 1)">
					<view class="multi-box">
						<text class="time-label">时间跨度（分钟）</text>
						<input 
							class="time-span-input-field" 
							v-model.number="timeSpan"
							placeholder="10"
							type="digit"
						/>
					</view>
				</view>
			</view>

			<!-- 生成按钮 -->
			<button 
				class="generate-btn" 
				:class="{ disabled: !canGenerate }"
				@click="handleGenerateClick"
			>
				<image src="/static/images/water.png" style="width:18px;height:18px;margin-right:8px;"></image>
				生成水印
			</button>

			<!-- 生成结果 -->
			<view class="result-card" v-if="resultImage">
				<image :src="resultImage" mode="aspectFit" class="result-img" @click="previewImage(resultImage)"></image>
			</view>
		</view>

		<!-- 隐藏的canvas -->
		<canvas 
			canvas-id="watermarkCanvas" 
			id="watermarkCanvas"
			:style="{ 
				width: canvasWidth + 'px', 
				height: canvasHeight + 'px', 
				position: 'fixed', 
				left: '-9999px', 
				top: '-9999px', 
				pointerEvents: 'none', 
				zIndex: -1 
			}"
		></canvas>
		
		<!-- 图片预览弹窗 -->
		<view class="image-preview-modal" v-if="showPreview" @click="closePreview">
			<view class="preview-container" :class="{ 'show': showPreview }">
			<view class="preview-content" @click.stop 
				@touchstart="handleTouchStart" 
				@touchmove="handleTouchMove" 
				@touchend="handleTouchEnd"
				@mousedown="handleMouseDown"
				@mousemove="handleMouseMove"
				@mouseup="handleMouseUp">
				<image 
					:src="previewImageUrl" 
					mode="aspectFit"
					:style="{
						transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
						transition: (isDragging || isScaling) && !isSpringBack ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
					}"
					class="preview-image"
				></image>
				</view>
				<view class="preview-close-btn" @click="closePreview">
					<image src="/static/images/close.png" style="width:20px;height:20px;"></image>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import QRCode from 'qrcode'
import CryptoJS from 'crypto-js'
import staffMap from '@/utils/staffMap.json'
import piexif from 'piexifjs'
import apiConfig from '@/config/api.config.json'

export default {
	data() {
		let isH5 = false
		// #ifdef H5
		isH5 = true
		// #endif

		const now = new Date()
		const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
		const currentHour = String(now.getHours()).padStart(2, '0')
		const currentMinute = String(now.getMinutes()).padStart(2, '0')
		const currentSecond = now.getSeconds()
		
		const secondRange = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
		const multiImageModeRange = Array.from({ length: 10 }, (_, i) => i + 1)
		
		return {
			isH5,
			statusBarHeight: 0,
			imagePath: '',
			imagePaths: [],
			resultImage: '',
			timeSpan: 10,
			multiImageMode: 1,
			multiImageModeRange,
			formData: {
				name: '',
				date: currentDate,
				time: { hour: currentHour, minute: currentMinute, second: currentSecond }
			},
			secondRange,
			canvasWidth: 750,
			canvasHeight: 1334,
			fontReady: false,
			screenWidth: 411,
			watermarkScale: 1,
			referenceScreenWidth: 411,
	showPreview: false,
	previewImageUrl: '',
	scale: 1,
	initialScale: 1,
	translateX: 0,
	translateY: 0,
	isDragging: false,
	isScaling: false,
	startX: 0,
	startY: 0,
	lastTranslateX: 0,
	lastTranslateY: 0,
	startDistance: 0,
	lastScale: 1,
	nativeWheelHandler: null,
	imageWidth: 0,
	imageHeight: 0,
	containerWidth: 0,
	containerHeight: 0,
	pinchCenterX: 0,
	pinchCenterY: 0,
	isSpringBack: false,
	encryptionKey: 'e373d090928170eb'
	}
	},
	computed: {
		canGenerate() {
			const hasImage = this.imagePaths.length > 0 || !!this.imagePath
			const hasName = !!(this.formData.name && this.formData.name.trim())
			const canGen = hasImage && hasName
			return canGen
		},
		timeValue() {
			return `${this.formData.time.hour}:${this.formData.time.minute}`
		}
	},
	onLoad() {
		const systemInfo = uni.getSystemInfoSync()
		this.statusBarHeight = systemInfo.statusBarHeight || 0
		this.screenWidth = systemInfo.windowWidth
		this.watermarkScale = this.referenceScreenWidth / this.screenWidth
		const cachedKey = uni.getStorageSync('watermark_encryption_key')
		if (cachedKey) {
			this.encryptionKey = cachedKey
		} else {
		uni.setStorageSync('watermark_encryption_key', this.encryptionKey)
	}
	
	// 读取上次保存的姓名配置
	const savedConfig = uni.getStorageSync('watermark_config')
	if (savedConfig) {
		try {
			const config = JSON.parse(savedConfig)
			if (config.name) {
				this.formData.name = config.name
			}
		} catch (e) {
			// JSON 解析失败，忽略
		}
	}
	
	this.warmupCanvas()
	},
	onShow() {
		const app = getApp()
		if (app.globalData.collageSaveMsg) {
			const msg = app.globalData.collageSaveMsg
			app.globalData.collageSaveMsg = ''
			uni.showToast({ title: msg, icon: 'success', duration: 2000 })
		}
	},
	methods: {
		goBack() {
			uni.navigateBack()
		},
		goToCollage() {
			uni.chooseImage({
				count: 9,
				sizeType: ['original'],
				sourceType: ['album'],
				success: (res) => {
					if (res.tempFilePaths.length < 2) {
						uni.showToast({ title: '请至少选择 2 张图片', icon: 'none' })
						return
					}
					getApp().globalData.collageImages = res.tempFilePaths
					uni.navigateTo({ url: '/pages/collage/index' })
				},
				fail: () => {}
			})
		},
		warmupCanvas() {
			// #ifdef APP-PLUS
			this.$nextTick(() => {
				const ctx = uni.createCanvasContext('watermarkCanvas', this)
				ctx.setFontSize(20)
				ctx.font = '20px "SourceHanSerifCN"'
				ctx.fillText('预热字体', 0, 30)
				ctx.draw(false, () => {
					setTimeout(() => {
						this.fontReady = true
						console.log('Canvas 预热完成，字体已加载')
					}, 500)
				})
			})
			// #endif
			
			// #ifndef APP-PLUS
			this.fontReady = true
			// #endif
		},
		
		async waitForFont() {
			if (this.fontReady) return
			const maxWait = 3000
			const startTime = Date.now()
			while (!this.fontReady && (Date.now() - startTime < maxWait)) {
				await new Promise(resolve => setTimeout(resolve, 200))
			}
			await new Promise(resolve => setTimeout(resolve, 300))
		},
		
		async fetchKeyFromServer() {
			try {
				const config = apiConfig.watermarkKey
				const response = await new Promise((resolve, reject) => {
					uni.request({
						url: config.url,
						method: config.method,
						header: config.headers,
						success: (res) => { resolve(res) },
						fail: (err) => { reject(err) }
					})
				})
				if (response.statusCode === 200 && response.data) {
					const data = response.data
					if (data.code === 0 && data.result && data.result.key) {
						const newKey = data.result.key
						this.encryptionKey = newKey
						uni.setStorageSync('watermark_encryption_key', newKey)
						console.log('加密key已更新:', newKey)
					}
				}
			} catch (error) {
				console.log('获取加密key失败，使用缓存key:', error)
			}
		},
		
		generateRandomCoordinates() {
			const point1 = { la: 26.552515, lo: 106.732060 }
			const point2 = { la: 26.554315, lo: 106.734860 }
			const minLa = Math.min(point1.la, point2.la)
			const maxLa = Math.max(point1.la, point2.la)
			const minLo = Math.min(point1.lo, point2.lo)
			const maxLo = Math.max(point1.lo, point2.lo)
			const randomLa = minLa + Math.random() * (maxLa - minLa)
			const randomLo = minLo + Math.random() * (maxLo - minLo)
			return { la: parseFloat(randomLa.toFixed(6)), lo: parseFloat(randomLo.toFixed(6)) }
		},
		
		generateRandomStaffId() {
			const existingIds = Object.values(staffMap)
			let randomId, attempts = 0
			const maxAttempts = 100
			do {
				randomId = Math.floor(Math.random() * 9000000) + 1000000
				attempts++
			} while (existingIds.includes(randomId) && attempts < maxAttempts)
			return randomId
		},
		
		generateQRCodeText() {
			let staffId = staffMap[this.formData.name]
			if (!staffId) staffId = this.generateRandomStaffId()
			const dateStr = `${this.formData.date} ${this.formData.time.hour}:${this.formData.time.minute}:${String(this.formData.time.second).padStart(2, '0')}`
			const timestamp = Math.floor(new Date(dateStr).getTime() / 1000)
			const coords = this.generateRandomCoordinates()
			const data = { g: { c: "GCJ-02", la: coords.la, lo: coords.lo, n: "" }, n: this.formData.name, or: 2, ot: timestamp, s: staffId }
			const plainText = JSON.stringify(data, null, 0)
			const key = CryptoJS.enc.Utf8.parse(this.encryptionKey)
			const encrypted = CryptoJS.AES.encrypt(plainText, key, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 })
			const encryptedText = encrypted.toString()
			return `{"text":"${encryptedText.replace(/=/g, '\\u003d')}","version":"v1.0"}`
		},
		chooseImage() {
			uni.chooseImage({
				count: 9,
				sourceType: ['album', 'camera'],
				success: (res) => {
					if (res.tempFilePaths.length === 1) { this.imagePath = res.tempFilePaths[0]; this.imagePaths = [] }
					else { this.imagePaths = res.tempFilePaths; this.imagePath = '' }
				},
				fail: (err) => {}
			})
		},
		removeImage() { this.imagePath = ''; this.imagePaths = []; this.resultImage = '' },
		onDateChange(e) { this.formData.date = e.detail.value },
		onTimeChange(e) { const value = e.detail.value || ''; const [h, m] = value.split(':'); if (h != null && m != null) { this.formData.time.hour = String(h).padStart(2,'0'); this.formData.time.minute = String(m).padStart(2,'0') } },
		onSecondChange(e) { this.formData.time.second = parseInt(e.detail.value) },
		syncTime() { const now = new Date(); this.formData.date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`; this.formData.time = { hour: String(now.getHours()).padStart(2,'0'), minute: String(now.getMinutes()).padStart(2,'0'), second: now.getSeconds() }; uni.showToast({ title: '已同步当前时间', icon: 'success', duration: 1500 }) },
		onMultiImageModeChange(e) { this.multiImageMode = parseInt(e.detail.value) + 1 },
		formatDate(date) { if (!date) return ''; const d = new Date(date); const weekdays = ['周日','周一','周二','周三','周四','周五','周六']; return `${date} ${weekdays[d.getDay()]}` },
		formatTime(time) { if (!time) return ''; return `${time.hour}:${time.minute}` },
		handleGenerateClick() {
			const hasImage = (this.imagePaths.length > 0) || (!!this.imagePath && this.imagePath.trim && this.imagePath.trim().length > 0)
			const hasName = !!(this.formData.name && this.formData.name.trim && this.formData.name.trim().length > 0)
			if (!hasImage) { uni.showToast({ title: '请先上传图片', icon: 'none', duration: 2000 }); return }
			if (!hasName) { uni.showToast({ title: '请输入姓名', icon: 'none', duration: 2000 }); return }
			if ((this.multiImageMode > 1 || (this.multiImageMode === 1 && this.imagePaths.length > 1)) && (!this.timeSpan || this.timeSpan <= 0)) { uni.showToast({ title: '请输入时间跨度', icon: 'none', duration: 2000 }); return }
			this.generateWatermark()
		},
		async generateWatermark() {
			await this.fetchKeyFromServer()
			if (this.multiImageMode > 1) { this.generateMultiImageWatermarks() }
			else if (this.imagePaths.length > 1) { this.generateBatchWatermarks() }
			else { uni.showLoading({ title: '生成中...' }); this.drawWatermark() }
		},
		async generateMultiImageWatermarks() {
			const sourceImages = this.imagePaths.length > 0 ? this.imagePaths : [this.imagePath]
			const imageCount = sourceImages.length, repeatCount = this.multiImageMode, totalCount = imageCount * repeatCount
			const timeSpanMinutes = Math.round(this.timeSpan), timeSpanSeconds = timeSpanMinutes * 60, segmentSeconds = Math.floor(timeSpanSeconds / totalCount)
			const timeSlots = []
			for (let i = 0; i < totalCount; i++) { const ss = i * segmentSeconds, se = (i+1)*segmentSeconds-1; timeSlots.push(Math.floor(Math.random() * (se - ss + 1)) + ss) }
			uni.showLoading({ title: `生成中 0/${totalCount}` })
			let currentIndex = 0
			for (let repeatIdx = 0; repeatIdx < repeatCount; repeatIdx++) {
				for (let imgIdx = 0; imgIdx < imageCount; imgIdx++) {
					const sourceImage = sourceImages[imgIdx], timeOffset = timeSlots[currentIndex]
					const baseTime = new Date(`${this.formData.date} ${this.formData.time.hour}:${this.formData.time.minute}:${String(this.formData.time.second).padStart(2,'0')}`)
					const targetTime = new Date(baseTime.getTime() + timeOffset * 1000)
					const td = `${targetTime.getFullYear()}-${String(targetTime.getMonth()+1).padStart(2,'0')}-${String(targetTime.getDate()).padStart(2,'0')}`
					const th = String(targetTime.getHours()).padStart(2,'0'), tm = String(targetTime.getMinutes()).padStart(2,'0'), ts = targetTime.getSeconds()
					const oTime = { ...this.formData.time }, oDate = this.formData.date
					this.formData.date = td; this.formData.time = { hour: th, minute: tm, second: ts }; this.imagePath = sourceImage
					await new Promise((resolve) => {
						uni.showLoading({ title: `生成中 ${currentIndex+1}/${totalCount}` })
						this.drawWatermarkForBatch(resolve, currentIndex === totalCount - 1)
					})
					if (currentIndex < totalCount - 1) { this.formData.time = oTime; this.formData.date = oDate }
					currentIndex++
				}
			}
		},
		async generateBatchWatermarks() {
			const imageCount = this.imagePaths.length, timeSpanMinutes = Math.round(this.timeSpan), timeSpanSeconds = timeSpanMinutes * 60, segmentSeconds = Math.floor(timeSpanSeconds / imageCount)
			const timeSlots = []
			for (let i = 0; i < imageCount; i++) { const ss = i * segmentSeconds, se = (i+1)*segmentSeconds-1; timeSlots.push(Math.floor(Math.random() * (se - ss + 1)) + ss) }
			uni.showLoading({ title: `生成中 0/${imageCount}` })
			for (let i = 0; i < imageCount; i++) {
				const imagePath = this.imagePaths[i], timeOffset = timeSlots[i]
				const baseTime = new Date(`${this.formData.date} ${this.formData.time.hour}:${this.formData.time.minute}:${String(this.formData.time.second).padStart(2,'0')}`)
				const targetTime = new Date(baseTime.getTime() + timeOffset * 1000)
				const td = `${targetTime.getFullYear()}-${String(targetTime.getMonth()+1).padStart(2,'0')}-${String(targetTime.getDate()).padStart(2,'0')}`
				const th = String(targetTime.getHours()).padStart(2,'0'), tm = String(targetTime.getMinutes()).padStart(2,'0'), ts = targetTime.getSeconds()
				const oTime = { ...this.formData.time }, oDate = this.formData.date
				this.formData.date = td; this.formData.time = { hour: th, minute: tm, second: ts }; this.imagePath = imagePath
				await new Promise((resolve) => {
					uni.showLoading({ title: `生成中 ${i+1}/${imageCount}` })
					this.drawWatermarkForBatch(resolve, i === imageCount - 1)
				})
				if (i < imageCount - 1) { this.formData.time = oTime; this.formData.date = oDate }
			}
		},
		async drawWatermarkForBatch(callback, isLast) {
			await this.waitForFont()
			uni.getImageInfo({ src: this.imagePath, success: (imageInfo) => {
				const targetWidth = 1080, targetHeight = (imageInfo.height / imageInfo.width) * targetWidth
				this.canvasWidth = targetWidth; this.canvasHeight = targetHeight
				this.$nextTick(() => {
					const ctx = uni.createCanvasContext('watermarkCanvas', this)
					ctx.drawImage(this.imagePath, 0, 0, targetWidth, targetHeight)
					this.drawWatermarkContent(ctx, targetWidth, targetHeight, targetWidth / 750)
					ctx.draw(false, () => {
						let delay = 500;
						// #ifdef APP-PLUS
						delay = 800
						// #endif
						// #ifdef H5
						delay = 300
						// #endif
						setTimeout(() => {
							uni.canvasToTempFilePath({ canvasId: 'watermarkCanvas', width: targetWidth, height: targetHeight, destWidth: targetWidth, destHeight: targetHeight, fileType: 'jpg', quality: 0.9, success: (res) => { this.processImageWithExifForBatch(res.tempFilePath, callback, isLast) }, fail: () => { callback() } }, this)
						}, delay)
					})
				})
			}, fail: () => { callback() } })
		},
		drawWatermarkContent(ctx, targetWidth, targetHeight, scale) {
			const ws = this.watermarkScale
			const edgePadding = 21 * ws, borderRadius = 16 * ws, bgColor = 'rgba(0, 0, 0, 0.3)', textColor = '#ffffff'
			const timeFontSize = 74 * ws
			ctx.setFontSize(timeFontSize)
			ctx.font = `200 ${timeFontSize}px "SourceHanSerifCN"`
			const timeText = this.formData.time.hour + ':' + this.formData.time.minute
			const timeInnerPadding = 15 * ws, timeColumnWidth = 223 * ws, textStartX = edgePadding + timeColumnWidth
			const smallFontSize = 30 * ws
			ctx.setFontSize(smallFontSize)
			ctx.font = `${smallFontSize}px "SourceHanSerifCN"`
			const nameText = this.formData.name, dateText = this.formatDate(this.formData.date)
			const dateTextWidth = ctx.measureText ? ctx.measureText(dateText).width : 180 * ws
			const nameTextWidth = ctx.measureText ? ctx.measureText(nameText).width : 150 * ws
			const infoBoxHeight = 106 * ws, infoBoxWidth = timeColumnWidth + Math.max(nameTextWidth, dateTextWidth) + 12 * ws, infoBoxX = edgePadding
			const locBoxHeight = 62 * this.watermarkScale, bottomMargin = 63 * this.watermarkScale, boxGap = 14 * this.watermarkScale
			const infoBoxY = targetHeight - bottomMargin - locBoxHeight - boxGap - infoBoxHeight
			this.drawRoundedRect(ctx, infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight, borderRadius, bgColor)
			ctx.setFillStyle(textColor)
			ctx.setFontSize(timeFontSize)
			ctx.setTextAlign('left')
			const timeY = infoBoxY + (infoBoxHeight + timeFontSize) / 2 - 10 * this.watermarkScale + 5 * this.watermarkScale
			ctx.fillText(timeText, infoBoxX + timeInnerPadding, timeY)
			ctx.setFontSize(smallFontSize)
			ctx.fillText(nameText, textStartX, infoBoxY + 43 * this.watermarkScale)
			ctx.fillText(dateText, textStartX, infoBoxY + 89 * this.watermarkScale)
			const locBoxY = targetHeight - bottomMargin - locBoxHeight, location = 'Q贵阳首钢贵州之光一期'
			ctx.setFontSize(smallFontSize)
			const locTextWidth = ctx.measureText ? ctx.measureText(location).width : 250 * this.watermarkScale
			const locBoxWidth = 62 * this.watermarkScale + locTextWidth + 20 * this.watermarkScale, locBoxX = edgePadding
			this.drawRoundedRect(ctx, locBoxX, locBoxY, locBoxWidth, locBoxHeight, borderRadius, bgColor)
			ctx.drawImage('/static/images/location-pin.png', locBoxX + 20 * this.watermarkScale, locBoxY + 17 * this.watermarkScale)
			ctx.setFillStyle('#ffffff')
			ctx.setFontSize(smallFontSize)
			ctx.fillText(location, locBoxX + 62 * this.watermarkScale, locBoxY + (locBoxHeight + smallFontSize) / 2 - 4 * this.watermarkScale)
			try {
				const qrCodeText = this.generateQRCodeText()
				if (qrCodeText) {
					const qrData = QRCode.create(qrCodeText, { errorCorrectionLevel: 'L' })
					const modules = qrData.modules.data, mCount = qrData.modules.size
					const qrSize = 258 * this.watermarkScale, margin = 6 * this.watermarkScale, contentSize = qrSize - margin * 2, moduleSize = contentSize / mCount
					const qrX = targetWidth - qrSize, qrY = targetHeight - qrSize
					ctx.setFillStyle('#ffffff'); ctx.fillRect(qrX, qrY, qrSize, qrSize)
					ctx.setFillStyle('#000000')
					for (let row = 0; row < mCount; row++) { for (let col = 0; col < mCount; col++) { if (modules[row * mCount + col]) { const x1 = Math.floor(qrX + margin + col * moduleSize), y1 = Math.floor(qrY + margin + row * moduleSize), w = Math.floor(qrX + margin + (col + 1) * moduleSize) - x1, h = Math.floor(qrY + margin + (row + 1) * moduleSize) - y1; if (w > 0 && h > 0) ctx.fillRect(x1, y1, w, h) } } }
				}
			} catch (qrErr) { console.error('二维码生成失败', qrErr) }
		},
		drawRoundedRect(ctx, x, y, width, height, radius, color) {
			ctx.setFillStyle(color); ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.lineTo(x + width - radius, y)
			ctx.arc(x + width - radius, y + radius, radius, 1.5 * Math.PI, 2 * Math.PI)
			ctx.lineTo(x + width, y + height - radius); ctx.arc(x + width - radius, y + height - radius, radius, 0, 0.5 * Math.PI)
			ctx.lineTo(x + radius, y + height); ctx.arc(x + radius, y + height - radius, radius, 0.5 * Math.PI, Math.PI)
			ctx.lineTo(x, y + radius); ctx.arc(x + radius, y + radius, radius, Math.PI, 1.5 * Math.PI); ctx.closePath(); ctx.fill()
		},
		generateTimestampFileName() { const ds = this.formData.date; const [y,m,d] = ds.split('-'); return `${y}${m}${d}${this.formData.time.hour}${this.formData.time.minute}${this.formData.time.second}.jpg` },
		generateExifDateTime() { const ds = this.formData.date; return `${ds.replace(/-/g, ':')} ${this.formData.time.hour}:${this.formData.time.minute}:${this.formData.time.second}` },
		addExifToImage(base64Image) {
			try {
				const exifDateTime = this.generateExifDateTime()
				const zeroth = {}, exif = {}, gps = {}
				exif[piexif.ExifIFD.DateTimeOriginal] = exifDateTime; exif[piexif.ExifIFD.DateTimeDigitized] = exifDateTime; zeroth[piexif.ImageIFD.DateTime] = exifDateTime
				zeroth[piexif.ImageIFD.Software] = 'WatermarkTool'
				const exifObj = { '0th': zeroth, 'Exif': exif, 'GPS': gps }
				const exifBytes = piexif.dump(exifObj); return piexif.insert(exifBytes, base64Image)
			} catch (err) { return base64Image }
		},
		processImageWithExif(tempFilePath) {
			// #ifdef H5
			if (tempFilePath.startsWith('data:image')) {
				try { const b = this.addExifToImage(tempFilePath); this.resultImage = b; uni.hideLoading(); this.saveImage() }
				catch (err) { this.resultImage = tempFilePath; uni.hideLoading(); this.saveImage() }
			} else {
				fetch(tempFilePath).then(r=>r.blob()).then(blob=>{const reader=new FileReader();reader.onload=(e)=>{try{const b=this.addExifToImage(e.target.result);this.resultImage=b;uni.hideLoading();this.saveImage()}catch(err){this.resultImage=tempFilePath;uni.hideLoading();this.saveImage()}};reader.readAsDataURL(blob)}).catch(()=>{this.resultImage=tempFilePath;uni.hideLoading();this.saveImage()})
			}
			// #endif
			// #ifndef H5
			plus.io.resolveLocalFileSystemURL(tempFilePath, (entry) => {
				entry.file((file) => {
					const reader = new plus.io.FileReader()
					reader.onloadend = (e) => {
						try {
							const base64 = e.target.result, base64WithExif = this.addExifToImage(base64)
							const newFileName = '_temp_exif_' + Date.now() + '.jpg'
							const base64Data = base64WithExif.split(',')[1]
							const byteCharacters = atob(base64Data), byteNumbers = new Array(byteCharacters.length)
							for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i)
							const byteArray = new Uint8Array(byteNumbers)
							entry.filesystem.root.getFile(newFileName,{create:true},(newEntry)=>{newEntry.createWriter((writer)=>{writer.onwrite=()=>{this.resultImage=newEntry.toLocalURL();uni.hideLoading();this.saveImage()};writer.onerror=()=>{this.resultImage=tempFilePath;uni.hideLoading();this.saveImage()};writer.write(byteArray.buffer)})})
						} catch(err) { this.resultImage=tempFilePath; uni.hideLoading(); this.saveImage() }
					}
					reader.readAsDataURL(file)
				})
			}, (err) => { this.resultImage=tempFilePath; uni.hideLoading(); this.saveImage() })
			// #endif
		},
		processImageWithExifForBatch(tempFilePath, callback, isLast) {
			// #ifdef H5
			if (tempFilePath.startsWith('data:image')) { try { const b = this.addExifToImage(tempFilePath); this.saveImageForBatch(b, callback, isLast) } catch(err) { this.saveImageForBatch(tempFilePath, callback, isLast) } }
			else { fetch(tempFilePath).then(r=>r.blob()).then(blob=>{const reader=new FileReader();reader.onload=(e)=>{try{const b=this.addExifToImage(e.target.result);this.saveImageForBatch(b,callback,isLast)}catch(err){this.saveImageForBatch(tempFilePath,callback,isLast)}};reader.readAsDataURL(blob)}).catch(()=>{this.saveImageForBatch(tempFilePath,callback,isLast)}) }
			// #endif
			// #ifndef H5
			plus.io.resolveLocalFileSystemURL(tempFilePath, (entry) => {
				entry.file((file) => {
					const reader = new plus.io.FileReader()
					reader.onloadend = (e) => {
						try {
							const base64 = e.target.result, base64WithExif = this.addExifToImage(base64), newFileName = '_temp_exif_' + Date.now() + '.jpg'
							const base64Data = base64WithExif.split(',')[1], byteCharacters = atob(base64Data), byteNumbers = new Array(byteCharacters.length)
							for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i)
							const byteArray = new Uint8Array(byteNumbers)
							entry.filesystem.root.getFile(newFileName,{create:true},(newEntry)=>{newEntry.createWriter((writer)=>{writer.onwrite=()=>{this.saveImageForBatch(newEntry.toLocalURL(),callback,isLast)};writer.onerror=()=>{this.saveImageForBatch(tempFilePath,callback,isLast)};writer.write(byteArray.buffer)})})
						} catch(err) { this.saveImageForBatch(tempFilePath,callback,isLast) }
					}
					reader.readAsDataURL(file)
				})
			}, () => { this.saveImageForBatch(tempFilePath,callback,isLast) })
			// #endif
		},
		saveImageForBatch(imageData, callback, isLast) {
			// #ifdef H5
			try { const link=document.createElement('a'); link.href=imageData; link.download=this.generateTimestampFileName(); document.body.appendChild(link); link.click(); document.body.removeChild(link) } catch(e) { console.error('保存失败', e) }
			// #endif
			// #ifndef H5
			this.checkStoragePermissionAndSaveForBatch(imageData, callback, isLast)
			// #endif
			if (isLast) { uni.hideLoading(); this.saveNameConfig(); uni.showToast({title:'全部生成完成',icon:'success'}) }
			callback()
		},
		// #ifndef H5
		checkStoragePermissionAndSaveForBatch(imageData, callback, isLast) {
			const main = plus.android.runtimeMainActivity(), Build = plus.android.importClass('android.os.Build'), sdkInt = Build.VERSION.SDK_INT
			if (sdkInt >= 30) {
				const Environment = plus.android.importClass('android.os.Environment')
				if (!Environment.isExternalStorageManager()) { if(isLast){uni.hideLoading();uni.showModal({title:'需要授予权限',content:'保存到自定义目录需要"所有文件访问权限"',confirmText:'去设置',cancelText:'取消',success:(res)=>{if(res.confirm)this.openAllFilesAccessSetting()}})} callback(); return }
			} else { if (plus.android.checkPermission('android.permission.WRITE_EXTERNAL_STORAGE') === -1) { if(isLast){uni.hideLoading();uni.showToast({title:'未授予存储权限',icon:'none'})} callback(); return } }
			this.saveImageToCustomPathForBatch(imageData, callback, isLast)
		},
		saveImageToCustomPathForBatch(imageData, callback, isLast) {
			const fileName = this.generateTimestampFileName(), targetDir = '/storage/emulated/0/lebang/waterimages/'
			plus.io.resolveLocalFileSystemURL(targetDir, (dirEntry) => { this.copyFileToTargetForBatch(imageData, dirEntry, fileName, callback, isLast) }, () => {
				plus.io.resolveLocalFileSystemURL('/storage/emulated/0/', (rootEntry) => {
					rootEntry.getDirectory('lebang',{create:true},(lebangDir)=>{lebangDir.getDirectory('waterimages',{create:true},(waterDir)=>{this.copyFileToTargetForBatch(imageData,waterDir,fileName,callback,isLast)},()=>{callback()})},()=>{callback()})
				}, () => { callback() })
			})
		},
		copyFileToTargetForBatch(imageData, targetDirEntry, fileName, callback, isLast) {
			plus.io.resolveLocalFileSystemURL(imageData, (sourceEntry) => {
				this.findAvailableFileName(targetDirEntry, fileName, (finalFileName) => {
					sourceEntry.copyTo(targetDirEntry, finalFileName, (newEntry) => { this.scanMediaFile(newEntry.fullPath, () => { callback() }) }, () => { callback() })
				})
			}, () => { callback() })
		},
		// #endif
		async drawWatermark() {
			await this.waitForFont()
			uni.getImageInfo({ src: this.imagePath, success: (imageInfo) => {
				const targetWidth = 1080, targetHeight = (imageInfo.height / imageInfo.width) * targetWidth
				this.canvasWidth = targetWidth; this.canvasHeight = targetHeight
				this.$nextTick(() => {
					const ctx = uni.createCanvasContext('watermarkCanvas', this)
					const scale = targetWidth / 750
					ctx.drawImage(this.imagePath, 0, 0, targetWidth, targetHeight)
					this.drawWatermarkContent(ctx, targetWidth, targetHeight, scale)
					ctx.draw(false, () => {
						let delay = 500;
						// #ifdef APP-PLUS
						delay = 800
						// #endif
						// #ifdef H5
						delay = 300
						// #endif
						setTimeout(() => {
							uni.canvasToTempFilePath({ canvasId: 'watermarkCanvas', width: targetWidth, height: targetHeight, destWidth: targetWidth, destHeight: targetHeight, fileType: 'jpg', quality: 0.9, success: (res) => { this.processImageWithExif(res.tempFilePath) }, fail: (err) => { uni.hideLoading(); uni.showToast({title:'生成失败',icon:'none'}) } }, this)
						}, delay)
					})
				})
			}, fail: () => { uni.hideLoading(); uni.showToast({title:'图片加载失败',icon:'none'}) } })
		},
		saveImage() {
			if (!this.resultImage) return
			// #ifdef H5
			try { const link=document.createElement('a'); link.href=this.resultImage; link.download=this.generateTimestampFileName(); document.body.appendChild(link); link.click(); document.body.removeChild(link); this.saveNameConfig(); uni.showToast({title:'保存成功',icon:'success'}) } catch(e) { uni.showToast({title:`下载失败: ${e.message||'未知错误'}`,icon:'none',duration:3000}) }
			// #endif
			// #ifndef H5
			this.checkStoragePermissionAndSave()
			// #endif
		},
		// #ifndef H5
		checkStoragePermissionAndSave() {
			const main = plus.android.runtimeMainActivity(), Build = plus.android.importClass('android.os.Build'), sdkInt = Build.VERSION.SDK_INT
			if (sdkInt >= 30) {
				const Environment = plus.android.importClass('android.os.Environment')
				if (!Environment.isExternalStorageManager()) { uni.showModal({title:'需要授予权限',content:'保存到自定义目录需要"所有文件访问权限"\n\n点击确定后，请在设置页面开启"允许访问所有文件"',confirmText:'去设置',cancelText:'取消',success:(res)=>{if(res.confirm)this.openAllFilesAccessSetting()}}); return }
			} else {
				const result = plus.android.checkPermission('android.permission.WRITE_EXTERNAL_STORAGE')
				if (result === -1) { plus.android.requestPermissions(['android.permission.WRITE_EXTERNAL_STORAGE'],(r)=>{for(const n in r.granted){if(r.granted[n]){this.saveImageToCustomPath();return}} uni.showToast({title:'未授予存储权限',icon:'none'})},()=>{uni.showToast({title:'权限申请失败',icon:'none'})}); return }
			}
			this.saveImageToCustomPath()
		},
		openAllFilesAccessSetting() {
			try { const main=plus.android.runtimeMainActivity(), Intent=plus.android.importClass('android.content.Intent'), Settings=plus.android.importClass('android.provider.Settings'), Uri=plus.android.importClass('android.net.Uri'); const intent=new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION); intent.setData(Uri.parse('package:'+main.getPackageName())); main.startActivity(intent); uni.showToast({title:'请在设置中开启权限',icon:'none',duration:3000}) } catch(e) { uni.showToast({title:'无法打开设置页面',icon:'none'}) }
		},
		saveImageToCustomPath() {
			uni.showLoading({title:'保存中...',mask:true})
			const timeoutId = setTimeout(()=>{uni.hideLoading();uni.showToast({title:'保存超时',icon:'none'})},10000)
			const fileName = this.generateTimestampFileName(), targetDir = '/storage/emulated/0/lebang/waterimages/'
			plus.io.resolveLocalFileSystemURL(targetDir, (dirEntry) => { this.copyFileToTarget(timeoutId, dirEntry, fileName) }, () => {
				plus.io.resolveLocalFileSystemURL('/storage/emulated/0/', (rootEntry) => {
					rootEntry.getDirectory('lebang',{create:true},(lebangDir)=>{lebangDir.getDirectory('waterimages',{create:true},(waterDir)=>{this.copyFileToTarget(timeoutId,waterDir,fileName)},(e)=>{clearTimeout(timeoutId);uni.hideLoading();uni.showToast({title:'创建目录失败',icon:'none'})})},(e)=>{clearTimeout(timeoutId);uni.hideLoading();uni.showToast({title:`创建目录失败: ${e.message||e.code||'未知错误'}`,icon:'none',duration:3000})})
				}, (e)=>{clearTimeout(timeoutId);uni.hideLoading();uni.showToast({title:`访问根目录失败: ${e.message||e.code||'未知错误'}`,icon:'none',duration:3000})})
			})
		},
		copyFileToTarget(timeoutId, targetDirEntry, fileName) {
			plus.io.resolveLocalFileSystemURL(this.resultImage, (sourceEntry) => {
				this.findAvailableFileName(targetDirEntry, fileName, (finalFileName) => {
					sourceEntry.copyTo(targetDirEntry, finalFileName, (newEntry) => { clearTimeout(timeoutId); uni.hideLoading(); this.saveNameConfig(); this.scanMediaFile(newEntry.fullPath,()=>{uni.showToast({title:'保存成功',icon:'success'})}) }, (e)=>{clearTimeout(timeoutId);uni.hideLoading();uni.showToast({title:`复制失败: ${e.message||e.code||'未知错误'}`,icon:'none',duration:3000})})
				})
			}, (e)=>{clearTimeout(timeoutId);uni.hideLoading();uni.showToast({title:`访问源文件失败: ${e.message||e.code||'未知错误'}`,icon:'none',duration:3000})})
		},
		findAvailableFileName(dirEntry, fileName, callback) {
			const targetPath = dirEntry.fullPath + fileName
			plus.io.resolveLocalFileSystemURL(targetPath, (entry) => {
				const nameWithoutExt = fileName.replace('.jpg',''), lastChar = nameWithoutExt[nameWithoutExt.length-1]
				let newFileName = !isNaN(parseInt(lastChar)) ? nameWithoutExt.substring(0,nameWithoutExt.length-1)+(parseInt(lastChar)+1)%10+'.jpg' : nameWithoutExt+'1.jpg'
				this.findAvailableFileName(dirEntry, newFileName, callback)
			}, (err) => { callback(fileName) })
		},
		scanMediaFile(filePath, callback) {
			try { const main=plus.android.runtimeMainActivity(), Intent=plus.android.importClass('android.content.Intent'), Uri=plus.android.importClass('android.net.Uri'), File=plus.android.importClass('java.io.File'); const file=new File(filePath), uri=Uri.fromFile(file), intent=new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE); intent.setData(uri); main.sendBroadcast(intent); if(callback) setTimeout(callback,500) } catch(e) { if(callback) callback() }
		},
		// #endif
		previewImage(url) {
			this.previewImageUrl = url; this.showPreview = true; this.resetTransform()
			// #ifdef H5
			this.$nextTick(()=>{setTimeout(()=>{const pc=document.querySelector('.preview-content'); if(pc){if(this.nativeWheelHandler) pc.removeEventListener('wheel',this.nativeWheelHandler); this.nativeWheelHandler=(e)=>{e.preventDefault();e.stopPropagation();let ns=e.deltaY>0?this.scale-0.1:this.scale+0.1;ns=Math.max(0.5,Math.min(5,ns));this.scale=ns;this.lastScale=ns}; pc.addEventListener('wheel',this.nativeWheelHandler,{passive:false})}},100)})
			// #endif
			uni.getImageInfo({src:url,success:(res)=>{this.imageWidth=res.width;this.imageHeight=res.height;const si=uni.getSystemInfoSync();this.containerWidth=si.windowWidth;this.containerHeight=si.windowHeight;this.initialScale=1;this.scale=1;this.lastScale=1}})
		},
		closePreview() {
			// #ifdef H5
			const pc=document.querySelector('.preview-content'); if(pc&&this.nativeWheelHandler){pc.removeEventListener('wheel',this.nativeWheelHandler);this.nativeWheelHandler=null}
			// #endif
			this.showPreview=false; setTimeout(()=>{this.resetTransform()},300)
		},
		resetTransform() { this.scale=1;this.initialScale=1;this.translateX=0;this.translateY=0;this.lastScale=1;this.lastTranslateX=0;this.lastTranslateY=0 },
		handleTouchStart(e) { if(e.touches.length===1){this.isDragging=true;this.startX=e.touches[0].clientX;this.startY=e.touches[0].clientY} else if(e.touches.length===2){this.isScaling=true;this.isDragging=false;const t1=e.touches[0],t2=e.touches[1];this.startDistance=this.getDistance(t1,t2);this.lastScale=this.scale;this.pinchCenterX=(t1.clientX+t2.clientX)/2;this.pinchCenterY=(t1.clientY+t2.clientY)/2} },
		handleTouchMove(e) { e.preventDefault(); if(e.touches.length===1&&this.isDragging){const dx=e.touches[0].clientX-this.startX,dy=e.touches[0].clientY-this.startY;const l=this.limitBoundary(this.lastTranslateX+dx,this.lastTranslateY+dy);this.translateX=l.x;this.translateY=l.y} else if(e.touches.length===2&&this.isScaling){const t1=e.touches[0],t2=e.touches[1],distance=this.getDistance(t1,t2),sc=distance/this.startDistance;let ns=this.lastScale*sc;ns=Math.max(this.initialScale,Math.min(5,ns));const cox=this.pinchCenterX-this.containerWidth/2,coy=this.pinchCenterY-this.containerHeight/2,sr=ns/this.lastScale;this.scale=ns;this.translateX=(this.lastTranslateX-cox)*sr+cox;this.translateY=(this.lastTranslateY-coy)*sr+coy} },
		handleTouchEnd(e) { if(e.touches.length===0){this.isDragging=false;this.isScaling=false;this.checkAndSpringBack()} else if(e.touches.length===1){this.isScaling=false;this.checkAndSpringBack()} },
		handleMouseDown(e) { this.isDragging=true;this.startX=e.clientX;this.startY=e.clientY },
		handleMouseMove(e) { if(!this.isDragging)return;const dx=e.clientX-this.startX,dy=e.clientY-this.startY;const l=this.limitBoundary(this.lastTranslateX+dx,this.lastTranslateY+dy);this.translateX=l.x;this.translateY=l.y },
		handleMouseUp(e) { if(this.isDragging){this.isDragging=false;this.checkAndSpringBack()} },
		handleWheel(e) { console.log('handleWheel 被调用（非 H5 原生绑定）') },
		getDistance(t1,t2) { const dx=t1.clientX-t2.clientX,dy=t1.clientY-t2.clientY;return Math.sqrt(dx*dx+dy*dy) },
		checkAndSpringBack() {
			let need=false,ts=this.scale,tx=this.translateX,ty=this.translateY
			if(this.scale<this.initialScale){ts=this.initialScale;need=true}
			const sw=this.imageWidth*ts,sh=this.imageHeight*ts
			if(sw>this.containerWidth){const mx=(sw-this.containerWidth)/2;if(this.translateX>mx){tx=mx;need=true}else if(this.translateX<-mx){tx=-mx;need=true}}else{if(this.translateX!==0){tx=0;need=true}}
			if(sh>this.containerHeight){const my=(sh-this.containerHeight)/2;if(this.translateY>my){ty=my;need=true}else if(this.translateY<-my){ty=-my;need=true}}else{if(this.translateY!==0){ty=0;need=true}}
			if(need) this.springBack(ts,tx,ty); else {this.lastScale=this.scale;this.lastTranslateX=this.translateX;this.lastTranslateY=this.translateY}
		},
		springBack(targetScale,targetX,targetY) {
			this.isSpringBack=true; const ss=this.scale,sx=this.translateX,sy=this.translateY,duration=300,start=Date.now()
			const animate=()=>{const p=Math.min((Date.now()-start)/duration,1),ep=1-Math.pow(1-p,3);this.scale=ss+(targetScale-ss)*ep;this.translateX=sx+(targetX-sx)*ep;this.translateY=sy+(targetY-sy)*ep;if(p<1){requestAnimationFrame(animate)}else{this.scale=targetScale;this.translateX=targetX;this.translateY=targetY;this.isSpringBack=false;this.lastScale=this.scale;this.lastTranslateX=this.translateX;this.lastTranslateY=this.translateY}}
			requestAnimationFrame(animate)
		},
		limitBoundary(x,y) {
			const sw=this.imageWidth*this.scale,sh=this.imageHeight*this.scale
			let lx=x,ly=y
			if(sw>this.containerWidth){const mx=(sw-this.containerWidth)/2;lx=Math.max(-mx,Math.min(mx,x))}else{lx=0}
			if(sh>this.containerHeight){const my=(sh-this.containerHeight)/2;ly=Math.max(-my,Math.min(my,y))}else{ly=0}
			return {x:lx,y:ly}
		},
		saveNameConfig() {
			const name = this.formData.name; this.formData.name.trim()
			if (name) {
				const config = JSON.stringify({ name })
				uni.setStorageSync('watermark_config', config)
			}
		}
	}
}
</script>

<style lang="scss" scoped>
@font-face {
	font-family: 'SourceHanSerifCN';
	src: url('@/static/fonts/SourceHanSerifCN-Regular.ttf') format('truetype');
	font-weight: normal;
	font-style: normal;
	font-display: swap;
}

$bg: #f5f5f7;
$card: #ffffff;
$text: #1c1c1e;
$text-secondary: #8e8e93;
$text-muted: #c7c7cc;
$border: #e5e5ea;
$accent: #7c5cfc;
$danger: #ff3b30;
$radius: 12px;
$radius-lg: 16px;
$shadow: 0 1px 8px rgba(0,0,0,0.04);

.page {
	min-height: 100vh;
	background: $bg;
}

/* ===== Header ===== */
.watermark-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px 0;
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

.header-close {
	width: 32px; height: 32px;
	border-radius: 50%;
	background: $card;
	display: flex; align-items: center; justify-content: center;
	color: $text-secondary;
	box-shadow: $shadow;
}
.header-close:active { background: $border; }

.header-right {
	display: flex;
	align-items: center;
}

.collage-btn {
	display: flex;
	align-items: center;
	gap: 2px;
	font-size: 14px;
	font-weight: 500;
	color: $accent;
}
.collage-btn:active {
	opacity: 0.6;
}

/* ===== Content ===== */
.content {
	padding: 16px;
	padding-bottom: 40px;
}

/* ===== Upload Card ===== */
.upload-card {
	background: $card;
	border-radius: $radius-lg;
	padding: 24px;
	margin-bottom: 16px;
	box-shadow: $shadow;
}

.upload-area {
	border: 1.5px dashed $border;
	border-radius: $radius;
	padding: 48px 20px;
	text-align: center;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
}

.upload-area:active {
	background: #f2effe;
	border-color: $accent;
}

.upload-icon {
	width: 56px; height: 56px;
	border-radius: $radius;
	background: $accent;
	display: flex; align-items: center; justify-content: center;
	color: white;
}

.upload-title {
	font-size: 16px;
	font-weight: 600;
	color: $text;
}

.upload-hint {
	font-size: 13px;
	color: $text-secondary;
}

.image-preview, .images-preview {
	border: 1.5px dashed $border;
	border-radius: $radius;
	padding: 12px;
}

.preview-img {
	width: 100%;
	max-height: 200px;
	border-radius: 8px;
	object-fit: contain;
	background: $bg;
	cursor: pointer;
}

.images-count {
	display: block;
	text-align: center;
	padding: 24px 0;
	font-size: 14px;
	color: $text-secondary;
}

.image-actions {
	display: flex;
	gap: 16px;
	margin-top: 16px;
	justify-content: center;
}

.action-link {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 14px;
	font-weight: 500;
	background: none;
	border: none;
	color: $text-secondary;
}
.action-link.primary { color: $accent; }
.action-link.danger { color: $danger; }
.action-link:active { opacity: 0.6; }

/* ===== Section Title ===== */
.section-title {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 14px;
	font-weight: 600;
	color: $text;
	margin-bottom: 10px;
	margin-left: 4px;
}
.section-title::before {
	content: '';
	width: 6px; height: 6px;
	background: $accent;
	border-radius: 50%;
}

/* ===== Form Card ===== */
.form-card {
	background: $card;
	border-radius: $radius;
	padding: 14px 16px;
	margin-bottom: 16px;
	box-shadow: $shadow;
	border: 1px solid $border;
}

.form-input {
	width: 100%;
	height: 28px;
	border: none;
	outline: none;
	font-size: 16px;
	font-weight: 500;
	color: $text;
	font-family: inherit;
	background: transparent;
}
.form-input::placeholder { color: $text-muted; }

/* ===== Time Row ===== */
.time-row {
	display: flex;
	gap: 10px;
	margin-bottom: 16px;
}

.time-box {
	flex: 1;
	background: $card;
	border-radius: $radius;
	padding: 12px 14px;
	border: 1px solid $border;
	display: flex;
	flex-direction: column;
	justify-content: center;
	min-height: 56px;
}
.time-box.date-box { flex: 1.6; }
.time-box.small { flex: 0 0 64px; text-align: center; }
.time-box:active { background: #f2effe; border-color: $accent; }
.time-box .time-value { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.time-label {
	display: block;
	font-size: 12px;
	color: $text-secondary;
	margin-bottom: 4px;
}

.time-value {
	display: block;
	font-size: 15px;
	font-weight: 600;
	color: $text;
}

.sync-btn {
	width: 56px;
	flex-shrink: 0;
	display: flex; align-items: center; justify-content: center;
	background: $card;
	border: 1px solid $border;
	border-radius: $radius;
	color: $text;
	min-height: 56px;
	align-self: stretch;
}
.sync-btn:active { opacity: 0.6; transform: scale(0.95); }

/* ===== Multi Row ===== */
.multi-row {
	display: flex;
	gap: 10px;
	margin-bottom: 16px;
}

.multi-col { flex: 1; }

.multi-box {
	background: $card;
	border-radius: $radius;
	padding: 12px 14px;
	border: 1px solid $border;
}
.multi-box .time-value { font-weight: 500; }

.time-span-input-field {
	width: 100%;
	background: transparent;
	border: none;
	font-size: 15px;
	color: $text;
	font-weight: 500;
	padding: 0;
	margin: 0;
	line-height: 1.4;
}

/* ===== Generate Button ===== */
.generate-btn {
	width: 100%;
	padding: 16px;
	border: none;
	border-radius: $radius;
	background: #1c1c1e;
	color: white;
	font-size: 16px;
	font-weight: 600;
	font-family: inherit;
	margin-bottom: 16px;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
}
.generate-btn:active:not(.disabled) { opacity: 0.8; transform: scale(0.99); }
.generate-btn.disabled { opacity: 0.4; }

/* ===== Result ===== */
.result-card {
	background: $card;
	border-radius: $radius-lg;
	padding: 16px;
	margin-top: 16px;
	box-shadow: $shadow;
}

.result-img {
	width: 100%;
	border-radius: $radius;
	cursor: pointer;
}

/* ===== Preview Modal ===== */
.image-preview-modal {
	position: fixed; top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0,0,0,0.92);
	z-index: 9999;
	display: flex; align-items: center; justify-content: center;
	animation: fadeIn 0.25s ease;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.preview-container {
	width: 100%; height: 100%;
	position: relative;
	display: flex; align-items: center; justify-content: center;
	transform: scale(0.9); opacity: 0;
	transition: all 0.3s ease;
}
.preview-container.show { transform: scale(1); opacity: 1; }

.preview-content {
	width: 100%; height: 100%;
	position: relative; overflow: hidden;
	display: flex; align-items: center; justify-content: center;
}

.preview-image {
	width: 100%; height: 100%;
	object-fit: contain;
	transform-origin: center center;
	user-select: none;
	-webkit-user-drag: none;
	pointer-events: none;
}

.preview-close-btn {
	position: absolute;
	top: 48px; right: 20px;
	width: 40px; height: 40px;
	background: rgba(255,255,255,0.15);
	border-radius: 50%;
	display: flex; align-items: center; justify-content: center;
	color: white;
	backdrop-filter: blur(8px);
}
.preview-close-btn:active { background: rgba(255,255,255,0.25); transform: scale(0.9); }


.status-bar { width: 100%; background: transparent; }
</style>
