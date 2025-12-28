<template>
	<view class="scan-page">
		<!-- 状态栏占位 -->
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		
		<!-- 扫码区域占位 (plus.barcode会在这里显示相机) -->
		<view class="scan-container" :style="{ height: cameraHeight + 'px' }"></view>
		
		<!-- H5环境提示 -->
		<view v-if="isH5" class="h5-overlay">
			<view class="h5-tips">
				<text class="tips-icon">📱</text>
				<text class="tips-text">H5环境暂不支持扫码</text>
				<text class="tips-desc">请在APP中使用此功能</text>
			</view>
		</view>
		
		<!-- 扫码框装饰 (只在非H5环境显示) -->
		<view class="scan-box" v-if="!isH5">
			<view class="scan-border">
				<!-- 四个角的装饰 -->
				<view class="corner corner-tl"></view>
				<view class="corner corner-tr"></view>
				<view class="corner corner-bl"></view>
				<view class="corner corner-br"></view>
			</view>
			<!-- 扫描线动画 -->
			<view class="scan-line" :class="{ scanning: isScanning }"></view>
		</view>
		
		<!-- 扫码提示文字 -->
		<view class="scan-tip" v-if="!isH5">
			<text class="tip-text">将二维码放入框内，即可自动扫描</text>
		</view>
		
		<!-- 返回按钮 -->
		<view class="back-btn" @click="goBack">
			<text class="back-icon">←</text>
		</view>
		
		<!-- 底部操作栏 -->
		<view class="bottom-toolbar" v-if="!isH5">
			<!-- 手电筒按钮 -->
			<view class="tool-btn flashlight-btn" @click="toggleFlashlight">
				<view class="tool-icon" :class="{ active: flashlightOn }">💡</view>
				<text class="tool-label">{{ flashlightOn ? '关闭' : '手电筒' }}</text>
			</view>
			
			<!-- 相册按钮 -->
			<view class="tool-btn album-btn" @click="chooseFromAlbum">
				<view class="tool-icon">🖼️</view>
				<text class="tool-label">相册</text>
			</view>
		</view>
		
		<!-- 扫码结果弹窗 -->
		<view class="result-modal" v-if="showResult" @click="closeResult">
			<view class="result-content" @click.stop>
				<view class="result-title">扫码结果</view>
				<view class="result-text">{{ scanResult }}</view>
				<view class="result-actions">
					<view class="action-btn copy-btn" @click="copyResult">复制</view>
					<view class="action-btn close-btn" @click="closeResult">关闭</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		let isH5 = false
		// #ifdef H5
		isH5 = true
		// #endif
		
		return {
			isH5,
			statusBarHeight: 0,
			screenHeight: 0,
			cameraHeight: 0,
			isScanning: true,
			flashlightOn: false,
			showResult: false,
			scanResult: '',
			scanTimer: null,
			cameraContext: null,
			barcode: null
		}
	},
	onLoad() {
		// 获取屏幕信息
		const systemInfo = uni.getSystemInfoSync()
		this.statusBarHeight = systemInfo.statusBarHeight || 0
		this.screenHeight = systemInfo.windowHeight
		this.cameraHeight = systemInfo.windowHeight - this.statusBarHeight
		
		console.log('扫码页面加载，环境信息:', {
			platform: uni.getSystemInfoSync().platform,
			isH5: this.isH5,
			statusBarHeight: this.statusBarHeight,
			cameraHeight: this.cameraHeight
		})
		
		// 启动扫描线动画
		this.isScanning = true
		
		// 延迟启动扫码识别，确保页面已完全渲染
		if (!this.isH5) {
			setTimeout(() => {
				this.initBarcodeScan()
			}, 500)
		}
	},
	onUnload() {
		// 清理定时器
		if (this.scanTimer) {
			clearInterval(this.scanTimer)
		}
		
		// #ifdef APP-PLUS
		// 关闭扫码控件
		if (this.barcode) {
			this.barcode.close()
			this.barcode = null
		}
		// #endif
	},
	methods: {
		// 初始化条码扫描（使用 plus.barcode）
		initBarcodeScan() {
			console.log('开始初始化扫码功能')
			
			// #ifdef APP-PLUS
			// 确保在 plusready 后执行
			const initScan = () => {
				try {
					// 检查 plus 是否可用
					if (typeof plus === 'undefined' || !plus.barcode) {
						console.error('plus.barcode 不可用')
						return
					}
					
					const pages = getCurrentPages()
					const page = pages[pages.length - 1]
					const currentWebview = page.$getAppWebview()
					
					console.log('创建 Barcode 扫码控件, 屏幕高度:', this.cameraHeight)
					
					// 获取系统信息
					const sys = plus.os.name
					console.log('系统:', sys)
					
					// 创建 Barcode 扫码控件
					// 注意：不能和 camera 组件同时使用，会冲突
					// 这里改用 barcode 自带的相机功能
					this.barcode = plus.barcode.create('barcode', 
						[plus.barcode.QR, plus.barcode.EAN13, plus.barcode.EAN8], 
						{
							top: this.statusBarHeight + 'px',
							left: '0px',
							width: '100%',
							height: this.cameraHeight + 'px',
							position: 'static'
						}
					)
					
					// 设置样式（扫描框和扫描线颜色）
					this.barcode.setStyles({
						frameColor: '#00ff00',
						scanbarColor: '#00ff00'
					})
					
					// 监听扫码成功事件
					this.barcode.onmarked = (type, result, file) => {
						console.log('扫码成功:', type, result)
						// 震动反馈
						plus.device.vibrate && plus.device.vibrate(100)
						// 停止扫码
						this.barcode.cancel()
						// 处理结果
						this.handleScanResult(result)
					}
					
					// 监听扫码错误
					this.barcode.onerror = (error) => {
						console.error('扫码错误:', error)
					}
					
					// 将扫码控件添加到当前页面
					currentWebview.append(this.barcode)
					
					// 开始扫码
					this.barcode.start()
					console.log('扫码控件已启动')
					
				} catch (error) {
					console.error('初始化扫码失败:', error)
					uni.showModal({
						title: '提示',
						content: '扫码功能初始化失败: ' + error.message,
						showCancel: false,
						success: () => {
							this.goBack()
						}
					})
				}
			}
			
			// 检查 plus 是否就绪
			if (typeof plus !== 'undefined') {
				initScan()
			} else {
				document.addEventListener('plusready', initScan, false)
			}
			// #endif
			
			// #ifdef MP-WEIXIN
			// 小程序环境，提示用户
			uni.showModal({
				title: '提示',
				content: '小程序环境将使用系统扫码功能',
				confirmText: '开始扫码',
				success: (res) => {
					if (res.confirm) {
						uni.scanCode({
							scanType: ['qrCode', 'barCode'],
							success: (scanRes) => {
								this.handleScanResult(scanRes.result)
							},
							fail: () => {
								this.goBack()
							}
						})
					} else {
						this.goBack()
					}
				}
			})
			// #endif
		},
		
		// 切换手电筒
		toggleFlashlight() {
			if (this.isH5) {
				uni.showToast({
					title: 'H5环境不支持手电筒',
					icon: 'none'
				})
				return
			}
			
			this.flashlightOn = !this.flashlightOn
			
			// #ifdef APP-PLUS
			if (this.barcode) {
				try {
					this.barcode.setFlash(this.flashlightOn)
					uni.showToast({
						title: this.flashlightOn ? '手电筒已打开' : '手电筒已关闭',
						icon: 'none',
						duration: 1000
					})
				} catch (error) {
					console.error('切换手电筒失败:', error)
					uni.showToast({
						title: '手电筒功能不可用',
						icon: 'none'
					})
				}
			} else {
				uni.showToast({
					title: '扫码功能未就绪',
					icon: 'none'
				})
			}
			// #endif
			
			// #ifndef APP-PLUS
			uni.showToast({
				title: '当前环境不支持手电筒',
				icon: 'none'
			})
			// #endif
		},
		
		// 从相册选择
		chooseFromAlbum() {
			uni.chooseImage({
				count: 1,
				sourceType: ['album'],
				success: (res) => {
					const tempFilePath = res.tempFilePaths[0]
					uni.showLoading({
						title: '识别中...'
					})
					
					// #ifdef APP-PLUS
					// 使用 plus.barcode.scan 静态方法识别图片
					plus.barcode.scan(tempFilePath, (type, result) => {
						uni.hideLoading()
						console.log('相册识别成功:', type, result)
						this.handleScanResult(result)
					}, (error) => {
						uni.hideLoading()
						console.error('相册识别失败:', error)
						uni.showToast({
							title: '未识别到二维码',
							icon: 'none',
							duration: 2000
						})
					}, [plus.barcode.QR, plus.barcode.EAN13, plus.barcode.EAN8])
					// #endif
					
					// #ifdef H5
					uni.hideLoading()
					uni.showToast({
						title: 'H5环境暂不支持',
						icon: 'none'
					})
					// #endif
					
					// #ifdef MP
					uni.hideLoading()
					uni.showToast({
						title: '小程序环境暂不支持相册识别',
						icon: 'none'
					})
					// #endif
				}
			})
		},
		
		// 处理扫码结果
		handleScanResult(result) {
			console.log('扫码结果:', result)
			this.scanResult = result
			
			// 判断是否为URL
			const urlPattern = /^(https?:\/\/|www\.)/i
			if (urlPattern.test(result)) {
				// 是URL，询问是否打开
				uni.showModal({
					title: '打开链接',
					content: result,
					confirmText: '打开',
					cancelText: '取消',
					success: (res) => {
						if (res.confirm) {
							this.openUrl(result)
						}
					}
				})
			} else {
				// 是文本，显示弹窗
				this.showResult = true
			}
		},
		
		// 打开URL
		openUrl(url) {
			// #ifdef H5
			window.open(url, '_blank')
			// #endif
			
			// #ifdef APP-PLUS
			if (typeof plus !== 'undefined' && plus.runtime) {
				plus.runtime.openURL(url)
			}
			// #endif
			
			// #ifdef MP
			// 小程序环境，复制链接
			uni.setClipboardData({
				data: url,
				success: () => {
					uni.showToast({
						title: '链接已复制',
						icon: 'success'
					})
				}
			})
			// #endif
		},
		
		// 复制结果
		copyResult() {
			uni.setClipboardData({
				data: this.scanResult,
				success: () => {
					uni.showToast({
						title: '已复制',
						icon: 'success'
					})
					this.closeResult()
				}
			})
		},
		
		// 关闭结果弹窗
		closeResult() {
			this.showResult = false
		},
		
		// 返回
		goBack() {
			uni.navigateBack()
		}
	}
}
</script>

<style lang="scss" scoped>
.scan-page {
	width: 100%;
	height: 100vh;
	background: #000;
	position: relative;
	overflow: hidden;
}

.status-bar {
	width: 100%;
	background: transparent;
	position: fixed;
	top: 0;
	left: 0;
	z-index: 999;
	pointer-events: none;
}

/* 扫码区域容器 (plus.barcode会在这里渲染) */
.scan-container {
	width: 100%;
	position: relative;
	background: #000;
}

/* H5覆盖层 */
.h5-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: linear-gradient(180deg, #1a1a1a 0%, #000000 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 10;
}

.h5-tips {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 30rpx;
}

.tips-icon {
	font-size: 120rpx;
}

.tips-text {
	font-size: 36rpx;
	color: #fff;
	font-weight: 600;
}

.tips-desc {
	font-size: 28rpx;
	color: rgba(255, 255, 255, 0.6);
}

/* 扫码提示 */
.scan-tip {
	position: fixed;
	bottom: 300rpx;
	left: 0;
	right: 0;
	display: flex;
	justify-content: center;
	z-index: 101;
}

.tip-text {
	font-size: 28rpx;
	color: rgba(255, 255, 255, 0.8);
	text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.5);
	text-align: center;
}

/* 返回按钮 - 使用渐变色与整体风格统一 */
.back-btn {
	position: fixed;
	top: 0;
	left: 0;
	width: 80rpx;
	height: 80rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1001;
	margin: 60rpx 0 0 40rpx;
	box-shadow: 0 4rpx 16rpx rgba(102, 126, 234, 0.3);
	transition: all 0.3s ease;
}

.back-btn:active {
	transform: scale(0.9);
	box-shadow: 0 2rpx 8rpx rgba(102, 126, 234, 0.4);
}

.back-icon {
	font-size: 48rpx;
	color: #fff;
	font-weight: bold;
	margin-left: -4rpx;
}

/* 扫码框 (装饰性，不阻挡扫码) */
.scan-box {
	position: fixed;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	margin-top: calc(var(--status-bar-height) / 2);
	width: 500rpx;
	height: 500rpx;
	pointer-events: none;
	z-index: 100;
}

.scan-border {
	width: 100%;
	height: 100%;
	position: relative;
	border-radius: 16rpx;
	/* 添加半透明遮罩效果 */
	box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
}

/* 四个角的装饰线 */
.corner {
	position: absolute;
	width: 80rpx;
	height: 80rpx;
	border-color: #00ff00;
	border-style: solid;
}

.corner-tl {
	top: 0;
	left: 0;
	border-width: 8rpx 0 0 8rpx;
	border-top-left-radius: 16rpx;
}

.corner-tr {
	top: 0;
	right: 0;
	border-width: 8rpx 8rpx 0 0;
	border-top-right-radius: 16rpx;
}

.corner-bl {
	bottom: 0;
	left: 0;
	border-width: 0 0 8rpx 8rpx;
	border-bottom-left-radius: 16rpx;
}

.corner-br {
	bottom: 0;
	right: 0;
	border-width: 0 8rpx 8rpx 0;
	border-bottom-right-radius: 16rpx;
}

/* 扫描线 */
.scan-line {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 6rpx;
	background: linear-gradient(90deg, 
		transparent 0%, 
		#00ff00 20%, 
		#00ff00 80%, 
		transparent 100%
	);
	border-radius: 3rpx;
	box-shadow: 0 0 20rpx rgba(0, 255, 0, 0.8);
}

.scan-line.scanning {
	animation: scan 2s linear infinite;
}

@keyframes scan {
	0% {
		transform: translateY(0);
		opacity: 0;
	}
	10% {
		opacity: 1;
	}
	90% {
		opacity: 1;
	}
	100% {
		transform: translateY(500rpx);
		opacity: 0;
	}
}

/* 底部工具栏 */
.bottom-toolbar {
	position: fixed;
	bottom: 120rpx;
	left: 0;
	right: 0;
	display: flex;
	justify-content: space-around;
	align-items: center;
	padding: 0 120rpx;
	z-index: 999;
}

.tool-btn {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16rpx;
	transition: all 0.3s ease;
}

.tool-btn:active {
	transform: scale(0.9);
}

.tool-icon {
	width: 120rpx;
	height: 120rpx;
	background: rgba(255, 255, 255, 0.2);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 56rpx;
	backdrop-filter: blur(10px);
	-webkit-backdrop-filter: blur(10px);
	border: 2rpx solid rgba(255, 255, 255, 0.3);
	transition: all 0.3s ease;
}

.tool-icon.active {
	background: rgba(255, 255, 0, 0.3);
	border-color: rgba(255, 255, 0, 0.6);
	box-shadow: 0 0 30rpx rgba(255, 255, 0, 0.5);
}

.tool-label {
	font-size: 24rpx;
	color: #fff;
	font-weight: 500;
	text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.5);
}

/* 扫码结果弹窗 */
.result-modal {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.8);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 2000;
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

.result-content {
	width: 600rpx;
	background: white;
	border-radius: 24rpx;
	padding: 60rpx 40rpx 40rpx;
	animation: slideUp 0.3s ease;
}

@keyframes slideUp {
	from {
		transform: translateY(100rpx);
		opacity: 0;
	}
	to {
		transform: translateY(0);
		opacity: 1;
	}
}

.result-title {
	font-size: 36rpx;
	font-weight: 700;
	color: #333;
	text-align: center;
	margin-bottom: 40rpx;
}

.result-text {
	font-size: 28rpx;
	color: #666;
	line-height: 1.6;
	padding: 40rpx;
	background: #f5f7fa;
	border-radius: 16rpx;
	word-break: break-all;
	max-height: 400rpx;
	overflow-y: auto;
	margin-bottom: 40rpx;
}

.result-actions {
	display: flex;
	gap: 24rpx;
}

.action-btn {
	flex: 1;
	height: 88rpx;
	border-radius: 16rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 32rpx;
	font-weight: 600;
	transition: all 0.3s ease;
}

.action-btn:active {
	transform: scale(0.95);
}

.copy-btn {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
}

.close-btn {
	background: #f0f0f0;
	color: #666;
}
</style>

