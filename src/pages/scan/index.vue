<template>
	<view class="scan-page">
		<!-- 扫码区域占位（barcode原生控件会渲染在这里） -->
		<view class="scan-container" :style="{ height: screenHeight + 'px' }"></view>
		
		<!-- H5环境提示 -->
		<view v-if="isH5" class="h5-overlay">
			<view class="h5-tips">
				<text class="tips-icon">📱</text>
				<text class="tips-text">H5环境暂不支持扫码</text>
				<text class="tips-desc">请在APP中使用此功能</text>
			</view>
		</view>
		
		<!-- 扫码框装饰（覆盖在原生控件上方） -->
		<cover-view class="scan-box" v-if="!isH5">
			<cover-view class="scan-border">
				<!-- 四个角的装饰 -->
				<cover-view class="corner corner-tl"></cover-view>
				<cover-view class="corner corner-tr"></cover-view>
				<cover-view class="corner corner-bl"></cover-view>
				<cover-view class="corner corner-br"></cover-view>
			</cover-view>
			<!-- 扫描线动画 -->
			<cover-view class="scan-line" :class="{ scanning: isScanning }"></cover-view>
		</cover-view>
		
		<!-- 扫码提示文字 -->
		<cover-view class="scan-tip" v-if="!isH5">
			<cover-view class="tip-text">将二维码放入框内，即可自动扫描</cover-view>
		</cover-view>
		
		<!-- 底部操作栏（使用cover-view确保在原生控件上方） -->
		<cover-view class="bottom-toolbar" v-if="!isH5">
			<!-- 手电筒按钮 -->
			<cover-view class="tool-btn" @click="toggleFlashlight">
				<cover-view class="tool-icon-wrapper" :class="{ active: flashlightOn }">
					<cover-view class="tool-emoji">💡</cover-view>
				</cover-view>
				<cover-view class="tool-label">{{ flashlightOn ? '关闭' : '手电筒' }}</cover-view>
			</cover-view>
			
			<!-- 相册按钮 -->
			<cover-view class="tool-btn" @click="chooseFromAlbum">
				<cover-view class="tool-icon-wrapper">
					<cover-view class="tool-emoji">🖼️</cover-view>
				</cover-view>
				<cover-view class="tool-label">相册</cover-view>
			</cover-view>
		</cover-view>
		
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
		
		<!-- 调试日志面板 -->
		<view class="debug-panel" v-if="debugLogs.length > 0">
			<view class="debug-header" @click="clearDebugLogs">
				<text class="debug-title">调试日志 (点击清空)</text>
			</view>
			<scroll-view class="debug-logs" scroll-y>
				<view class="debug-log" v-for="(log, index) in debugLogs" :key="index">
					<text class="log-time">{{ log.time }}</text>
					<text class="log-text" :class="'log-' + log.type">{{ log.message }}</text>
				</view>
			</scroll-view>
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
			barcode: null,
			debugLogs: [] // 调试日志
		}
	},
	onLoad() {
		// 获取屏幕信息
		const systemInfo = uni.getSystemInfoSync()
		this.statusBarHeight = systemInfo.statusBarHeight || 0
		this.screenHeight = systemInfo.windowHeight
		this.cameraHeight = systemInfo.windowHeight
		
		this.addDebugLog('扫码页面加载', 'info')
		this.addDebugLog(`平台: ${systemInfo.platform}`, 'info')
		this.addDebugLog(`屏幕高度: ${this.screenHeight}px`, 'info')
		this.addDebugLog(`isH5: ${this.isH5}`, 'info')
		
		// 启动扫描线动画
		this.isScanning = true
		
		// 初始化扫码
		if (!this.isH5) {
			setTimeout(() => {
				this.initScan()
			}, 500)
		}
	},
	onUnload() {
		// 清理定时器
		if (this.scanTimer) {
			clearInterval(this.scanTimer)
			this.scanTimer = null
		}
		
		// #ifdef APP-PLUS
		// 关闭并销毁barcode扫码控件
		if (this.barcode) {
			this.addDebugLog('关闭barcode控件', 'info')
			this.barcode.close()
			this.barcode = null
		}
		// #endif
		
		this.addDebugLog('页面卸载，清理资源', 'info')
	},
	methods: {
		// 添加调试日志
		addDebugLog(message, type = 'info') {
			const now = new Date()
			const time = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`
			this.debugLogs.push({
				time,
				message,
				type
			})
			// 限制日志数量
			if (this.debugLogs.length > 20) {
				this.debugLogs.shift()
			}
			console.log(`[${time}] ${message}`)
		},
		
		// 清空调试日志
		clearDebugLogs() {
			this.debugLogs = []
		},
		
		// 初始化扫码功能
		initScan() {
			this.addDebugLog('初始化barcode扫码', 'info')
			
			// #ifdef APP-PLUS
			// 等待plusready
			if (typeof plus === 'undefined') {
				this.addDebugLog('等待plus就绪...', 'info')
				document.addEventListener('plusready', () => {
					this.addDebugLog('plus已就绪', 'success')
					this.createBarcodeScanner()
				}, false)
			} else {
				this.createBarcodeScanner()
			}
			// #endif
			
			// #ifndef APP-PLUS
			this.addDebugLog('非APP环境，使用降级方案', 'warning')
			this.useFallbackScan()
			// #endif
		},
		
		// 创建barcode扫码控件
		createBarcodeScanner() {
			try {
				this.addDebugLog('创建barcode扫码控件', 'info')
				
				const pages = getCurrentPages()
				const page = pages[pages.length - 1]
				const currentWebview = page.$getAppWebview()
				
				// 获取系统信息
				const sys = plus.os.name
				this.addDebugLog(`系统: ${sys}`, 'info')
				
				// 创建barcode扫码控件（从顶部0开始，覆盖整个屏幕）
				this.barcode = plus.barcode.create('barcode', 
					[plus.barcode.QR, plus.barcode.EAN13, plus.barcode.EAN8], 
					{
						top: '0px',
						left: '0px',
						width: '100%',
						height: '100%',
						position: 'static'
					}
				)
				
				this.addDebugLog('barcode控件创建成功', 'success')
				
				// 监听扫码成功事件
				this.barcode.onmarked = (type, result, file) => {
					this.addDebugLog(`扫码成功: ${result}`, 'success')
					// 震动反馈
					plus.device.vibrate && plus.device.vibrate(100)
					// 取消扫码
					this.barcode.cancel()
					// 处理结果
					this.handleScanResult(result)
				}
				
				// 监听错误
				this.barcode.onerror = (error) => {
					this.addDebugLog(`扫码错误: ${JSON.stringify(error)}`, 'error')
				}
				
				// 将barcode控件添加到webview
				currentWebview.append(this.barcode)
				this.addDebugLog('barcode控件已添加到页面', 'info')
				
				// 延迟启动扫码，确保界面渲染完成
				setTimeout(() => {
					if (this.barcode) {
						this.barcode.start()
						this.addDebugLog('开始扫码', 'success')
					}
				}, 200)
				
			} catch (error) {
				this.addDebugLog(`创建barcode失败: ${error.message}`, 'error')
				this.addDebugLog(`错误堆栈: ${error.stack}`, 'error')
				this.useFallbackScan()
			}
		},
		
		// 降级方案：使用系统扫码
		useFallbackScan() {
			this.addDebugLog('使用系统扫码作为降级方案', 'info')
			
			// 直接启动系统扫码
			setTimeout(() => {
				uni.scanCode({
					scanType: ['qrCode', 'barCode'],
					success: (res) => {
						this.addDebugLog(`扫码成功: ${res.result}`, 'success')
						this.handleScanResult(res.result)
					},
					fail: (err) => {
						this.addDebugLog(`扫码取消: ${JSON.stringify(err)}`, 'info')
						this.goBack()
					}
				})
			}, 100)
		},
		
		// 相机错误回调
		onCameraError(error) {
			this.addDebugLog(`相机错误: ${JSON.stringify(error)}`, 'error')
			uni.showModal({
				title: '相机启动失败',
				content: '请检查相机权限设置',
				confirmText: '返回',
				showCancel: false,
				success: () => {
					this.goBack()
				}
			})
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
					this.addDebugLog(`手电筒${this.flashlightOn ? '已打开' : '已关闭'}`, 'success')
					uni.showToast({
						title: this.flashlightOn ? '手电筒已打开' : '手电筒已关闭',
						icon: 'none',
						duration: 1000
					})
				} catch (error) {
					this.addDebugLog(`手电筒操作失败: ${error.message}`, 'error')
				}
			} else {
				this.addDebugLog('barcode控件不存在', 'error')
			}
			// #endif
		},
		
		// 从相册选择
		chooseFromAlbum() {
			this.addDebugLog('打开相册', 'info')
			
			uni.chooseImage({
				count: 1,
				sourceType: ['album'],
				success: (res) => {
					const tempFilePath = res.tempFilePaths[0]
					this.addDebugLog(`相册图片已选择: ${tempFilePath}`, 'info')
					
					uni.showLoading({
						title: '识别中...'
					})
					
					// #ifdef APP-PLUS
					// 使用plus.barcode.scan识别图片
					plus.barcode.scan(tempFilePath, (type, result) => {
						uni.hideLoading()
						this.addDebugLog(`相册识别成功: ${result}`, 'success')
						this.handleScanResult(result)
					}, (error) => {
						uni.hideLoading()
						this.addDebugLog(`相册识别失败: ${JSON.stringify(error)}`, 'error')
						uni.showToast({
							title: '未识别到二维码',
							icon: 'none'
						})
					}, [plus.barcode.QR, plus.barcode.EAN13, plus.barcode.EAN8])
					// #endif
					
					// #ifndef APP-PLUS
					uni.hideLoading()
					uni.showToast({
						title: '当前环境不支持相册识别',
						icon: 'none'
					})
					// #endif
				},
				fail: (err) => {
					this.addDebugLog(`选择图片失败: ${JSON.stringify(err)}`, 'error')
				}
			})
		},
		
		// 处理扫码结果
		handleScanResult(result) {
			this.addDebugLog(`处理扫码结果: ${result}`, 'success')
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
			
			// #ifdef APP-PLUS
			// 重新启动扫码
			if (this.barcode) {
				this.addDebugLog('重新启动扫码', 'info')
				this.barcode.start()
			}
			// #endif
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

/* 扫码区域容器（barcode会覆盖在这里） */
.scan-container {
	width: 100%;
	height: 100vh;
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

/* 移除自定义返回按钮，使用系统导航栏 */

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
	z-index: 10000;
}

.tool-btn {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16rpx;
}

.tool-icon-wrapper {
	width: 120rpx;
	height: 120rpx;
	background: rgba(255, 255, 255, 0.2);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	backdrop-filter: blur(10px);
	-webkit-backdrop-filter: blur(10px);
	border: 2rpx solid rgba(255, 255, 255, 0.3);
}

.tool-icon-wrapper.active {
	background: rgba(255, 255, 0, 0.3);
	border-color: rgba(255, 255, 0, 0.6);
	box-shadow: 0 0 30rpx rgba(255, 255, 0, 0.5);
}

.tool-emoji {
	font-size: 56rpx;
	line-height: 1;
	display: flex;
	align-items: center;
	justify-content: center;
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

/* 调试日志面板 */
.debug-panel {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	max-height: 400rpx;
	background: rgba(0, 0, 0, 0.9);
	z-index: 2001;
	display: flex;
	flex-direction: column;
	border-top: 2rpx solid rgba(255, 255, 255, 0.1);
}

.debug-header {
	padding: 20rpx 30rpx;
	background: rgba(102, 126, 234, 0.3);
	border-bottom: 1rpx solid rgba(255, 255, 255, 0.1);
}

.debug-title {
	color: #fff;
	font-size: 24rpx;
	font-weight: 600;
}

.debug-logs {
	flex: 1;
	padding: 20rpx;
	max-height: 340rpx;
}

.debug-log {
	margin-bottom: 12rpx;
	padding: 12rpx 16rpx;
	background: rgba(255, 255, 255, 0.05);
	border-radius: 8rpx;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.log-time {
	font-size: 20rpx;
	color: rgba(255, 255, 255, 0.5);
}

.log-text {
	font-size: 22rpx;
	line-height: 1.5;
	word-break: break-all;
}

.log-info {
	color: #67c3f3;
}

.log-success {
	color: #52c41a;
}

.log-error {
	color: #ff4d4f;
}

.log-warning {
	color: #faad14;
}
</style>

