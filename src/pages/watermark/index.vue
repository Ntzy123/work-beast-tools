<template>
	<view class="page">
		<!-- 使用统一容器，通过类名处理 H5 滚动差异 -->
		<view class="content">
			<!-- 图片上传区域 -->
			<view class="upload-section">
				<view class="section-title">选择图片</view>
				<view class="upload-area" @click="chooseImage" v-if="!imagePath">
					<text class="upload-icon">📷</text>
					<text class="upload-text">点击上传图片</text>
				</view>
			<view class="image-preview" v-else>
				<image :src="imagePath" mode="aspectFit" class="preview-img" @click="previewImage(imagePath)"></image>
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
				<view class="result-actions">
					<button class="save-btn" @click="saveImage">保存图片</button>
				</view>
			</view>
			</view>

		<!-- 隐藏的canvas用于绘制 -->
		<canvas 
			canvas-id="watermarkCanvas" 
			id="watermarkCanvas"
			:style="{ width: canvasWidth + 'px', height: canvasHeight + 'px', position: 'fixed', left: '-9999px', top: '-9999px', pointerEvents: 'none', zIndex: -1 }"
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
							transition: isDragging || isScaling ? 'none' : 'transform 0.3s ease'
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
			resultImage: '',
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
		nativeWheelHandler: null  // 存储原生 wheel 事件处理器的引用
	}
	},
	computed: {
		canGenerate() {
			const hasImage = !!this.imagePath
			const hasName = !!(this.formData.name && this.formData.name.trim())
			const canGen = hasImage && hasName
			console.log('canGenerate检查:', {
				imagePath: this.imagePath,
				hasImage,
				name: this.formData.name,
				nameLength: this.formData.name ? this.formData.name.length : 0,
				nameTrimmed: this.formData.name ? this.formData.name.trim() : '',
				hasName,
				canGenerate: canGen
			})
			return canGen
		},
		timeValue() {
			return `${this.formData.time.hour}:${this.formData.time.minute}`
		}
	},
	onLoad() {
		// no-op
	},
	methods: {
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
		
		// 生成加密的二维码文本
		generateQRCodeText() {
			// 1. 获取员工ID
			const staffId = staffMap[this.formData.name]
			if (!staffId) {
				console.error('未找到该员工的ID:', this.formData.name)
				return null
			}
			
			// 2. 生成Unix时间戳（秒）
			const dateStr = `${this.formData.date} ${this.formData.time.hour}:${this.formData.time.minute}:${String(this.formData.time.second).padStart(2, '0')}`
			const timestamp = Math.floor(new Date(dateStr).getTime() / 1000)
			
			// 3. 在指定矩形范围内随机生成经纬度
			const coords = this.generateRandomCoordinates()
			const la = coords.la
			const lo = coords.lo
			console.log('随机生成的经纬度:', `纬度=${la}, 经度=${lo}`)
			
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
			
			// 6. AES-128-ECB 加密
			const key = CryptoJS.enc.Utf8.parse('e373d090928170eb')
			const encrypted = CryptoJS.AES.encrypt(plainText, key, {
				mode: CryptoJS.mode.ECB,
				padding: CryptoJS.pad.Pkcs7
			})
			
			// 7. Base64 编码
			const encryptedText = encrypted.toString()
			
			// 8. 构建最终的 JSON 字符串（保留 \u003d 不被转义）
			const finalText = `{"text":"${encryptedText.replace(/=/g, '\\u003d')}","version":"v1.0"}`
			
			console.log('生成的二维码文本:', finalText)
			return finalText
		},
		chooseImage() {
			uni.chooseImage({
				count: 1,
				sourceType: ['album', 'camera'],
				success: (res) => {
					this.imagePath = res.tempFilePaths[0]
					console.log('图片选择成功:', this.imagePath)
					console.log('当前canGenerate状态:', this.canGenerate)
				},
				fail: (err) => {
					console.error('选择图片失败:', err)
				}
			})
		},
		removeImage() {
			this.imagePath = ''
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
			console.log('点击生成按钮')
			console.log('canGenerate:', this.canGenerate)
			console.log('imagePath:', this.imagePath, '类型:', typeof this.imagePath, '存在:', !!this.imagePath)
			console.log('name:', this.formData.name, '类型:', typeof this.formData.name, 'trim后:', this.formData.name ? this.formData.name.trim() : '')
			
			// 手动检查，不依赖computed，确保准确性
			const hasImage = !!this.imagePath && this.imagePath.trim && this.imagePath.trim().length > 0
			const hasName = !!(this.formData.name && this.formData.name.trim && this.formData.name.trim().length > 0)
			
			console.log('手动检查结果:', { hasImage, hasName })
			
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
			
			this.generateWatermark()
		},
		generateWatermark() {

			uni.showLoading({
				title: '生成中...'
			})

			// 使用canvas绘制水印
			this.drawWatermark()
		},
		drawWatermark() {
			// 获取图片信息
			uni.getImageInfo({
				src: this.imagePath,
				success: (imageInfo) => {
					// --- 标准化处理：固定宽度为 1080px ---
					const targetWidth = 1080
					const targetHeight = (imageInfo.height / imageInfo.width) * targetWidth
					
					// 设置canvas尺寸为标准化后的尺寸
					this.canvasWidth = targetWidth
					this.canvasHeight = targetHeight
					
				// 等待下一帧确保canvas尺寸更新
				this.$nextTick(() => {
					const ctx = uni.createCanvasContext('watermarkCanvas', this)
					
					// 计算缩放比例（以标准化后的 1080px 为基准）
					const scale = targetWidth / 750
					
					// 【关键修复】：先绘制原图并等待完成，再绘制水印
					// 第一步：绘制图片
					ctx.drawImage(this.imagePath, 0, 0, targetWidth, targetHeight)
					
					// 等待图片绘制完成（使用 draw 的回调）
					ctx.draw(false, () => {
						// 图片绘制完成，继续绘制水印元素
						// 重新获取 context（确保状态正确）
						const ctx2 = uni.createCanvasContext('watermarkCanvas', this)
					
					// --- 水印样式配置 ---
					const edgePadding = 21 // 左边距离屏幕边缘 21px
					const borderRadius = 16 // 圆角 16px
					const bgColor = 'rgba(0, 0, 0, 0.3)' // 【透明度修改处】：0.3 表示更透明，数字越小越透明
					const textColor = '#ffffff'
					
					// 1. 绘制上方信息块（时间、姓名、日期）
					const timeFontSize = 74 // 时间字体 74px
					ctx2.setFontSize(timeFontSize)
					const timeText = this.formData.time.hour + ':' + this.formData.time.minute
					const timeWidth = ctx2.measureText ? ctx2.measureText(timeText).width : 140
					
					const timeInnerPadding = 15 * scale
					const textStartX = edgePadding + timeInnerPadding + timeWidth + timeInnerPadding
					
					// 准备右侧文本
					const smallFontSize = 30 // 姓名、日期、定位字体 30px
					ctx2.setFontSize(smallFontSize)
					const nameText = this.formData.name
					const dateText = this.formatDate(this.formData.date)
					const nameWidth = ctx2.measureText ? ctx2.measureText(nameText).width : 80 * scale
					const dateWidth = ctx2.measureText ? ctx2.measureText(dateText).width : 180 * scale
					const rightContentWidth = Math.max(nameWidth, dateWidth)
						
					const infoBoxHeight = 106 // 固定高度 106px
					const infoBoxWidth = 469 // 固定宽度 469px
					const infoBoxX = edgePadding
					
					// 【位置修改处】：定位框距离底边63px，信息框与定位框间距14px
					const locBoxHeight = 62 // 定位框高度
					const bottomMargin = 63 // 定位框距离底边的距离
					const boxGap = 14 // 信息框与定位框之间的距离
				const infoBoxY = targetHeight - bottomMargin - locBoxHeight - boxGap - infoBoxHeight
					
					this.drawRoundedRect(ctx2, infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight, borderRadius, bgColor)
					
					// 绘制时间（垂直居中）
					ctx2.setFillStyle(textColor)
					ctx2.setFontSize(timeFontSize)
					ctx2.setTextAlign('left')
					// 106px 高度，时间垂直居中
					const timeY = infoBoxY + (infoBoxHeight + timeFontSize) / 2 - 10
					ctx2.fillText(timeText, infoBoxX + timeInnerPadding, timeY)
					
					// 绘制姓名和日期（三个间距保持一致）
					ctx2.setFontSize(smallFontSize)
					// 框高106px，两行文字（30px），三个间距相等
					// 计算：(106 - 60) / 3 ≈ 15.33px
					// 姓名：上边距15.33px + baseline偏移24px ≈ 39px
					const nameY = infoBoxY + 43
					// 日期：15.33px + 30px + 15.33px + 24px ≈ 85px
					const dateY = infoBoxY + 89
					ctx2.fillText(nameText, textStartX, nameY)
					ctx2.fillText(dateText, textStartX, dateY)
						
				// 2. 绘制下方定位块（使用相同的圆角和左边距，宽度自适应）
				// locBoxHeight 已在上方定义为 62
				const locBoxY = targetHeight - bottomMargin - locBoxHeight // 【位置修改处】：距离底边63px
				const location = 'Q贵阳首钢贵州之光一期'
					
					ctx2.setFontSize(smallFontSize)
					const locTextWidth = ctx2.measureText ? ctx2.measureText(location).width : 250
					const locIconSpace = 50 * scale // 定位图标和间距占用
					const locBoxWidth = locIconSpace + locTextWidth + 20 // 文字右边距离右边框 20px
					const locBoxX = edgePadding // 使用相同的左边距 21px
					
					this.drawRoundedRect(ctx2, locBoxX, locBoxY, locBoxWidth, locBoxHeight, borderRadius, bgColor)
					
				// 绘制定位图标（水滴形，白色填充，中间圆形空洞）
				const iconWidth = 24 * scale // 圆形部分宽度 24px
				const iconHeight = iconWidth * 1.4 // 高度比例约 1.4
				const iconRadius = iconWidth / 2 // 圆形半径
				const holeRadius = iconRadius * 0.45 // 空洞半径（约 5.4px）
				
				// 绘制位置（垂直居中）
				const iconCenterX = locBoxX + 12 * scale
				const iconCenterY = locBoxY + locBoxHeight / 2
				
				ctx2.save()
				ctx2.translate(iconCenterX, iconCenterY - iconHeight * 0.2) // 向上偏移一点
				
				// 1. 绘制外部水滴形状（白色）
				ctx2.beginPath()
				// 上半部分：半圆（从 -90° 到 270°，即顶部到两侧）
				ctx2.arc(0, 0, iconRadius, -Math.PI / 2, Math.PI / 2, false)
				// 右侧：贝塞尔曲线到底部尖角
				ctx2.bezierCurveTo(
					iconRadius * 0.5, iconRadius * 0.8,   // 控制点1（右侧中部）
					iconRadius * 0.3, iconRadius * 1.8,   // 控制点2（右侧下部）
					0, iconHeight * 0.8                    // 底部尖角
				)
				// 左侧：贝塞尔曲线回到顶部
				ctx2.bezierCurveTo(
					-iconRadius * 0.3, iconRadius * 1.8,  // 控制点1（左侧下部）
					-iconRadius * 0.5, iconRadius * 0.8,  // 控制点2（左侧中部）
					-iconRadius, 0                         // 回到左侧半圆起点
				)
				ctx2.closePath()
				ctx2.setFillStyle('#ffffff')
				ctx2.fill()
				
				// 2. 绘制中间圆形空洞（完全透明）
				ctx2.globalCompositeOperation = 'destination-out'
				ctx2.beginPath()
				ctx2.arc(0, 0, holeRadius, 0, Math.PI * 2)
				ctx2.setFillStyle('#ffffff')
				ctx2.fill()
				ctx2.globalCompositeOperation = 'source-over'
				
				ctx2.restore()
					
					// 绘制定位文字（垂直居中）
					ctx2.setFillStyle('#ffffff')
					ctx2.setFontSize(smallFontSize) // 确保使用 30px 字体
					const locTextY = locBoxY + (locBoxHeight + smallFontSize) / 2 - 4
					ctx2.fillText(location, locBoxX + 50 * scale, locTextY)
						
						// 3. 绘制右下角二维码
						// 使用 qrcode 库生成矩阵数据，然后手动绘制（兼容 Uni-app Canvas）
						try {
							// 动态生成加密的二维码文本
							const qrCodeText = this.generateQRCodeText()
							if (!qrCodeText) {
								throw new Error('无法生成二维码文本，请检查员工姓名是否正确')
							}
							
							const qrData = QRCode.create(qrCodeText, {
								errorCorrectionLevel: 'L' // 7% 容错率
							})
							
							const modules = qrData.modules.data
							const mCount = qrData.modules.size
							
							// 按用户要求设置参数
							const qrSize = 258 // 总尺寸固定为 258x258
							const margin = 6 // 白色边框固定为 6px
							const contentSize = qrSize - margin * 2 // 内容区域 = 258 - 12 = 246px
							const moduleSize = contentSize / mCount // 每个模块的大小
							
							const qrX = targetWidth - qrSize
							const qrY = targetHeight - qrSize
							
					// 1. 绘制白色背景
						ctx2.setFillStyle('#ffffff')
						ctx2.fillRect(qrX, qrY, qrSize, qrSize)
						
						// 2. 绘制黑色模块
						ctx2.setFillStyle('#000000')
						for (let row = 0; row < mCount; row++) {
							for (let col = 0; col < mCount; col++) {
								// modules.data 是一维数组，需要转换索引
								const index = row * mCount + col
								if (modules[index]) {
									// 使用像素边界对齐算法，避免出现缝隙
									const x1 = Math.floor(qrX + margin + col * moduleSize)
									const y1 = Math.floor(qrY + margin + row * moduleSize)
									const x2 = Math.floor(qrX + margin + (col + 1) * moduleSize)
									const y2 = Math.floor(qrY + margin + (row + 1) * moduleSize)
									ctx2.fillRect(x1, y1, x2 - x1, y2 - y1)
								}
							}
						}
						console.log(`二维码生成成功: 版本 ${qrData.version}, 模块数 ${mCount}x${mCount}, 尺寸 ${qrSize}px, 边距 ${margin}px`)
					} catch (qrErr) {
						console.error('二维码生成异常:', qrErr)
					}
					
					// 【关键修复】：第二步，绘制所有水印元素并导出图片
					ctx2.draw(true, () => {
							// 将canvas转为图片
							setTimeout(() => {
								uni.canvasToTempFilePath({
									canvasId: 'watermarkCanvas',
									width: targetWidth,
									height: targetHeight,
									destWidth: targetWidth,
									destHeight: targetHeight,
									success: (res) => {
										this.resultImage = res.tempFilePath
										uni.hideLoading()
										uni.showToast({
											title: '生成成功',
											icon: 'success'
										})
									},
									fail: (err) => {
										console.error('生成失败', err)
										uni.hideLoading()
										uni.showToast({
											title: '生成失败',
											icon: 'none'
										})
									}
								}, this)
							}, 500)
						})
					}) // 关闭 ctx2.draw 回调
					}) // 关闭 ctx.draw 回调（图片绘制完成）
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
		saveImage() {
			if (!this.resultImage) return
			
			// #ifdef H5
			// H5 环境下，使用 a 标签模拟下载
			try {
				const link = document.createElement('a')
				link.href = this.resultImage
				link.download = `watermark_${Date.now()}.png`
				document.body.appendChild(link)
				link.click()
				document.body.removeChild(link)
				uni.showToast({
					title: '开始下载',
					icon: 'success'
				})
			} catch (e) {
				console.error('H5下载失败:', e)
				uni.showToast({
					title: '下载失败，请长按图片保存',
					icon: 'none',
					duration: 3000
				})
			}
			// #endif

			// #ifndef H5
			uni.saveImageToPhotosAlbum({
				filePath: this.resultImage,
				success: () => {
					uni.showToast({
						title: '保存成功',
						icon: 'success'
					})
				},
				fail: (err) => {
					console.error('保存失败详情:', err)
					uni.showToast({
						title: '保存失败',
						icon: 'none'
					})
				}
			})
			// #endif
		},
		
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
				const imgWidth = res.width
				const imgHeight = res.height
				const imgRatio = imgWidth / imgHeight
				
				// 获取屏幕尺寸
				const systemInfo = uni.getSystemInfoSync()
				const screenWidth = systemInfo.windowWidth
				const screenHeight = systemInfo.windowHeight
				const screenRatio = screenWidth / screenHeight
				
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
			} else if (e.touches.length === 2) {
			// 双指缩放（优化速度，更平滑）
			const touch1 = e.touches[0]
			const touch2 = e.touches[1]
			const distance = this.getDistance(touch1, touch2)
			const scaleChange = distance / this.startDistance
			
			// 应用缩放变化，限制范围为 initialScale（撑满） 到 5 倍
			let newScale = this.lastScale * scaleChange
			newScale = Math.max(this.initialScale, Math.min(5, newScale))
			
			this.scale = newScale
			}
		},
		
		// 触摸结束
		handleTouchEnd(e) {
			if (e.touches.length === 0) {
				this.isDragging = false
				this.isScaling = false
				this.lastTranslateX = this.translateX
				this.lastTranslateY = this.translateY
				this.lastScale = this.scale
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
			this.isDragging = false
			this.lastTranslateX = this.translateX
			this.lastTranslateY = this.translateY
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
		
		// 限制边界
		limitBoundary(x, y) {
			// 简单的边界限制，防止拖出视口
			const maxOffset = 200 * this.scale
			return {
				x: Math.max(-maxOffset, Math.min(maxOffset, x)),
				y: Math.max(-maxOffset, Math.min(maxOffset, y))
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
