<template>
	<view class="page">
		<!-- 状态栏占位 -->
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		
		<!-- 头部区域 -->
		<view class="header">
			<!-- 扫一扫按钮 -->
			<view class="scan-btn" @click="handleScan">
				<text class="scan-icon">📷</text>
			</view>
			<!-- 设置按钮 -->
			<view class="settings-btn" @click="handleSettings">
				<text class="settings-icon">⚙️</text>
			</view>
			<view class="user-info">
				<view class="avatar">👤</view>
				<text class="user-name">{{ userName }}</text>
				<text class="user-desc">个人应用中心</text>
			</view>
		</view>

		<!-- 内容区域 -->
		<scroll-view class="content" scroll-y>
			<!-- 实用工具 -->
			<view class="apps-section">
				<view class="section-title">实用工具</view>
				<view class="apps-grid">
					<view 
						class="app-card" 
						:class="{ disabled: app.disabled }"
						v-for="(app, index) in utilityApps" 
						:key="index"
						@click="handleAppClick(app)"
					>
						<view class="app-icon" :class="'icon-' + (index + 1)">{{ app.icon }}</view>
						<text class="app-name">{{ app.name }}</text>
						<text class="app-desc">{{ app.desc }}</text>
					</view>
				</view>
			</view>
		</scroll-view>

		<!-- 底部导航 -->
		<view class="bottom-nav">
			<view 
				class="nav-item" 
				:class="{ active: currentTab === 0 }"
				@click="switchTab(0)"
			>
				<view class="nav-icon">🏠</view>
				<text class="nav-label">首页</text>
			</view>
			<view 
				class="nav-item" 
				:class="{ active: currentTab === 1 }"
				@click="switchTab(1)"
			>
				<view class="nav-icon">📱</view>
				<text class="nav-label">应用</text>
			</view>
			<view 
				class="nav-item" 
				:class="{ active: currentTab === 2 }"
				@click="switchTab(2)"
			>
				<view class="nav-icon">👤</view>
				<text class="nav-label">我的</text>
			</view>
		</view>

		<!-- 扫码结果弹窗 -->
		<view class="scan-modal" v-if="showScanModal" @click="closeScanModal">
			<view class="scan-modal-content" @click.stop>
				<view class="scan-modal-header">
					<text class="scan-modal-title">扫码结果</text>
					<view class="scan-modal-close" @click="closeScanModal">✕</view>
				</view>
				<view class="scan-modal-body">
					<!-- 如果解密成功，显示格式化后的数据 -->
					<view v-if="scanResult.isEncrypted && scanResult.decrypted" class="decrypted-content">
						<view class="decrypted-header">
							<text class="decrypted-title">🔓 已解密的水印信息</text>
						</view>
						<view 
							class="decrypted-item" 
							v-for="(item, index) in formatDecryptedData(scanResult.decrypted)" 
							:key="index"
						>
							<view class="decrypted-item-label">{{ item.label }}：</view>
							<text class="decrypted-item-value" :class="{ 'location-value': item.label === '定位' }" selectable>{{ item.value }}</text>
						</view>
					</view>
					
					<!-- 如果是加密格式但解密失败，显示提示 -->
					<view v-else-if="scanResult.isEncrypted && !scanResult.decrypted" class="decrypt-failed">
						<text class="decrypt-failed-text">⚠️ 解密失败，显示原始内容</text>
					</view>
					
					<!-- 原始内容显示 -->
					<view 
						class="scan-result-content" 
						:class="{ 'scan-content-clickable': !scanResult.isEncrypted && isUrl(scanResult.result) }"
						v-if="!scanResult.isEncrypted || !scanResult.decrypted"
						@click="handleContentClick"
					>
						<text class="scan-label">内容：</text>
						<text 
							class="scan-value scan-content" 
							:class="{ 'scan-url-clickable': !scanResult.isEncrypted && isUrl(scanResult.result) }"
							selectable
						>{{ scanResult.result }}</text>
					</view>
				</view>
				<view class="scan-modal-footer">
					<view class="scan-modal-btn cancel-btn" @click="closeScanModal">关闭</view>
					<view 
						class="scan-modal-btn copy-btn" 
						@click="copyScanResult"
					>
						复制内容
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import CryptoJS from 'crypto-js'
import apiConfig from '@/config/api.config.json'

export default {
	data() {
		return {
			statusBarHeight: 0,
			userName: '张三',
			currentTab: 0,
			showScanModal: false,
			scanResult: {
				result: '',
				scanType: '',
				decrypted: null, // 解密后的数据
				isEncrypted: false // 是否为加密的二维码
			},
			encryptionKey: 'e373d090928170eb', // 默认加密key
			utilityApps: [
				{ icon: '🖼️', name: '添加水印', desc: '图片水印工具', path: 'pages/watermark/index' },
				{ icon: '🌙', name: '自动夜答', desc: '自动夜答管理网站', url: 'http://aec.niyuki.icu' },
				{ icon: '⏳', name: '敬请期待', desc: '功能开发中', disabled: true },
				{ icon: '⏳', name: '敬请期待', desc: '功能开发中', disabled: true }
			]
		}
	},
	onLoad() {
		// 获取状态栏高度
		const systemInfo = uni.getSystemInfoSync()
		this.statusBarHeight = systemInfo.statusBarHeight || 0
		
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
		// 从服务器获取最新的加密key（与watermark保持一致）
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
		
		// 检测是否为加密的二维码格式
		isEncryptedQRCode(text) {
			if (!text || typeof text !== 'string') {
				return false
			}
			try {
				// 尝试解析为JSON
				const parsed = JSON.parse(text)
				// 检查是否包含 text 和 version 字段
				if (parsed && typeof parsed === 'object' && parsed.text && parsed.version) {
					return true
				}
			} catch (e) {
				// 不是有效的JSON
				return false
			}
			return false
		},
		
		// 解密二维码内容
		async decryptQRCode(encryptedText) {
			try {
				// 1. 解析JSON获取加密文本
				const parsed = JSON.parse(encryptedText)
				if (!parsed.text) {
					return null
				}
				
				// 2. 将 \u003d 还原为 =
				const base64Text = parsed.text.replace(/\\u003d/g, '=')
				
				// 3. 先尝试从服务器获取最新的key
				await this.fetchKeyFromServer()
				
				// 4. AES-128-ECB 解密
				const key = CryptoJS.enc.Utf8.parse(this.encryptionKey)
				const decrypted = CryptoJS.AES.decrypt(base64Text, key, {
					mode: CryptoJS.mode.ECB,
					padding: CryptoJS.pad.Pkcs7
				})
				
				// 5. 转换为字符串
				const decryptedText = decrypted.toString(CryptoJS.enc.Utf8)
				if (!decryptedText) {
					return null
				}
				
				// 6. 解析为JSON对象
				const data = JSON.parse(decryptedText)
				return data
			} catch (error) {
				console.error('解密失败:', error)
				return null
			}
		},
		
		// 将小数度转换为度分秒格式
		decimalToDMS(decimal, isLatitude) {
			const abs = Math.abs(decimal)
			const degrees = Math.floor(abs)
			const minutesFloat = (abs - degrees) * 60
			const minutes = Math.floor(minutesFloat)
			const seconds = Math.round((minutesFloat - minutes) * 60)
			const direction = isLatitude 
				? (decimal >= 0 ? 'N' : 'S')
				: (decimal >= 0 ? 'E' : 'W')
			return `${degrees}°${minutes}'${seconds}"${direction}`
		},
		
		// 格式化解密后的数据为人类可读的中文
		formatDecryptedData(data) {
			if (!data || typeof data !== 'object') {
				return []
			}
			
			const formatted = []
			
			// 姓名
			if (data.n) {
				formatted.push({
					label: '姓名',
					value: data.n
				})
			}
			
			// 时间戳
			if (data.ot) {
				const date = new Date(data.ot * 1000)
				const year = date.getFullYear()
				const month = String(date.getMonth() + 1).padStart(2, '0')
				const day = String(date.getDate()).padStart(2, '0')
				const hours = String(date.getHours()).padStart(2, '0')
				const minutes = String(date.getMinutes()).padStart(2, '0')
				const seconds = String(date.getSeconds()).padStart(2, '0')
				const dateStr = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
				formatted.push({
					label: '时间',
					value: dateStr
				})
			}
			
			// 地理位置信息
			if (data.g && data.g.la !== undefined && data.g.lo !== undefined) {
				const latitude = this.decimalToDMS(data.g.la, true)
				const longitude = this.decimalToDMS(data.g.lo, false)
				formatted.push({
					label: '定位',
					value: `${latitude}\n${longitude}`
				})
			}
			
			// 时间可靠性
			if (data.or !== undefined) {
				formatted.push({
					label: '时间可靠性',
					value: data.or.toString()
				})
			}
			
			// 员工ID
			if (data.s) {
				formatted.push({
					label: '员工ID',
					value: data.s.toString()
				})
			}
			
			return formatted
		},
		
		handleScan() {
			// 调用扫码功能
			// 允许从相机和相册扫码，启用自动放大，只扫描二维码
			uni.scanCode({
				scanType: ['qrCode'], // 只扫描二维码
				// autoZoom: true, // 启用自动放大（仅App-Android支持）
				success: async (res) => {
					console.log('扫码成功', res)
					const scanText = res.result || ''
					
					// 先尝试检测是否为加密的二维码
					const isEncrypted = this.isEncryptedQRCode(scanText)
					let decryptedData = null
					
					if (isEncrypted) {
						// 尝试解密
						uni.showLoading({
							title: '解析中...'
						})
						decryptedData = await this.decryptQRCode(scanText)
						uni.hideLoading()
						
						if (decryptedData) {
							// 解密成功
							this.scanResult = {
								result: scanText,
								scanType: res.scanType || '二维码',
								decrypted: decryptedData,
								isEncrypted: true
							}
						} else {
							// 解密失败，显示原始内容
							this.scanResult = {
								result: scanText,
								scanType: res.scanType || '二维码',
								decrypted: null,
								isEncrypted: true
							}
							uni.showToast({
								title: '解密失败，显示原始内容',
								icon: 'none',
								duration: 2000
							})
						}
					} else {
						// 不是加密格式，显示原始内容
						this.scanResult = {
							result: scanText,
							scanType: res.scanType || '未知',
							decrypted: null,
							isEncrypted: false
						}
					}
					
					// 显示弹窗
					this.showScanModal = true
				},
				fail: (err) => {
					console.log('扫码失败', err)
					// 用户取消扫码不显示错误提示
					if (err.errMsg && !err.errMsg.includes('cancel')) {
						uni.showToast({
							title: '扫码失败：' + (err.errMsg || '未知错误'),
							icon: 'none',
							duration: 2000
						})
					}
				}
			})
		},
		// 关闭扫码结果弹窗
		closeScanModal() {
			this.showScanModal = false
			// 清空扫码结果
			setTimeout(() => {
				this.scanResult = {
					result: '',
					scanType: '',
					decrypted: null,
					isEncrypted: false
				}
			}, 300)
		},
		// 检测是否为URL
		isUrl(str) {
			if (!str || typeof str !== 'string') {
				return false
			}
			// URL正则表达式，支持 http://、https://、ftp:// 等协议
			const urlPattern = /^(https?|ftp):\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]$/i
			return urlPattern.test(str.trim())
		},
		// 打开扫码得到的URL
		openScanUrl() {
			const url = this.scanResult.result
			if (!this.isUrl(url)) {
				uni.showToast({
					title: '无效的网址',
					icon: 'none',
					duration: 2000
				})
				return
			}
			
			// 先关闭弹窗
			this.closeScanModal()
			
			// 延迟一下再打开，让弹窗关闭动画完成
			setTimeout(() => {
				this.openExternalUrl(url)
			}, 300)
		},
		// 复制扫码结果
		copyScanResult() {
			const content = this.scanResult.result
			uni.setClipboardData({
				data: content,
				success: () => {
					uni.showToast({
						title: '已复制到剪贴板',
						icon: 'success',
						duration: 2000
					})
					this.closeScanModal()
				},
				fail: () => {
					uni.showToast({
						title: '复制失败',
						icon: 'none',
						duration: 2000
					})
				}
			})
		},
		// 处理内容框点击事件
		handleContentClick() {
			// 如果是网址类型，点击时打开网址
			if (!this.scanResult.isEncrypted && this.isUrl(this.scanResult.result)) {
				this.openScanUrl()
			}
		},
		handleSettings() {
			uni.showToast({
				title: '设置',
				icon: 'none',
				duration: 2000
			})
			// 这里可以添加跳转到设置页面的逻辑
			// uni.navigateTo({
			//   url: '/pages/settings/index'
			// })
		},
		handleAppClick(app) {
			console.log('点击应用', app)
			
			// 如果是禁用状态，显示敬请期待
			if (app.disabled) {
				uni.showToast({
					title: '敬请期待',
					icon: 'none',
					duration: 2000
				})
				return
			}
			
			// 如果是自动夜答，打开外部链接
			if (app.url) {
				this.openExternalUrl(app.url)
				return
			}
			
			// 如果有路径，跳转到对应页面
			if (app.path) {
				// uni-app路径格式：以/开头
				const url = app.path.startsWith('/') ? app.path : '/' + app.path
				console.log('准备跳转到:', url, '应用信息:', app)
				uni.navigateTo({
					url: url,
					success: () => {
						console.log('跳转成功')
					},
					fail: (err) => {
						console.error('跳转失败', err, '路径:', url)
						// 尝试不带/的路径
						const altUrl = app.path.startsWith('/') ? app.path.substring(1) : app.path
						console.log('尝试备用路径:', altUrl)
						uni.navigateTo({
							url: altUrl,
							fail: (err2) => {
								console.error('备用路径也失败', err2)
								uni.showToast({
									title: '跳转失败，请检查控制台',
									icon: 'none',
									duration: 3000
								})
							}
						})
					}
				})
				return
			}
			
			uni.showToast({
				title: app.name,
				icon: 'none',
				duration: 2000
			})
		},
		openExternalUrl(url) {
			// #ifdef H5
			window.open(url, '_blank')
			// #endif
			
			// #ifdef APP-PLUS
			if (typeof plus !== 'undefined' && plus.runtime) {
				plus.runtime.openURL(url)
			} else {
				uni.showToast({
					title: '无法打开链接',
					icon: 'none',
					duration: 2000
				})
			}
			// #endif
			
			// #ifdef MP
			// 小程序不支持直接打开外部链接，需要引导用户复制链接或使用web-view
			uni.setClipboardData({
				data: url,
				success: () => {
					uni.showToast({
						title: '链接已复制，请在浏览器中打开',
						icon: 'none',
						duration: 3000
					})
				}
			})
			// #endif
		},
		switchTab(index) {
			this.currentTab = index
			const tabNames = ['首页', '应用', '我的']
			uni.showToast({
				title: tabNames[index],
				icon: 'none',
				duration: 1500
			})
		}
	}
}
</script>

<style lang="scss" scoped>
.page {
	min-height: 100vh;
	width: 100%;
	background: linear-gradient(180deg, #f5f7fa 0%, #c3cfe2 100%);
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	overflow-x: hidden;
}

.status-bar {
	width: 100%;
	background: transparent;
}

/* 头部区域 */
.header {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	padding: 60rpx 40rpx 80rpx;
	color: white;
	position: relative;
	overflow: hidden;
}

/* 扫一扫按钮 */
.scan-btn {
	position: absolute;
	top: 60rpx;
	right: 140rpx;
	width: 80rpx;
	height: 80rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 10;
	transition: all 0.3s ease;
}

.scan-btn:active {
	transform: scale(0.9);
}

.scan-icon {
	font-size: 48rpx;
	opacity: 0.9;
}

/* 设置按钮 */
.settings-btn {
	position: absolute;
	top: 60rpx;
	right: 40rpx;
	width: 80rpx;
	height: 80rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 10;
	transition: all 0.3s ease;
}

.settings-btn:active {
	transform: scale(0.9) rotate(90deg);
}

.settings-icon {
	font-size: 48rpx;
	opacity: 0.9;
}

.header::before {
	content: '';
	position: absolute;
	top: -50%;
	right: -20%;
	width: 400rpx;
	height: 400rpx;
	background: rgba(255, 255, 255, 0.1);
	border-radius: 50%;
}

.user-info {
	position: relative;
	z-index: 1;
}

.avatar {
	width: 140rpx;
	height: 140rpx;
	border-radius: 50%;
	background: white;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 64rpx;
	margin-bottom: 24rpx;
	box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
}

.user-name {
	display: block;
	font-size: 48rpx;
	font-weight: 700;
	margin-bottom: 8rpx;
}

.user-desc {
	display: block;
	font-size: 28rpx;
	opacity: 0.9;
}

/* 内容区域 */
.content {
	flex: 1;
	padding: 40rpx;
	padding-bottom: 200rpx;
	box-sizing: border-box;
}

/* 功能小程序区域 */
.apps-section {
	margin-bottom: 50rpx;
}

.section-title {
	font-size: 36rpx;
	font-weight: 700;
	color: #333;
	margin-bottom: 30rpx;
	display: flex;
	align-items: center;
}

.section-title::before {
	content: '';
	width: 8rpx;
	height: 36rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 4rpx;
	margin-right: 16rpx;
}

.apps-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 24rpx;
	box-sizing: border-box;
}

.app-card {
	background: white;
	border-radius: 32rpx;
	padding: 40rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	position: relative;
	overflow: hidden;
	transition: all 0.3s ease;
	box-sizing: border-box;
	width: 100%;
}

.app-card::before {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 6rpx;
	background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
	transform: scaleX(0);
	transition: transform 0.3s ease;
}

.app-card:active {
	transform: translateY(-4rpx);
	box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
}

.app-card.disabled {
	opacity: 0.6;
}

.app-card:active::before {
	transform: scaleX(1);
}

.app-icon {
	width: 100rpx;
	height: 100rpx;
	border-radius: 24rpx;
	margin-bottom: 24rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 48rpx;
	font-weight: bold;
	color: white;
}

.app-icon.icon-1 {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.app-icon.icon-2 {
	background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.app-icon.icon-3 {
	background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.app-icon.icon-4 {
	background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}


.app-name {
	display: block;
	font-size: 32rpx;
	font-weight: 600;
	color: #333;
	margin-bottom: 8rpx;
}

.app-desc {
	display: block;
	font-size: 24rpx;
	color: #999;
	line-height: 1.4;
}

/* 底部导航 */
.bottom-nav {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	height: 160rpx;
	background: white;
	display: flex;
	justify-content: space-around;
	align-items: center;
	box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.05);
	padding-bottom: env(safe-area-inset-bottom);
	padding-bottom: constant(safe-area-inset-bottom);
}

.nav-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	flex: 1;
	transition: all 0.3s ease;
}

.nav-item:active {
	transform: scale(0.9);
}

.nav-icon {
	width: 56rpx;
	height: 56rpx;
	border-radius: 16rpx;
	margin-bottom: 8rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 36rpx;
	background: #f0f0f0;
	color: #666;
	transition: all 0.3s ease;
}

.nav-item.active .nav-icon {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
}

.nav-label {
	font-size: 22rpx;
	color: #666;
	transition: all 0.3s ease;
}

.nav-item.active .nav-label {
	color: #667eea;
	font-weight: 600;
}

/* 扫码结果弹窗 */
.scan-modal {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 9999;
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

.scan-modal-content {
	width: 85%;
	max-width: 600rpx;
	background: white;
	border-radius: 32rpx;
	overflow: hidden;
	animation: slideUp 0.3s ease;
	box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.3);
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

.scan-modal-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 40rpx;
	border-bottom: 1rpx solid #f0f0f0;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.scan-modal-title {
	font-size: 36rpx;
	font-weight: 700;
	color: white;
}

.scan-modal-close {
	width: 60rpx;
	height: 60rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 40rpx;
	color: white;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.2);
	transition: all 0.3s ease;
}

.scan-modal-close:active {
	background: rgba(255, 255, 255, 0.3);
	transform: scale(0.9);
}

.scan-modal-body {
	padding: 40rpx;
	max-height: 60vh;
	overflow-y: auto;
}

.scan-result-type,
.scan-result-content,
.scan-result-url {
	margin-bottom: 30rpx;
	word-break: break-all;
}

.scan-result-url {
	padding: 20rpx;
	background: #f8f9fa;
	border-radius: 16rpx;
	border-left: 4rpx solid #667eea;
}

.scan-label {
	font-size: 28rpx;
	color: #666;
	margin-bottom: 12rpx;
	display: block;
	font-weight: 600;
}

.scan-value {
	font-size: 32rpx;
	color: #333;
	line-height: 1.6;
	display: block;
	word-break: break-all;
	user-select: text;
	-webkit-user-select: text;
}

.scan-content {
	padding: 20rpx;
	background: #f8f9fa;
	border-radius: 16rpx;
	min-height: 80rpx;
	user-select: text;
	-webkit-user-select: text;
}

.scan-content-clickable {
	cursor: pointer;
}

.scan-content-clickable:active {
	background: #e9ecef;
}

.scan-url-clickable {
	color: #667eea;
	text-decoration: underline;
}

.scan-modal-footer {
	display: flex;
	border-top: 1rpx solid #f0f0f0;
	padding: 0;
}

.scan-modal-btn {
	flex: 1;
	height: 100rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 32rpx;
	font-weight: 600;
	transition: all 0.3s ease;
	border-right: 1rpx solid #f0f0f0;
}

.scan-modal-btn:last-child {
	border-right: none;
}

.cancel-btn {
	color: #666;
	background: white;
}

.cancel-btn:active {
	background: #f5f5f5;
}

.confirm-btn,
.copy-btn {
	color: white;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.confirm-btn:active,
.copy-btn:active {
	opacity: 0.8;
}

/* 解密后的内容样式 */
.decrypted-content {
	margin-top: 20rpx;
}

.decrypted-header {
	margin-bottom: 30rpx;
	padding-bottom: 20rpx;
	border-bottom: 2rpx solid #e0e0e0;
}

.decrypted-title {
	font-size: 32rpx;
	font-weight: 700;
	color: #667eea;
}

.decrypted-item {
	margin-bottom: 30rpx;
	padding: 24rpx;
	background: #f8f9fa;
	border-radius: 16rpx;
	border-left: 4rpx solid #667eea;
}

.decrypted-item-label {
	font-size: 28rpx;
	font-weight: 600;
	color: #333;
	margin-bottom: 12rpx;
}

.decrypted-item-value {
	font-size: 32rpx;
	color: #667eea;
	font-weight: 500;
	margin-bottom: 8rpx;
	word-break: break-all;
	user-select: text;
	-webkit-user-select: text;
}

.decrypted-item-value.location-value {
	white-space: pre-line;
	line-height: 1.8;
}

.decrypt-failed {
	padding: 30rpx;
	background: #fff3cd;
	border-radius: 16rpx;
	border-left: 4rpx solid #ffc107;
	margin-bottom: 20rpx;
}

.decrypt-failed-text {
	font-size: 28rpx;
	color: #856404;
}
</style>