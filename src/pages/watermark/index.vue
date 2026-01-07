<template>
	<view class="page">
		<!-- 使用统一容器，通过类名处理 H5 滚动差异 -->
		<view class="content">
			<!-- 图片上传区域 -->
			<view class="upload-section">
				<view class="section-title">选择图片</view>
				<view class="upload-area" @click="chooseImage" v-if="!imagePath && imagePaths.length === 0">
					<text class="upload-icon">📷</text>
					<text class="upload-text">点击上传图片</text>
				</view>
				<view class="image-preview" v-else-if="imagePath">
					<image :src="imagePath" mode="aspectFit" class="preview-img" @click="previewImage(imagePath)"></image>
					<view class="image-actions">
						<view class="action-btn" @click="chooseImage">重新选择</view>
						<view class="action-btn delete" @click="removeImage">删除</view>
					</view>
				</view>
				<view class="images-preview" v-else-if="imagePaths.length > 0">
					<view class="images-count">已选择 {{ imagePaths.length }} 张照片</view>
					<view class="image-actions">
						<view class="action-btn" @click="chooseImage">重新选择</view>
						<view class="action-btn delete" @click="removeImage">删除</view>
					</view>
				</view>
			</view>

			<!-- 姓名输入 -->
			<view class="form-section">
				<view class="section-title">姓名</view>
					<input 
					class="simple-input" 
						v-model="formData.name"
						placeholder="请输入姓名"
						type="text"
					/>
			</view>

			<!-- 时间选择 -->
			<view class="form-section">
				<view class="section-title">时间</view>
				<view class="time-selector">
					<picker mode="date" :value="formData.date" @change="onDateChange">
						<view class="time-item">
							<text class="time-label">日期</text>
							<text class="time-value">{{ formatDate(formData.date) }}</text>
						</view>
					</picker>
					<picker mode="time" :value="timeValue" @change="onTimeChange">
						<view class="time-item">
							<text class="time-label">时间</text>
							<text class="time-value">{{ formatTime(formData.time) }}</text>
						</view>
					</picker>
					<picker mode="selector" :range="secondRange" :value="formData.time.second" @change="onSecondChange">
						<view class="time-item">
							<text class="time-label">秒</text>
							<text class="time-value">{{ String(formData.time.second).padStart(2, '0') }}</text>
						</view>
					</picker>
				</view>
			</view>

			<!-- 时间跨度（多选照片时显示） -->
			<view class="form-section" v-if="imagePaths.length > 1">
				<view class="section-title">时间跨度（分钟）</view>
				<input 
					class="simple-input" 
					v-model.number="timeSpan"
					placeholder="请输入时间跨度"
					type="digit"
				/>
			</view>

			<!-- 生成按钮 -->
			<view class="generate-section">
				<button 
					class="generate-btn" 
					:class="{ disabled: !canGenerate }"
					@click="handleGenerateClick"
				>
					生成水印
				</button>
			</view>

			<!-- 生成结果 -->
			<view class="result-section" v-if="resultImage">
				<view class="section-title">生成结果</view>
				<image :src="resultImage" mode="aspectFit" class="result-img" @click="previewImage(resultImage)"></image>
			</view>
			</view>

		<!-- 隐藏的canvas用于绘制 -->
		<!-- 【关键】canvas 需要设置实际像素尺寸和样式尺寸 -->
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
		>
		<!-- Android兼容性提示：确保Canvas宽高正确设置 -->
		</canvas>
		
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
				<view class="close-btn" @click="closePreview">✕</view>
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

		// 获取当前时间
		const now = new Date()
		const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
		const currentHour = String(now.getHours()).padStart(2, '0')
		const currentMinute = String(now.getMinutes()).padStart(2, '0')
		const currentSecond = now.getSeconds()
		
		// 生成秒的选择范围 0-59
		const secondRange = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
		
		return {
			isH5,
			imagePath: '',
			imagePaths: [],
			resultImage: '',
			timeSpan: 10,
			formData: {
				name: '',
				date: currentDate,
				time: { hour: currentHour, minute: currentMinute, second: currentSecond }
			},
			secondRange,
			canvasWidth: 750,
			canvasHeight: 1334,
	// 图片预览相关
	showPreview: false,
	previewImageUrl: '',
	scale: 1,
	initialScale: 1, // 初始缩放比例（撑满屏幕）
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
	nativeWheelHandler: null,  // 存储原生 wheel 事件处理器的引用
	// 图片和容器尺寸信息
	imageWidth: 0,
	imageHeight: 0,
	containerWidth: 0,
	containerHeight: 0,
	// 双指缩放中心点
	pinchCenterX: 0,
	pinchCenterY: 0,
	// 回弹动画
	isSpringBack: false,
	// 加密key（从缓存读取或使用默认值）
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
		// 从缓存中读取加密key，如果没有则使用默认值
		const cachedKey = uni.getStorageSync('watermark_encryption_key')
		if (cachedKey) {
			this.encryptionKey = cachedKey
		} else {
			// 首次使用，保存默认key到缓存
			uni.setStorageSync('watermark_encryption_key', this.encryptionKey)
		}
	},
	methods: {
		// 从服务器获取最新的加密key
		async fetchKeyFromServer() {
			try {
				// 使用静态导入的配置文件
				const config = apiConfig.watermarkKey
				
				// 发起HTTP请求
				const response = await new Promise((resolve, reject) => {
					uni.request({
						url: config.url,
						method: config.method,
						header: config.headers,
						success: (res) => {
							resolve(res)
						},
						fail: (err) => {
							reject(err)
						}
					})
				})
				
				// 检查响应是否成功
				if (response.statusCode === 200 && response.data) {
					const data = response.data
					if (data.code === 0 && data.result && data.result.key) {
						// 更新key到缓存
						const newKey = data.result.key
						this.encryptionKey = newKey
						uni.setStorageSync('watermark_encryption_key', newKey)
						console.log('加密key已更新:', newKey)
					}
				}
			} catch (error) {
				// 请求失败，忽略，继续使用缓存中的key
				console.log('获取加密key失败，使用缓存key:', error)
			}
		},
		
		// 在矩形范围内随机生成经纬度
		generateRandomCoordinates() {
			// 定义矩形的两个对角点
			const point1 = { la: 26.554362, lo: 106.730012 }
			const point2 = { la: 26.554363, lo: 106.730013 } // 暂代：在第一组基础上最后一位加1
			
			// 计算范围
			const minLa = Math.min(point1.la, point2.la)
			const maxLa = Math.max(point1.la, point2.la)
			const minLo = Math.min(point1.lo, point2.lo)
			const maxLo = Math.max(point1.lo, point2.lo)
			
			// 在范围内随机生成，保留6位小数（GPS标准精度）
			const randomLa = minLa + Math.random() * (maxLa - minLa)
			const randomLo = minLo + Math.random() * (maxLo - minLo)
			
			return {
				la: parseFloat(randomLa.toFixed(6)),
				lo: parseFloat(randomLo.toFixed(6))
			}
		},
		
		// 生成随机7位数员工ID（不与staffMap中的ID重复）
		generateRandomStaffId() {
			const existingIds = Object.values(staffMap)
			let randomId
			let attempts = 0
			const maxAttempts = 100 // 防止无限循环
			
			do {
				// 生成7位数随机ID (1000000 - 9999999)
				randomId = Math.floor(Math.random() * 9000000) + 1000000
				attempts++
			} while (existingIds.includes(randomId) && attempts < maxAttempts)
			
			return randomId
		},
		
		// 生成加密的二维码文本
		generateQRCodeText() {
			// 1. 获取员工ID（如果找不到则随机生成）
			let staffId = staffMap[this.formData.name]
			if (!staffId) {
				staffId = this.generateRandomStaffId()
			}
			
			// 2. 生成Unix时间戳（秒）
			const dateStr = `${this.formData.date} ${this.formData.time.hour}:${this.formData.time.minute}:${String(this.formData.time.second).padStart(2, '0')}`
			const timestamp = Math.floor(new Date(dateStr).getTime() / 1000)
			
			// 3. 在指定矩形范围内随机生成经纬度
			const coords = this.generateRandomCoordinates()
			const la = coords.la
			const lo = coords.lo
			
			// 4. 构建明文数据对象
			const data = {
				g: {
					c: "GCJ-02",
					la: la,
					lo: lo,
					n: ""
				},
				n: this.formData.name,
				or: 2,
				ot: timestamp,
				s: staffId
			}
			
		// 5. 序列化为紧凑JSON（无空格）
		const plainText = JSON.stringify(data, null, 0)
		
		// 6. AES-128-ECB 加密（使用缓存的key）
		const key = CryptoJS.enc.Utf8.parse(this.encryptionKey)
		const encrypted = CryptoJS.AES.encrypt(plainText, key, {
			mode: CryptoJS.mode.ECB,
			padding: CryptoJS.pad.Pkcs7
		})
			
			// 7. Base64 编码
			const encryptedText = encrypted.toString()
			
			// 8. 构建最终的 JSON 字符串（保留 \u003d 不被转义）
			const finalText = `{"text":"${encryptedText.replace(/=/g, '\\u003d')}","version":"v1.0"}`
			
			return finalText
		},
		chooseImage() {
			uni.chooseImage({
				count: 9,
				sourceType: ['album', 'camera'],
				success: (res) => {
					if (res.tempFilePaths.length === 1) {
						this.imagePath = res.tempFilePaths[0]
						this.imagePaths = []
					} else {
						this.imagePaths = res.tempFilePaths
						this.imagePath = ''
					}
				},
				fail: (err) => {
				}
			})
		},
		removeImage() {
			this.imagePath = ''
			this.imagePaths = []
			this.resultImage = ''
		},
		onDateChange(e) {
			this.formData.date = e.detail.value
		},
		onTimeChange(e) {
			const value = e.detail.value || ''
			const [h, m] = value.split(':')
			if (h != null && m != null) {
				this.formData.time.hour = String(h).padStart(2, '0')
				this.formData.time.minute = String(m).padStart(2, '0')
			}
		},
		onSecondChange(e) {
			this.formData.time.second = parseInt(e.detail.value)
		},
		formatDate(date) {
			if (!date) return ''
			const d = new Date(date)
			const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
			const weekday = weekdays[d.getDay()]
			return `${date} ${weekday}`
		},
		formatTime(time) {
			if (!time) return ''
			return `${time.hour}:${time.minute}`
		},
		handleGenerateClick() {
			const hasImage = (this.imagePaths.length > 0) || (!!this.imagePath && this.imagePath.trim && this.imagePath.trim().length > 0)
			const hasName = !!(this.formData.name && this.formData.name.trim && this.formData.name.trim().length > 0)
			
			if (!hasImage) {
				uni.showToast({
					title: '请先上传图片',
					icon: 'none',
					duration: 2000
				})
				return
			}
			
			if (!hasName) {
				uni.showToast({
					title: '请输入姓名',
					icon: 'none',
					duration: 2000
				})
				return
			}

			if (this.imagePaths.length > 1 && (!this.timeSpan || this.timeSpan <= 0)) {
				uni.showToast({
					title: '请输入时间跨度',
					icon: 'none',
					duration: 2000
				})
				return
			}
			
		this.generateWatermark()
	},
	async generateWatermark() {
		await this.fetchKeyFromServer()

		if (this.imagePaths.length > 1) {
			// 批量处理多张照片
			this.generateBatchWatermarks()
		} else {
			// 单张处理
			uni.showLoading({ title: '生成中...' })
			this.drawWatermark()
		}
	},
	
	// 批量生成水印
	async generateBatchWatermarks() {
		const imageCount = this.imagePaths.length
		const timeSpanMinutes = Math.round(this.timeSpan) // 四舍五入取整数
		const timeSpanSeconds = timeSpanMinutes * 60
		
		// 计算每张照片的时间段
		const segmentSeconds = Math.floor(timeSpanSeconds / imageCount)
		
		// 生成每张照片的随机时间
		const timeSlots = []
		for (let i = 0; i < imageCount; i++) {
			const segmentStart = i * segmentSeconds
			const segmentEnd = (i + 1) * segmentSeconds - 1
			const randomSeconds = Math.floor(Math.random() * (segmentEnd - segmentStart + 1)) + segmentStart
			timeSlots.push(randomSeconds)
		}
		
		uni.showLoading({ title: `生成中 0/${imageCount}` })
		
		// 依次处理每张照片
		for (let i = 0; i < imageCount; i++) {
			const imagePath = this.imagePaths[i]
			const timeOffset = timeSlots[i]
			
			// 计算该照片的时间
			const baseTime = new Date(`${this.formData.date} ${this.formData.time.hour}:${this.formData.time.minute}:${String(this.formData.time.second).padStart(2, '0')}`)
			const targetTime = new Date(baseTime.getTime() + timeOffset * 1000)
			
			const targetDate = `${targetTime.getFullYear()}-${String(targetTime.getMonth() + 1).padStart(2, '0')}-${String(targetTime.getDate()).padStart(2, '0')}`
			const targetHour = String(targetTime.getHours()).padStart(2, '0')
			const targetMinute = String(targetTime.getMinutes()).padStart(2, '0')
			const targetSecond = targetTime.getSeconds()
			
			// 临时保存原始时间
			const originalTime = { ...this.formData.time }
			const originalDate = this.formData.date
			
			// 设置当前照片的时间
			this.formData.date = targetDate
			this.formData.time = { hour: targetHour, minute: targetMinute, second: targetSecond }
			this.imagePath = imagePath
			
			// 等待当前照片处理完成
			await new Promise((resolve) => {
				uni.showLoading({ title: `生成中 ${i + 1}/${imageCount}` })
				this.drawWatermarkForBatch(resolve, i === imageCount - 1)
			})
			
			// 恢复原始时间（最后一张不需要恢复）
			if (i < imageCount - 1) {
				this.formData.time = originalTime
				this.formData.date = originalDate
			}
		}
	},
	
	// 为批量处理绘制单张水印
	drawWatermarkForBatch(callback, isLast) {
		uni.getImageInfo({
			src: this.imagePath,
			success: (imageInfo) => {
				const targetWidth = 1080
				const targetHeight = (imageInfo.height / imageInfo.width) * targetWidth
				
				this.canvasWidth = targetWidth
				this.canvasHeight = targetHeight
				
				this.$nextTick(() => {
					const ctx = uni.createCanvasContext('watermarkCanvas', this)
					const scale = targetWidth / 750
					
					ctx.drawImage(this.imagePath, 0, 0, targetWidth, targetHeight)
					
					// 绘制水印（复用原有逻辑）
					this.drawWatermarkContent(ctx, targetWidth, targetHeight, scale)
					
					ctx.draw(false, () => {
						let delay = 500
						// #ifdef APP-PLUS
						delay = 800
						// #endif
						// #ifdef H5
						delay = 300
						// #endif
						
						setTimeout(() => {
							uni.canvasToTempFilePath({
								canvasId: 'watermarkCanvas',
								width: targetWidth,
								height: targetHeight,
								destWidth: targetWidth,
								destHeight: targetHeight,
								fileType: 'jpg',
								quality: 0.9,
								success: (res) => {
									this.processImageWithExifForBatch(res.tempFilePath, callback, isLast)
								},
								fail: () => {
									callback()
								}
							}, this)
						}, delay)
					})
				})
			},
			fail: () => {
				callback()
			}
		})
	},
	
	// 绘制水印内容（提取公共逻辑）
	drawWatermarkContent(ctx, targetWidth, targetHeight, scale) {
		const edgePadding = 21
		const borderRadius = 16
		const bgColor = 'rgba(0, 0, 0, 0.3)'
		const textColor = '#ffffff'
		
		const timeFontSize = 74
		ctx.setFontSize(timeFontSize)
		ctx.font = `200 ${timeFontSize}px "Noto Serif CJK SC", "思源宋体", "SimSun", serif`
		const timeText = this.formData.time.hour + ':' + this.formData.time.minute
		const timeWidth = ctx.measureText ? ctx.measureText(timeText).width : 140
		
		const timeInnerPadding = 15 * scale
		const textStartX = edgePadding + timeInnerPadding + timeWidth + timeInnerPadding
		
		const smallFontSize = 30
		ctx.setFontSize(smallFontSize)
		ctx.font = `${smallFontSize}px "Noto Serif CJK SC", "思源宋体", "SimSun", serif`
		const nameText = this.formData.name
		const dateText = this.formatDate(this.formData.date)
		const nameWidth = ctx.measureText ? ctx.measureText(nameText).width : 80 * scale
		const dateWidth = ctx.measureText ? ctx.measureText(dateText).width : 180 * scale
		
		const infoBoxHeight = 106
		const infoBoxWidth = 469
		const infoBoxX = edgePadding
		
		const locBoxHeight = 62
		const bottomMargin = 63
		const boxGap = 14
		const infoBoxY = targetHeight - bottomMargin - locBoxHeight - boxGap - infoBoxHeight
		
		this.drawRoundedRect(ctx, infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight, borderRadius, bgColor)
		
		ctx.setFillStyle(textColor)
		ctx.setFontSize(timeFontSize)
		ctx.setTextAlign('left')
		const timeY = infoBoxY + (infoBoxHeight + timeFontSize) / 2 - 10 + 5
		ctx.fillText(timeText, infoBoxX + timeInnerPadding, timeY)
		
		ctx.setFontSize(smallFontSize)
		const nameY = infoBoxY + 43
		const dateY = infoBoxY + 89
		ctx.fillText(nameText, textStartX, nameY)
		ctx.fillText(dateText, textStartX, dateY)
		
		const locBoxY = targetHeight - bottomMargin - locBoxHeight
		const location = 'Q贵阳首钢贵州之光一期'
		
		ctx.setFontSize(smallFontSize)
		const locTextWidth = ctx.measureText ? ctx.measureText(location).width : 250
		const locIconSpace = 62
		const locBoxWidth = locIconSpace + locTextWidth + 20
		const locBoxX = edgePadding
		
		this.drawRoundedRect(ctx, locBoxX, locBoxY, locBoxWidth, locBoxHeight, borderRadius, bgColor)
		
		const iconX = locBoxX + 20
		const iconY = locBoxY + 17
		
		ctx.drawImage('/static/images/location-pin.png', iconX, iconY)
		
		ctx.setFillStyle('#ffffff')
		ctx.setFontSize(smallFontSize)
		const locTextY = locBoxY + (locBoxHeight + smallFontSize) / 2 - 4
		ctx.fillText(location, locBoxX + 62, locTextY)
		
		try {
			const qrCodeText = this.generateQRCodeText()
			if (qrCodeText) {
				const qrData = QRCode.create(qrCodeText, { errorCorrectionLevel: 'L' })
				const modules = qrData.modules.data
				const mCount = qrData.modules.size
				const qrSize = 258
				const margin = 6
				const contentSize = qrSize - margin * 2
				const moduleSize = contentSize / mCount
				const qrX = targetWidth - qrSize
				const qrY = targetHeight - qrSize
				
				ctx.setFillStyle('#ffffff')
				ctx.fillRect(qrX, qrY, qrSize, qrSize)
				
				ctx.setFillStyle('#000000')
				for (let row = 0; row < mCount; row++) {
					for (let col = 0; col < mCount; col++) {
						const index = row * mCount + col
						if (modules[index]) {
							const x1 = Math.floor(qrX + margin + col * moduleSize)
							const y1 = Math.floor(qrY + margin + row * moduleSize)
							const x2 = Math.floor(qrX + margin + (col + 1) * moduleSize)
							const y2 = Math.floor(qrY + margin + (row + 1) * moduleSize)
							const w = x2 - x1
							const h = y2 - y1
							if (w > 0 && h > 0) {
								ctx.fillRect(x1, y1, w, h)
							}
						}
					}
				}
			}
		} catch (qrErr) {
			console.error('二维码生成失败', qrErr)
		}
	},
	
	// 批量处理EXIF
	processImageWithExifForBatch(tempFilePath, callback, isLast) {
		// #ifdef H5
		if (tempFilePath.startsWith('data:image')) {
			try {
				const base64WithExif = this.addExifToImage(tempFilePath)
				this.saveImageForBatch(base64WithExif, callback, isLast)
			} catch (err) {
				this.saveImageForBatch(tempFilePath, callback, isLast)
			}
		} else {
			fetch(tempFilePath)
				.then(res => res.blob())
				.then(blob => {
					const reader = new FileReader()
					reader.onload = (e) => {
						try {
							const base64 = e.target.result
							const base64WithExif = this.addExifToImage(base64)
							this.saveImageForBatch(base64WithExif, callback, isLast)
						} catch (err) {
							this.saveImageForBatch(tempFilePath, callback, isLast)
						}
					}
					reader.readAsDataURL(blob)
				})
				.catch(() => {
					this.saveImageForBatch(tempFilePath, callback, isLast)
				})
		}
		// #endif
		
		// #ifndef H5
		plus.io.resolveLocalFileSystemURL(tempFilePath, (entry) => {
			entry.file((file) => {
				const reader = new plus.io.FileReader()
				reader.onloadend = (e) => {
					try {
						const base64 = e.target.result
						const base64WithExif = this.addExifToImage(base64)
						const newFileName = '_temp_exif_' + Date.now() + '.jpg'
						const newFilePath = entry.filesystem.root.toLocalURL() + newFileName
						const base64Data = base64WithExif.split(',')[1]
						const byteCharacters = atob(base64Data)
						const byteNumbers = new Array(byteCharacters.length)
						for (let i = 0; i < byteCharacters.length; i++) {
							byteNumbers[i] = byteCharacters.charCodeAt(i)
						}
						const byteArray = new Uint8Array(byteNumbers)
						entry.filesystem.root.getFile(newFileName, { create: true }, (newEntry) => {
							newEntry.createWriter((writer) => {
								writer.onwrite = () => {
									this.saveImageForBatch(newEntry.toLocalURL(), callback, isLast)
								}
								writer.onerror = () => {
									this.saveImageForBatch(tempFilePath, callback, isLast)
								}
								writer.write(byteArray.buffer)
							})
						})
					} catch (err) {
						this.saveImageForBatch(tempFilePath, callback, isLast)
					}
				}
				reader.readAsDataURL(file)
			})
		}, () => {
			this.saveImageForBatch(tempFilePath, callback, isLast)
		})
		// #endif
	},
	
	// 批量保存图片
	saveImageForBatch(imageData, callback, isLast) {
		// #ifdef H5
		try {
			const fileName = this.generateTimestampFileName()
			const link = document.createElement('a')
			link.href = imageData
			link.download = fileName
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
		} catch (e) {
			console.error('保存失败', e)
		}
		// #endif
		
		// #ifndef H5
		this.checkStoragePermissionAndSaveForBatch(imageData, callback, isLast)
		// #endif
		
		if (isLast) {
			uni.hideLoading()
			uni.showToast({
				title: '全部生成完成',
				icon: 'success'
			})
		}
		callback()
	},
	
	// #ifndef H5
	checkStoragePermissionAndSaveForBatch(imageData, callback, isLast) {
		const main = plus.android.runtimeMainActivity()
		const Build = plus.android.importClass('android.os.Build')
		const sdkInt = Build.VERSION.SDK_INT
		
		if (sdkInt >= 30) {
			const Environment = plus.android.importClass('android.os.Environment')
			if (!Environment.isExternalStorageManager()) {
				if (isLast) {
					uni.hideLoading()
					uni.showModal({
						title: '需要授予权限',
						content: '保存到自定义目录需要"所有文件访问权限"',
						confirmText: '去设置',
						cancelText: '取消',
						success: (res) => {
							if (res.confirm) {
								this.openAllFilesAccessSetting()
							}
						}
					})
				}
				callback()
				return
			}
		} else {
			const result = plus.android.checkPermission('android.permission.WRITE_EXTERNAL_STORAGE')
			if (result === -1) {
				if (isLast) {
					uni.hideLoading()
					uni.showToast({
						title: '未授予存储权限',
						icon: 'none'
					})
				}
				callback()
				return
			}
		}
		
		this.saveImageToCustomPathForBatch(imageData, callback, isLast)
	},
	
	saveImageToCustomPathForBatch(imageData, callback, isLast) {
		const fileName = this.generateTimestampFileName()
		const targetDir = '/storage/emulated/0/lebang/waterimages/'
		
		plus.io.resolveLocalFileSystemURL(targetDir, 
			(dirEntry) => {
				this.copyFileToTargetForBatch(imageData, dirEntry, fileName, callback, isLast)
			},
			() => {
				plus.io.resolveLocalFileSystemURL('/storage/emulated/0/', (rootEntry) => {
					rootEntry.getDirectory('lebang', { create: true }, (lebangDir) => {
						lebangDir.getDirectory('waterimages', { create: true }, (waterDir) => {
							this.copyFileToTargetForBatch(imageData, waterDir, fileName, callback, isLast)
						}, () => {
							callback()
						})
					}, () => {
						callback()
					})
				}, () => {
					callback()
				})
			}
		)
	},
	
	copyFileToTargetForBatch(imageData, targetDirEntry, fileName, callback, isLast) {
		plus.io.resolveLocalFileSystemURL(imageData, (sourceEntry) => {
			this.findAvailableFileName(targetDirEntry, fileName, (finalFileName) => {
				sourceEntry.copyTo(targetDirEntry, finalFileName,
					(newEntry) => {
						this.scanMediaFile(newEntry.fullPath, () => {
							callback()
						})
					},
					() => {
						callback()
					}
				)
			})
		}, () => {
			callback()
		})
	},
	// #endif
		drawWatermark() {
			uni.getImageInfo({
				src: this.imagePath,
				success: (imageInfo) => {
					const targetWidth = 1080
					const targetHeight = (imageInfo.height / imageInfo.width) * targetWidth
					
					this.canvasWidth = targetWidth
					this.canvasHeight = targetHeight
					
					this.$nextTick(() => {
						const ctx = uni.createCanvasContext('watermarkCanvas', this)
						const scale = targetWidth / 750
						
						ctx.drawImage(this.imagePath, 0, 0, targetWidth, targetHeight)
						this.drawWatermarkContent(ctx, targetWidth, targetHeight, scale)
						
						ctx.draw(false, () => {
							let delay = 500
							// #ifdef APP-PLUS
							delay = 800
							// #endif
							// #ifdef H5
							delay = 300
							// #endif
							
							setTimeout(() => {
								uni.canvasToTempFilePath({
									canvasId: 'watermarkCanvas',
									width: targetWidth,
									height: targetHeight,
									destWidth: targetWidth,
									destHeight: targetHeight,
									fileType: 'jpg',
									quality: 0.9,
									success: (res) => {
										this.processImageWithExif(res.tempFilePath)
									},
									fail: (err) => {
										uni.hideLoading()
										uni.showToast({
											title: '生成失败',
											icon: 'none'
										})
									}
								}, this)
							}, delay)
						})
					})
				},
				fail: () => {
					uni.hideLoading()
					uni.showToast({
						title: '图片加载失败',
						icon: 'none'
					})
				}
			})
		},
		// 绘制圆角矩形辅助函数
		drawRoundedRect(ctx, x, y, width, height, radius, color) {
			ctx.setFillStyle(color)
			ctx.beginPath()
			ctx.moveTo(x + radius, y)
			ctx.lineTo(x + width - radius, y)
			ctx.arc(x + width - radius, y + radius, radius, 1.5 * Math.PI, 2 * Math.PI)
			ctx.lineTo(x + width, y + height - radius)
			ctx.arc(x + width - radius, y + height - radius, radius, 0, 0.5 * Math.PI)
			ctx.lineTo(x + radius, y + height)
			ctx.arc(x + radius, y + height - radius, radius, 0.5 * Math.PI, Math.PI)
			ctx.lineTo(x, y + radius)
			ctx.arc(x + radius, y + radius, radius, Math.PI, 1.5 * Math.PI)
			ctx.closePath()
			ctx.fill()
		},
		// 生成时间戳文件名（格式：年月日时分秒.jpg）
		// 使用用户选择的时间，而不是当前时间
		generateTimestampFileName() {
			// 使用用户选择的日期和时间
			const dateStr = this.formData.date // 格式：YYYY-MM-DD
			const [year, month, day] = dateStr.split('-')
			const hour = this.formData.time.hour
			const minute = this.formData.time.minute
			const second = this.formData.time.second
			return `${year}${month}${day}${hour}${minute}${second}.jpg`
		},
		
		// 将用户选择的时间转换为EXIF格式（YYYY:MM:DD HH:MM:SS）
		generateExifDateTime() {
			const dateStr = this.formData.date // YYYY-MM-DD
			const hour = this.formData.time.hour
			const minute = this.formData.time.minute
			const second = this.formData.time.second
			return `${dateStr.replace(/-/g, ':')} ${hour}:${minute}:${second}`
		},
		
		// 为图片添加EXIF数据
		addExifToImage(base64Image) {
			try {
				// 生成EXIF时间字符串
				const exifDateTime = this.generateExifDateTime()
				
				// 创建EXIF对象
				const zeroth = {}
				const exif = {}
				const gps = {}
				
				// 写入时间信息
				exif[piexif.ExifIFD.DateTimeOriginal] = exifDateTime  // 拍摄时间
				exif[piexif.ExifIFD.DateTimeDigitized] = exifDateTime // 数字化时间
				zeroth[piexif.ImageIFD.DateTime] = exifDateTime        // 修改时间
				
				// 写入软件信息（可选）
				zeroth[piexif.ImageIFD.Software] = 'WatermarkTool'
				
				// 如果需要写入GPS坐标（可选）
				// 注意：这里的坐标是用于加密的随机坐标，如果不想暴露可以不写入
				// const coords = this.generateRandomCoordinates()
				// gps[piexif.GPSIFD.GPSLatitude] = piexif.GPSHelper.degToDmsRational(coords.latitude)
				// gps[piexif.GPSIFD.GPSLongitude] = piexif.GPSHelper.degToDmsRational(coords.longitude)
				
				// 组装EXIF数据
				const exifObj = {
					'0th': zeroth,
					'Exif': exif,
					'GPS': gps
				}
				
				// 转换为二进制
				const exifBytes = piexif.dump(exifObj)
				
				// 插入EXIF到图片
				const newBase64 = piexif.insert(exifBytes, base64Image)
				
				return newBase64
			} catch (err) {
				// 如果添加EXIF失败，返回原图
				return base64Image
			}
		},
		
		// 处理图片并添加EXIF数据
		processImageWithExif(tempFilePath) {
			// #ifdef H5
			// H5环境：将Canvas输出转换为Base64，添加EXIF后再转回Blob URL
			if (tempFilePath.startsWith('data:image')) {
				// 已经是Base64格式
				try {
					const base64WithExif = this.addExifToImage(tempFilePath)
					this.resultImage = base64WithExif
					uni.hideLoading()
					// 生成成功后自动保存
					this.saveImage()
				} catch (err) {
					// 降级：使用原图
					this.resultImage = tempFilePath
					uni.hideLoading()
					// 生成成功后自动保存
					this.saveImage()
				}
			} else {
				// Blob URL，需要转换为Base64
				fetch(tempFilePath)
					.then(res => res.blob())
					.then(blob => {
						const reader = new FileReader()
						reader.onload = (e) => {
							try {
								const base64 = e.target.result
								const base64WithExif = this.addExifToImage(base64)
								this.resultImage = base64WithExif
								uni.hideLoading()
								// 生成成功后自动保存
								this.saveImage()
							} catch (err) {
								this.resultImage = tempFilePath
								uni.hideLoading()
								// 生成成功后自动保存
								this.saveImage()
							}
						}
						reader.readAsDataURL(blob)
					})
					.catch(err => {
						this.resultImage = tempFilePath
						uni.hideLoading()
						// 生成成功后自动保存
						this.saveImage()
					})
			}
			// #endif
			
			// #ifndef H5
			// APP环境：读取文件，添加EXIF，保存为新文件
			plus.io.resolveLocalFileSystemURL(tempFilePath, (entry) => {
				entry.file((file) => {
					const reader = new plus.io.FileReader()
					reader.onloadend = (e) => {
						try {
							const base64 = e.target.result
							const base64WithExif = this.addExifToImage(base64)
							
							// 将Base64保存为新的临时文件
							const newFileName = '_temp_exif_' + Date.now() + '.jpg'
							const newFilePath = entry.filesystem.root.toLocalURL() + newFileName
							
							// 转换Base64为二进制数据并写入文件
							const base64Data = base64WithExif.split(',')[1]
							const byteCharacters = atob(base64Data)
							const byteNumbers = new Array(byteCharacters.length)
							for (let i = 0; i < byteCharacters.length; i++) {
								byteNumbers[i] = byteCharacters.charCodeAt(i)
							}
							const byteArray = new Uint8Array(byteNumbers)
							
					entry.filesystem.root.getFile(newFileName, { create: true }, (newEntry) => {
						newEntry.createWriter((writer) => {
							writer.onwrite = () => {
								this.resultImage = newEntry.toLocalURL()
								uni.hideLoading()
								// 生成成功后自动保存
								this.saveImage()
							}
							writer.onerror = (err) => {
								// 降级：使用原图
								this.resultImage = tempFilePath
								uni.hideLoading()
								// 生成成功后自动保存
								this.saveImage()
							}
							writer.write(byteArray.buffer)
						})
					})
				} catch (err) {
					// 降级：使用原图
					this.resultImage = tempFilePath
					uni.hideLoading()
					// 生成成功后自动保存
					this.saveImage()
				}
					}
				reader.readAsDataURL(file)
			})
		}, (err) => {
			// 降级：使用原图
			this.resultImage = tempFilePath
			uni.hideLoading()
			// 生成成功后自动保存
			this.saveImage()
		})
		// #endif
	},
		
		saveImage() {
			if (!this.resultImage) return
			
		// #ifdef H5
		// H5 环境：使用浏览器下载
		try {
			const fileName = this.generateTimestampFileName()
			const link = document.createElement('a')
			link.href = this.resultImage
			link.download = fileName
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			uni.showToast({
				title: '保存成功',
				icon: 'success'
			})
		} catch (e) {
			uni.showToast({
				title: `下载失败: ${e.message || '未知错误'}`,
				icon: 'none',
				duration: 3000
			})
		}
		// #endif

			// #ifndef H5
			// APP环境：先检查"所有文件访问权限"，然后保存到 /lebang/waterimages/
			this.checkStoragePermissionAndSave()
			// #endif
		},
		
		// #ifndef H5
		// 检查存储权限（Android 11+ 需要"所有文件访问权限"）
		checkStoragePermissionAndSave() {
			// 检查 Android 版本
			const main = plus.android.runtimeMainActivity()
			const Build = plus.android.importClass('android.os.Build')
			const sdkInt = Build.VERSION.SDK_INT
			
			// Android 11 (API 30) 及以上需要 MANAGE_EXTERNAL_STORAGE 权限
			if (sdkInt >= 30) {
				const Environment = plus.android.importClass('android.os.Environment')
				const hasPermission = Environment.isExternalStorageManager()
				
				if (!hasPermission) {
					// 没有权限，引导用户去设置
					uni.showModal({
						title: '需要授予权限',
						content: '保存到自定义目录需要"所有文件访问权限"\n\n点击确定后，请在设置页面开启"允许访问所有文件"',
						confirmText: '去设置',
						cancelText: '取消',
						success: (res) => {
							if (res.confirm) {
								this.openAllFilesAccessSetting()
							}
						}
					})
					return
				}
			} else {
				// Android 10 及以下，检查 WRITE_EXTERNAL_STORAGE 权限
				const result = plus.android.checkPermission('android.permission.WRITE_EXTERNAL_STORAGE')
				
				if (result === -1) {
					// 没有权限，动态申请
					plus.android.requestPermissions(
						['android.permission.WRITE_EXTERNAL_STORAGE'],
						(resultObj) => {
							for (const name in resultObj.granted) {
								if (resultObj.granted[name]) {
									this.saveImageToCustomPath()
									return
								}
							}
							uni.showToast({
								title: '未授予存储权限',
								icon: 'none'
							})
						},
						(error) => {
							uni.showToast({
								title: '权限申请失败',
								icon: 'none'
							})
						}
					)
					return
				}
			}
			
			// 有权限，直接保存
			this.saveImageToCustomPath()
		},
		
		// 打开"所有文件访问权限"设置页面（Android 11+）
		openAllFilesAccessSetting() {
			try {
				const main = plus.android.runtimeMainActivity()
				const Intent = plus.android.importClass('android.content.Intent')
				const Settings = plus.android.importClass('android.provider.Settings')
				const Uri = plus.android.importClass('android.net.Uri')
				
				const intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
				const uri = Uri.parse('package:' + main.getPackageName())
				intent.setData(uri)
				
				main.startActivity(intent)
				
				uni.showToast({
					title: '请在设置中开启权限',
					icon: 'none',
					duration: 3000
				})
			} catch (e) {
				uni.showToast({
					title: '无法打开设置页面',
					icon: 'none'
				})
			}
		},
		// #endif
		
		// #ifndef H5
		// APP端保存到自定义路径
		saveImageToCustomPath() {
			uni.showLoading({
				title: '保存中...',
				mask: true
			})
			
			// 超时保护
			const timeoutId = setTimeout(() => {
				uni.hideLoading()
				uni.showToast({
					title: '保存超时',
					icon: 'none'
				})
			}, 10000)
			
			const fileName = this.generateTimestampFileName()
			const targetDir = '/storage/emulated/0/lebang/waterimages/'
			
			// 先确保目录存在
			plus.io.resolveLocalFileSystemURL(targetDir, 
				(dirEntry) => {
					this.copyFileToTarget(timeoutId, dirEntry, fileName)
				},
				(err) => {
					// 目录不存在，创建它
					plus.io.resolveLocalFileSystemURL('/storage/emulated/0/', (rootEntry) => {
						rootEntry.getDirectory('lebang', { create: true }, (lebangDir) => {
							lebangDir.getDirectory('waterimages', { create: true }, (waterDir) => {
								this.copyFileToTarget(timeoutId, waterDir, fileName)
							}, (createErr) => {
								clearTimeout(timeoutId)
								uni.hideLoading()
								uni.showToast({ title: '创建目录失败', icon: 'none' })
							})
					}, (createErr) => {
						clearTimeout(timeoutId)
						uni.hideLoading()
						uni.showToast({ 
							title: `创建目录失败: ${createErr.message || createErr.code || '未知错误'}`, 
							icon: 'none',
							duration: 3000
						})
					})
				}, (rootErr) => {
					clearTimeout(timeoutId)
					uni.hideLoading()
					uni.showToast({ 
						title: `访问根目录失败: ${rootErr.message || rootErr.code || '未知错误'}`, 
						icon: 'none',
						duration: 3000
					})
				})
				}
			)
		},
		
		// 复制文件到目标目录（自动处理重名）
		copyFileToTarget(timeoutId, targetDirEntry, fileName) {
			plus.io.resolveLocalFileSystemURL(this.resultImage, (sourceEntry) => {
				// 递归检查文件名，如果重复则递增最后一位数字
				this.findAvailableFileName(targetDirEntry, fileName, (finalFileName) => {
					sourceEntry.copyTo(targetDirEntry, finalFileName,
						(newEntry) => {
							clearTimeout(timeoutId)
							uni.hideLoading()
							
							// 刷新媒体库，让其他APP能读取到
							this.scanMediaFile(newEntry.fullPath, () => {
								uni.showToast({
									title: '保存成功',
									icon: 'success'
								})
							})
						},
					(copyErr) => {
						clearTimeout(timeoutId)
						uni.hideLoading()
						uni.showToast({
							title: `复制失败: ${copyErr.message || copyErr.code || '未知错误'}`,
							icon: 'none',
							duration: 3000
						})
					}
				)
			})
		}, (sourceErr) => {
			clearTimeout(timeoutId)
			uni.hideLoading()
			uni.showToast({
				title: `访问源文件失败: ${sourceErr.message || sourceErr.code || '未知错误'}`,
				icon: 'none',
				duration: 3000
			})
		})
		},
		
		// 查找可用的文件名（处理重名）
		findAvailableFileName(dirEntry, fileName, callback) {
			const targetPath = dirEntry.fullPath + fileName
			
			plus.io.resolveLocalFileSystemURL(targetPath,
				(entry) => {
					// 文件已存在，需要更名
					const nameWithoutExt = fileName.replace('.jpg', '')
					const lastChar = nameWithoutExt[nameWithoutExt.length - 1]
					let newFileName
					
					// 如果最后一位是数字，递增它
					if (!isNaN(parseInt(lastChar))) {
						const newLastDigit = (parseInt(lastChar) + 1) % 10
						newFileName = nameWithoutExt.substring(0, nameWithoutExt.length - 1) + newLastDigit + '.jpg'
					} else {
						// 最后一位不是数字，添加 _1
						newFileName = nameWithoutExt + '1.jpg'
					}
					
					// 递归检查新文件名
					this.findAvailableFileName(dirEntry, newFileName, callback)
				},
				(err) => {
					// 文件不存在，可以使用这个文件名
					callback(fileName)
				}
			)
		},
		
		// 刷新媒体库（让其他APP能读取到文件）
		scanMediaFile(filePath, callback) {
			try {
				const main = plus.android.runtimeMainActivity()
				const Intent = plus.android.importClass('android.content.Intent')
				const Uri = plus.android.importClass('android.net.Uri')
				const File = plus.android.importClass('java.io.File')
				
				// 创建文件对象
				const file = new File(filePath)
				const uri = Uri.fromFile(file)
				
				// 发送媒体扫描广播
				const intent = new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE)
				intent.setData(uri)
				main.sendBroadcast(intent)
				
				if (callback) {
					// 延迟一下确保扫描完成
					setTimeout(callback, 500)
				}
			} catch (e) {
				// 即使扫描失败也执行回调
				if (callback) {
					callback()
				}
			}
		},
		// #endif
		
	// ===== 图片预览相关方法 =====
	previewImage(url) {
		this.previewImageUrl = url
		this.showPreview = true
		this.resetTransform()
		
		// #ifdef H5
		// 在 H5 环境下，延迟一帧后绑定原生 wheel 事件
		this.$nextTick(() => {
			setTimeout(() => {
				const previewContent = document.querySelector('.preview-content')
				if (previewContent) {
					// 移除旧的监听器（如果存在）
					if (this.nativeWheelHandler) {
						previewContent.removeEventListener('wheel', this.nativeWheelHandler)
					}
					
					// 创建新的监听器
					this.nativeWheelHandler = (e) => {
						e.preventDefault()
						e.stopPropagation()
						
						let newScale
						if (e.deltaY > 0) {
							// 向下滚，缩小 10%（相对于基础值 100%）
							newScale = this.scale - 0.1
						} else {
							// 向上滚，放大 10%（相对于基础值 100%）
							newScale = this.scale + 0.1
						}
						
						// 限制缩放范围：最小为 0.5，最大为 5 倍
						newScale = Math.max(0.5, Math.min(5, newScale))
						
						this.scale = newScale
						this.lastScale = newScale
					}
					
					// 绑定监听器（passive: false 允许 preventDefault）
					previewContent.addEventListener('wheel', this.nativeWheelHandler, { passive: false })
				}
			}, 100)
		})
		// #endif
		
	// 获取图片信息，计算初始缩放比例（让图片撑满屏幕）
	uni.getImageInfo({
		src: url,
		success: (res) => {
			this.imageWidth = res.width
			this.imageHeight = res.height
			const imgRatio = this.imageWidth / this.imageHeight
			
			// 获取屏幕尺寸
			const systemInfo = uni.getSystemInfoSync()
			this.containerWidth = systemInfo.windowWidth
			this.containerHeight = systemInfo.windowHeight
			const screenRatio = this.containerWidth / this.containerHeight
			
			// 计算初始缩放比例，让图片撑满屏幕（宽度或高度优先）
			// 如果图片更宽，则按宽度撑满；如果图片更高，则按高度撑满
			if (imgRatio > screenRatio) {
				// 图片更宽，按宽度撑满
				this.initialScale = 1
			} else {
				// 图片更高或比例相同，按高度撑满
				this.initialScale = 1
			}
			
			this.scale = this.initialScale
			this.lastScale = this.initialScale
		}
	})
	},
	closePreview() {
		// #ifdef H5
		// 移除原生 wheel 事件监听器
		const previewContent = document.querySelector('.preview-content')
		if (previewContent && this.nativeWheelHandler) {
			previewContent.removeEventListener('wheel', this.nativeWheelHandler)
			this.nativeWheelHandler = null
		}
		// #endif
		
		this.showPreview = false
		setTimeout(() => {
			this.resetTransform()
		}, 300)
	},
		resetTransform() {
			this.scale = 1
			this.initialScale = 1
			this.translateX = 0
			this.translateY = 0
			this.lastScale = 1
			this.lastTranslateX = 0
			this.lastTranslateY = 0
		},
		
	// 触摸开始
	handleTouchStart(e) {
		if (e.touches.length === 1) {
			// 单指拖动
			this.isDragging = true
			this.startX = e.touches[0].clientX
			this.startY = e.touches[0].clientY
		} else if (e.touches.length === 2) {
			// 双指缩放
			this.isScaling = true
			this.isDragging = false
			const touch1 = e.touches[0]
			const touch2 = e.touches[1]
			this.startDistance = this.getDistance(touch1, touch2)
			this.lastScale = this.scale
			
			// 计算双指中心点（相对于容器）
			this.pinchCenterX = (touch1.clientX + touch2.clientX) / 2
			this.pinchCenterY = (touch1.clientY + touch2.clientY) / 2
		}
	},
		
	// 触摸移动
	handleTouchMove(e) {
		e.preventDefault()
		if (e.touches.length === 1 && this.isDragging) {
			// 单指拖动
			const deltaX = e.touches[0].clientX - this.startX
			const deltaY = e.touches[0].clientY - this.startY
			
			const newX = this.lastTranslateX + deltaX
			const newY = this.lastTranslateY + deltaY
			
			// 限制边界
			const limited = this.limitBoundary(newX, newY)
			this.translateX = limited.x
			this.translateY = limited.y
		} else if (e.touches.length === 2 && this.isScaling) {
			// 双指缩放（以手指中心点为缩放中心）
			const touch1 = e.touches[0]
			const touch2 = e.touches[1]
			const distance = this.getDistance(touch1, touch2)
			const scaleChange = distance / this.startDistance
			
			// 计算新缩放值，限制范围为 initialScale（撑满） 到 5 倍
			let newScale = this.lastScale * scaleChange
			newScale = Math.max(this.initialScale, Math.min(5, newScale))
			
			// 计算缩放中心相对于容器中心的偏移
			const centerOffsetX = this.pinchCenterX - this.containerWidth / 2
			const centerOffsetY = this.pinchCenterY - this.containerHeight / 2
			
			// 计算缩放比例变化
			const scaleRatio = newScale / this.lastScale
			
			// 调整位移，使缩放以手指中心点为中心
			// 公式：新位移 = (旧位移 - 中心偏移) * 缩放比例 + 中心偏移
			const newTranslateX = (this.lastTranslateX - centerOffsetX) * scaleRatio + centerOffsetX
			const newTranslateY = (this.lastTranslateY - centerOffsetY) * scaleRatio + centerOffsetY
			
			this.scale = newScale
			this.translateX = newTranslateX
			this.translateY = newTranslateY
		}
	},
		
	// 触摸结束
	handleTouchEnd(e) {
		if (e.touches.length === 0) {
			this.isDragging = false
			this.isScaling = false
			
			// 检查是否需要回弹
			this.checkAndSpringBack()
		} else if (e.touches.length === 1) {
			// 从双指变为单指
			this.isScaling = false
			this.checkAndSpringBack()
		}
	},
		
		// 鼠标按下
		handleMouseDown(e) {
			this.isDragging = true
			this.startX = e.clientX
			this.startY = e.clientY
		},
		
		// 鼠标移动
		handleMouseMove(e) {
			if (!this.isDragging) return
			
			const deltaX = e.clientX - this.startX
			const deltaY = e.clientY - this.startY
			
			const newX = this.lastTranslateX + deltaX
			const newY = this.lastTranslateY + deltaY
			
			// 限制边界
			const limited = this.limitBoundary(newX, newY)
			this.translateX = limited.x
			this.translateY = limited.y
		},
		
	// 鼠标松开
	handleMouseUp(e) {
		if (this.isDragging) {
			this.isDragging = false
			// 检查是否需要回弹
			this.checkAndSpringBack()
		}
	},
		
	// 鼠标滚轮缩放（已废弃，H5 环境使用原生事件绑定）
	// 保留此方法以兼容其他平台（如果需要）
	handleWheel(e) {
		// 此方法在 H5 环境下不会被调用，因为我们直接绑定了原生事件
		// 其他平台（小程序等）可能仍需要此方法
		console.log('handleWheel 被调用（非 H5 原生绑定）')
	},
		
	// 计算两点间距离
	getDistance(touch1, touch2) {
		const dx = touch1.clientX - touch2.clientX
		const dy = touch1.clientY - touch2.clientY
		return Math.sqrt(dx * dx + dy * dy)
	},
	
	// 检查并执行回弹动画
	checkAndSpringBack() {
		let needSpringBack = false
		let targetScale = this.scale
		let targetX = this.translateX
		let targetY = this.translateY
		
		// 1. 检查缩放是否小于最小值
		if (this.scale < this.initialScale) {
			targetScale = this.initialScale
			needSpringBack = true
		}
		
		// 2. 使用目标缩放计算边界，检查位移是否超出
		const scaledWidth = this.imageWidth * targetScale
		const scaledHeight = this.imageHeight * targetScale
		
		// 水平方向检查
		if (scaledWidth > this.containerWidth) {
			const maxX = (scaledWidth - this.containerWidth) / 2
			if (this.translateX > maxX) {
				targetX = maxX
				needSpringBack = true
			} else if (this.translateX < -maxX) {
				targetX = -maxX
				needSpringBack = true
			}
		} else {
			if (this.translateX !== 0) {
				targetX = 0
				needSpringBack = true
			}
		}
		
		// 垂直方向检查
		if (scaledHeight > this.containerHeight) {
			const maxY = (scaledHeight - this.containerHeight) / 2
			if (this.translateY > maxY) {
				targetY = maxY
				needSpringBack = true
			} else if (this.translateY < -maxY) {
				targetY = -maxY
				needSpringBack = true
			}
		} else {
			if (this.translateY !== 0) {
				targetY = 0
				needSpringBack = true
			}
		}
		
		// 3. 如果需要回弹，执行动画
		if (needSpringBack) {
			this.springBack(targetScale, targetX, targetY)
		} else {
			// 不需要回弹，直接更新 last 值
			this.lastScale = this.scale
			this.lastTranslateX = this.translateX
			this.lastTranslateY = this.translateY
		}
	},
	
	// 执行回弹动画
	springBack(targetScale, targetX, targetY) {
		this.isSpringBack = true
		
		const startScale = this.scale
		const startX = this.translateX
		const startY = this.translateY
		
		const duration = 300 // 动画时长（毫秒）
		const startTime = Date.now()
		
		const animate = () => {
			const currentTime = Date.now()
			const elapsed = currentTime - startTime
			const progress = Math.min(elapsed / duration, 1)
			
			// 使用缓动函数（easeOutCubic）
			const easeProgress = 1 - Math.pow(1 - progress, 3)
			
			// 插值计算当前值
			this.scale = startScale + (targetScale - startScale) * easeProgress
			this.translateX = startX + (targetX - startX) * easeProgress
			this.translateY = startY + (targetY - startY) * easeProgress
			
			if (progress < 1) {
				requestAnimationFrame(animate)
			} else {
				// 动画结束，确保精确到达目标值
				this.scale = targetScale
				this.translateX = targetX
				this.translateY = targetY
				this.isSpringBack = false
				
				// 更新 last 值
				this.lastScale = this.scale
				this.lastTranslateX = this.translateX
				this.lastTranslateY = this.translateY
			}
		}
		
		requestAnimationFrame(animate)
	},
	
	// 限制边界（确保至少两个边固定）
	limitBoundary(x, y) {
		// 计算图片缩放后的实际尺寸
		const scaledWidth = this.imageWidth * this.scale
		const scaledHeight = this.imageHeight * this.scale
		
		let limitedX = x
		let limitedY = y
		
		// 水平方向边界限制
		if (scaledWidth > this.containerWidth) {
			// 图片宽度大于容器，可以拖动，但不能完全拖出
			const maxX = (scaledWidth - this.containerWidth) / 2
			limitedX = Math.max(-maxX, Math.min(maxX, x))
		} else {
			// 图片宽度小于容器，不允许拖动，保持居中
			limitedX = 0
		}
		
		// 垂直方向边界限制
		if (scaledHeight > this.containerHeight) {
			// 图片高度大于容器，可以拖动，但不能完全拖出
			const maxY = (scaledHeight - this.containerHeight) / 2
			limitedY = Math.max(-maxY, Math.min(maxY, y))
		} else {
			// 图片高度小于容器，不允许拖动，保持居中
			limitedY = 0
		}
		
		return {
			x: limitedX,
			y: limitedY
		}
	}
	}
}
</script>

<style lang="scss" scoped>
.page {
	min-height: 100vh;
	background: linear-gradient(180deg, #f5f7fa 0%, #c3cfe2 100%);
}

.content {
	min-height: 100vh;
	padding: 40rpx;
	padding-bottom: 140rpx;
	box-sizing: border-box;
}

.upload-section,
.form-section,
.generate-section,
.result-section {
	margin-bottom: 40rpx;
}

.section-title {
	font-size: 32rpx;
	font-weight: 700;
	color: #333;
	margin-bottom: 20rpx;
	display: flex;
	align-items: center;
}

.section-title::before {
	content: '';
	width: 6rpx;
	height: 32rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 3rpx;
	margin-right: 12rpx;
}

/* 上传区域 */
.upload-area {
	background: white;
	border-radius: 24rpx;
	padding: 120rpx 40rpx;
	text-align: center;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.upload-icon {
	font-size: 80rpx;
	display: block;
	margin-bottom: 20rpx;
}

.upload-text {
	font-size: 28rpx;
	color: #999;
}

.image-preview {
	background: white;
	border-radius: 24rpx;
	padding: 20rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.preview-img {
	width: 100%;
	max-height: 500rpx;
	border-radius: 16rpx;
}

.images-preview {
	background: white;
	border-radius: 24rpx;
	padding: 20rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.images-count {
	font-size: 28rpx;
	color: #333;
	text-align: center;
	padding: 40rpx 0;
}

.image-actions {
	display: flex;
	gap: 20rpx;
	margin-top: 20rpx;
}

.action-btn {
	flex: 1;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
	padding: 20rpx;
	border-radius: 12rpx;
	text-align: center;
	font-size: 28rpx;
}

.action-btn.delete {
	background: #ff6b6b;
}

/* 表单输入 - 最简实现 */
.simple-input {
	width: 100%;
	height: 90rpx;
	background: #ffffff;
	border: 2rpx solid #dddddd;
	border-radius: 12rpx;
	padding: 0 24rpx;
	font-size: 28rpx;
	color: #333333;
	box-sizing: border-box;
}

.delete-icon {
	color: #ff6b6b;
	font-size: 40rpx;
	width: 50rpx;
	text-align: center;
}

/* 时间选择器 */
.time-selector {
	display: flex;
	gap: 20rpx;
}

.time-item {
	flex: 1;
	background: white;
	border-radius: 16rpx;
	padding: 24rpx 30rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.time-label {
	font-size: 24rpx;
	color: #999;
}

.time-value {
	font-size: 28rpx;
	color: #333;
	font-weight: 500;
}

/* 生成按钮 */
.generate-btn {
	width: 100%;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
	padding: 28rpx;
	border-radius: 16rpx;
	font-size: 32rpx;
	font-weight: 600;
	border: none;
}

.generate-btn.disabled {
	opacity: 0.5;
	cursor: not-allowed;
	/* 不阻止点击，让用户能看到提示 */
}

.generate-btn:not(.disabled) {
	cursor: pointer;
}

/* 结果区域 */
.result-img {
	width: 100%;
	border-radius: 16rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.result-actions {
	margin-top: 30rpx;
}

.save-btn {
	width: 100%;
	background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
	color: white;
	padding: 28rpx;
	border-radius: 16rpx;
	font-size: 32rpx;
	font-weight: 600;
	border: none;
}

/* 已移除自定义时间选择弹窗样式（改用 picker mode=time） */

/* 图片预览弹窗样式 */
.image-preview-modal {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.9);
	z-index: 9999;
	display: flex;
	align-items: center;
	justify-content: center;
	animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

.preview-container {
	width: 100%;
	height: 100%;
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	transform: scale(0.8);
	opacity: 0;
	transition: all 0.3s ease;
}

.preview-container.show {
	transform: scale(1);
	opacity: 1;
}

.preview-content {
	width: 100%;
	height: 100%;
	position: relative;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: grab;
}

.preview-content:active {
	cursor: grabbing;
}

.preview-image {
	width: 100%;
	height: 100%;
	object-fit: contain;
	transform-origin: center center;
	user-select: none;
	-webkit-user-drag: none;
	pointer-events: none;
}

.close-btn {
	position: absolute;
	top: 40rpx;
	right: 40rpx;
	width: 80rpx;
	height: 80rpx;
	background: rgba(255, 255, 255, 0.2);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 48rpx;
	color: white;
	cursor: pointer;
	transition: all 0.3s ease;
	backdrop-filter: blur(10px);
	-webkit-backdrop-filter: blur(10px);
}

.close-btn:hover {
	background: rgba(255, 255, 255, 0.3);
	transform: rotate(90deg);
}

/* 给预览图片添加点击样式 */
.preview-img,
.result-img {
	cursor: pointer;
	transition: transform 0.2s ease;
}

.preview-img:hover,
.result-img:hover {
	transform: scale(1.02);
}

</style>
