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
	</view>
</template>

<script>
export default {
	data() {
		return {
			statusBarHeight: 0,
			userName: '张三',
			currentTab: 0,
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
	},
	methods: {
		handleScan() {
			// 调用扫码API
			uni.scanCode({
				// 不限制只从相机扫码，允许从相册选择
				onlyFromCamera: false,
				// 只扫描二维码
				scanType: ['qrCode'],
				// 启用自动放大（仅支持 App-Android 3.5.4+）
				autoZoom: true,
				success: (res) => {
					console.log('扫码成功:', res)
					// 扫码成功后处理结果
					this.handleScanResult(res.result)
				},
				fail: (err) => {
					console.error('扫码失败:', err)
					// 用户取消或识别失败
					if (err.errMsg && err.errMsg.indexOf('cancel') === -1) {
						uni.showToast({
							title: '扫码失败',
							icon: 'none',
							duration: 2000
						})
					}
				}
			})
		},
		handleScanResult(result) {
			// 判断扫码结果是否为URL
			const isUrl = this.isValidUrl(result)
			
			if (isUrl) {
				// 如果是URL，显示确认对话框询问是否打开
				uni.showModal({
					title: '扫码结果',
					content: `检测到网址：\n${result}\n\n是否打开此链接？`,
					confirmText: '打开',
					cancelText: '取消',
					success: (modalRes) => {
						if (modalRes.confirm) {
							// 用户点击确认，打开链接
							this.openExternalUrl(result)
						}
					}
				})
			} else {
				// 如果不是URL，直接显示扫码内容
				uni.showModal({
					title: '扫码结果',
					content: result,
					showCancel: false,
					confirmText: '确定'
				})
			}
		},
		isValidUrl(string) {
			// 判断字符串是否为有效的URL
			try {
				// 检查是否以http://或https://开头
				if (string.startsWith('http://') || string.startsWith('https://')) {
					new URL(string)
					return true
				}
				// 检查是否为常见的URL格式（不带协议）
				if (/^(www\.)?[\w-]+(\.[\w-]+)+/.test(string)) {
					return true
				}
				return false
			} catch (e) {
				return false
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
</style>