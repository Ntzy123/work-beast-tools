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
					<image :src="imagePath" mode="aspectFit" class="preview-img"></image>
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
				<image :src="resultImage" mode="aspectFit" class="result-img"></image>
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
	</view>
</template>

<script>
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
		
		return {
			isH5,
			imagePath: '',
			resultImage: '',
			formData: {
				name: '',
				date: currentDate,
				time: { hour: currentHour, minute: currentMinute }
			},
			canvasWidth: 750,
			canvasHeight: 1334
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
				this.formData.time = {
					hour: String(h).padStart(2, '0'),
					minute: String(m).padStart(2, '0')
				}
			}
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
					// 设置canvas尺寸
					this.canvasWidth = imageInfo.width
					this.canvasHeight = imageInfo.height
					
					// 等待下一帧确保canvas尺寸更新
					this.$nextTick(() => {
						const ctx = uni.createCanvasContext('watermarkCanvas', this)
						
						// 计算缩放比例（以750rpx为基准）
						const scale = imageInfo.width / 750
						
						// 绘制原图
						ctx.drawImage(this.imagePath, 0, 0, imageInfo.width, imageInfo.height)
						
						// --- 水印样式配置 ---
						const edgePadding = 15 * scale // 整体距离图片边缘的间距
						const borderRadius = 5 * scale
						const bgColor = 'rgba(0, 0, 0, 0.45)'
						const textColor = '#ffffff'
						
						// 1. 绘制上方信息块（时间、姓名、日期）
						const timeFontSize = 72 * scale // 略微减小时间字体
						ctx.setFontSize(timeFontSize)
						const timeText = this.formData.time.hour + ':' + this.formData.time.minute
						const timeWidth = ctx.measureText ? ctx.measureText(timeText).width : 180 * scale
						
						const timeInnerPadding = 15 * scale // 显著缩小文字到边框的间距
						const textStartX = edgePadding + timeInnerPadding + timeWidth + timeInnerPadding
						
						// 准备右侧文本
						const smallFontSize = 24 * scale
						ctx.setFontSize(smallFontSize)
						const nameText = this.formData.name
						const dateText = this.formatDate(this.formData.date)
						const nameWidth = ctx.measureText ? ctx.measureText(nameText).width : 80 * scale
						const dateWidth = ctx.measureText ? ctx.measureText(dateText).width : 180 * scale
						const rightContentWidth = Math.max(nameWidth, dateWidth)
						
						const infoBoxHeight = 100 * scale // 降低高度
						const infoBoxWidth = timeInnerPadding + timeWidth + timeInnerPadding + rightContentWidth + 20 * scale
						const infoBoxX = edgePadding
						const infoBoxY = imageInfo.height - edgePadding - infoBoxHeight - 80 * scale
						
						this.drawRoundedRect(ctx, infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight, borderRadius, bgColor)
						
						// 绘制时间
						ctx.setFillStyle(textColor)
						ctx.setFontSize(timeFontSize)
						ctx.setTextAlign('left')
						ctx.fillText(timeText, infoBoxX + timeInnerPadding, infoBoxY + infoBoxHeight - 18 * scale)
						
						// 绘制姓名和日期
						ctx.setFontSize(smallFontSize)
						ctx.fillText(nameText, textStartX, infoBoxY + 38 * scale)
						ctx.fillText(dateText, textStartX, infoBoxY + 80 * scale)
						
						// 2. 绘制下方定位块
						const locBoxHeight = 50 * scale
						const locBoxY = imageInfo.height - edgePadding - locBoxHeight - 15 * scale
						const location = 'Q贵阳首钢贵州之光一期'
						
						ctx.setFontSize(smallFontSize)
						const locTextWidth = ctx.measureText ? ctx.measureText(location).width : 300 * scale
						const locBoxWidth = locTextWidth + 75 * scale
						
						this.drawRoundedRect(ctx, infoBoxX, locBoxY, locBoxWidth, locBoxHeight, borderRadius, bgColor)
						
						// 绘制定位图标（白色小 Pin）
						ctx.save()
						ctx.translate(infoBoxX + 25 * scale, locBoxY + 25 * scale)
						ctx.beginPath()
						ctx.arc(0, -4 * scale, 6 * scale, 0, Math.PI * 2)
						ctx.moveTo(0, 3 * scale)
						ctx.lineTo(-6 * scale, -4 * scale)
						ctx.lineTo(6 * scale, -4 * scale)
						ctx.closePath()
						ctx.setFillStyle('#ffffff')
						ctx.fill()
						ctx.restore()
						
						// 绘制定位文字（纯白色）
						ctx.setFillStyle('#ffffff')
						ctx.fillText(location, infoBoxX + 50 * scale, locBoxY + 35 * scale)
						
						// 3. 绘制右下角二维码（紧贴右下角）
						const qrSize = 160 * scale
						const qrX = imageInfo.width - qrSize
						const qrY = imageInfo.height - qrSize
						
						// 白色背景
						ctx.setFillStyle('#ffffff')
						ctx.fillRect(qrX, qrY, qrSize, qrSize)
						
						// 模拟二维码像素
						const markerSize = 35 * scale
						ctx.setFillStyle('#000000')
						ctx.fillRect(qrX + 15 * scale, qrY + 15 * scale, markerSize, markerSize) // 左上
						ctx.fillRect(qrX + qrSize - 15 * scale - markerSize, qrY + 15 * scale, markerSize, markerSize) // 右上
						ctx.fillRect(qrX + 15 * scale, qrY + qrSize - 15 * scale - markerSize, markerSize, markerSize) // 左下
						
						for(let i=0; i<6; i++) {
							for(let j=0; j<6; j++) {
								if(Math.random() > 0.4) {
									ctx.fillRect(qrX + 60 * scale + i*15 * scale, qrY + 60 * scale + j*15 * scale, 10 * scale, 10 * scale)
								}
							}
						}
						
						ctx.draw(false, () => {
							// 将canvas转为图片
							setTimeout(() => {
								uni.canvasToTempFilePath({
									canvasId: 'watermarkCanvas',
									width: imageInfo.width,
									height: imageInfo.height,
									destWidth: imageInfo.width,
									destHeight: imageInfo.height,
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

</style>
