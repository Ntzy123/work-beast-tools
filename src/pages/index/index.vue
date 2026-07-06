<template>
	<view class="page">
		<!-- 状态栏占位 -->
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		
		<!-- 头部区域 -->
		<view class="header">
			<view class="header-title">WBTools</view>
			<view class="header-actions">
			<view class="icon-btn" @click="handleScan">
				<image src="/static/images/scan.png" style="width:20px;height:20px;"></image>
			</view>
			<view class="icon-btn" @click="openSettingsModal">
				<image src="/static/images/settings.png" style="width:20px;height:20px;"></image>
			</view>
			</view>
		</view>

		<!-- Hero 区域 -->
		<view class="hero">
			<text class="hero-title">打工人的</text>
			<text class="hero-title">日常工具包</text>
			<view class="hero-tags">
				<view class="tag"><text class="tag-icon">⚡</text><text>高效</text></view>
				<view class="tag"><text class="tag-icon">✨</text><text>简洁</text></view>
				<view class="tag"><text class="tag-icon">🔧</text><text>实用</text></view>
			</view>
		</view>

		<!-- 人员状态卡片 -->
		<view class="section-label">
			<image src="/static/images/person.png" class="section-label-icon" />
			<text class="section-label-text">人员状态</text>
		</view>
		<view class="status-card" @click="statusLoaded && toggleStatusDetail()">
			<view class="status-row">
				<view class="status-info">
					<view class="status-name-row">
						<text class="status-name">{{ statusLoaded ? statusData.name : '加载中...' }}</text>
						<image v-if="statusLoaded" :src="statusData.online ? '/static/images/status-online.png' : '/static/images/status-offline.png'" class="status-dot-img" />
					</view>
					<text class="status-distance" v-if="statusLoaded">{{ statusData.distanceText }}</text>
				</view>
				<view class="status-meta" v-if="statusLoaded">
					<text class="status-time">{{ statusData.timeText }}</text>
				</view>
				<view v-if="statusLoaded" :class="['status-chevron', { expanded: statusExpanded }]">
					<image src="/static/images/chevron-down.png" class="chevron-icon" />
				</view>
			</view>
			<view v-if="statusLoaded" :class="['status-detail', { show: statusExpanded }]">
				<view class="status-detail-inner">
					<view class="detail-row">
						<text class="detail-label">状态</text>
						<view :class="['status-badge', statusData.online ? 'online' : 'offline']">
							<image :src="statusData.online ? '/static/images/status-online.png' : '/static/images/status-offline.png'" class="badge-dot-img" />
							<text>{{ statusData.online ? '在线' : '离线' }}</text>
						</view>
					</view>
					<view class="detail-row">
						<text class="detail-label">最近一次状态更新</text>
						<text class="detail-value mono">{{ statusData.lastPunchText }}</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 搜索框 -->
		<view class="search-box">
			<image src="/static/images/search.png" style="width:18px;height:18px;"></image>
			<input class="search-input" type="text" placeholder="搜索工具..." @input="onSearchInput" />
		</view>

		<!-- 工具列表 -->
		<view class="tools-list">
			<view 
				v-for="(app, index) in utilityApps" 
				:key="index"
				class="tool-card"
				:class="{ hidden: filteredApps && !filteredApps.includes(index) }"
				@click="handleAppClick(app)"
			>
				<view class="tool-icon" :class="['tool-icon-' + (index + 1)]">
					<image v-if="index === 0" src="/static/images/image.png" style="width:24px;height:24px;"></image>
					<image v-if="index === 1" src="/static/images/moon.png" style="width:24px;height:24px;"></image>
					<image v-if="index === 2" src="/static/images/water.png" style="width:24px;height:24px;"></image>
				</view>
				<view class="tool-content">
					<text class="tool-name">{{ app.name }}</text>
					<text class="tool-desc">{{ app.desc }}</text>
				</view>
				<view class="tool-arrow">
					<image src="/static/images/arrow-right.png" style="width:18px;height:18px;"></image>
				</view>
			</view>
		</view>

		<!-- 送水查询 - 底部弹窗 -->
		<view class="bottom-sheet-overlay" v-if="showWaterModal" @click="closeWaterModal">
			<view class="bottom-sheet" @click.stop>
				<view class="sheet-handle"></view>
				<scroll-view class="sheet-body" scroll-y>
					<!-- 查询日期 -->
					<view class="water-date">
						<text class="water-date-label">查询日期：</text>
						<text class="water-date-value">{{ waterData.query_date }}</text>
					</view>
					
					<!-- 总送水桶数 -->
					<view class="water-total-card">
						<view class="water-total-icon">
							<image src="/static/images/water.png" style="width:32px;height:32px;"></image>
						</view>
						<view class="water-total-info">
							<text class="water-total-number">{{ waterData.total_buckets }}</text>
							<text class="water-total-label">今日白班总送水桶数</text>
						</view>
					</view>
					
					<!-- 分割线 -->
					<view class="sheet-divider"></view>
					
					<!-- 送水人列表 -->
					<view class="water-section-title">送水人员详情</view>
					
					<view class="water-deliverer-list">
						<view 
							class="water-deliverer-item" 
							v-for="(item, index) in waterData.deliverers" 
							:key="index"
						>
							<view class="deliverer-left">
								<view class="deliverer-avatar">{{ getInitials(item.name) }}</view>
								<view class="deliverer-info">
									<text class="deliverer-name">{{ item.name }}</text>
									<text class="deliverer-mobile">{{ item.mobile }}</text>
								</view>
							</view>
							<view class="deliverer-right">
								<view class="deliverer-stat">
									<text class="stat-number">{{ item.order_count }}</text>
									<text class="stat-label">订单</text>
								</view>
								<view class="deliverer-stat">
									<text class="stat-number">{{ item.total_buckets }}</text>
									<text class="stat-label">桶数</text>
								</view>
							</view>
						</view>
					</view>
					
					<!-- 无数据提示 -->
					<view class="water-empty" v-if="waterData.deliverers.length === 0">
						<text>暂无送水数据</text>
					</view>
				</scroll-view>
			</view>
		</view>
		
		<!-- 扫码结果弹窗 -->
		<view class="scan-modal" v-if="showScanModal" @click="closeScanModal">
			<view class="scan-modal-content" @click.stop>
				<view class="scan-modal-header">
					<text class="scan-modal-title">扫码结果</text>
				<view class="scan-modal-close" @click="closeScanModal">
					<image src="/static/images/close.png" style="width:18px;height:18px;"></image>
				</view>
				</view>
				<view class="scan-modal-body">
					<view v-if="scanResult.isEncrypted && scanResult.decrypted" class="decrypted-content">
						<view class="decrypted-header">
							<text class="decrypted-title">已解密的水印信息</text>
						</view>
						<view 
							class="decrypted-item" 
							v-for="(item, index) in formatDecryptedData(scanResult.decrypted)" 
							:key="index"
						>
							<text class="decrypted-item-label">{{ item.label }}：</text>
							<text class="decrypted-item-value" :class="{ 'location-value': item.label === '定位' }" selectable>{{ item.value }}</text>
						</view>
					</view>
					
					<view v-else-if="scanResult.isEncrypted && !scanResult.decrypted" class="decrypt-failed">
						<text class="decrypt-failed-text">解密失败，显示原始内容</text>
					</view>
					
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
					<view class="scan-modal-btn copy-btn" @click="copyScanResult">复制内容</view>
				</view>
			</view>
		</view>

		<!-- 设置 - 底部弹窗 -->
		<view class="bottom-sheet-overlay" v-if="showSettingsModal" @click="closeSettingsModal">
			<view class="bottom-sheet" @click.stop>
				<view class="sheet-handle"></view>
				<scroll-view class="sheet-body" scroll-y>
					<view class="settings-section">
						<text class="settings-section-title">应用信息</text>
						<view class="settings-info-item">
							<text class="settings-info-label">应用名称</text>
							<text class="settings-info-value">牛马工具箱</text>
						</view>
						<view class="settings-info-item">
							<text class="settings-info-label">当前版本</text>
							<text class="settings-info-value">{{ localVersionName }}</text>
						</view>
						<view class="settings-info-item">
							<text class="settings-info-label">版本号</text>
							<text class="settings-info-value">{{ localVersionCode }}</text>
						</view>
					</view>
					<view class="settings-section">
						<view class="settings-update-btn" @click="checkForUpdateManually">
							<text class="settings-update-btn-text">检查更新</text>
						</view>
					</view>
				</scroll-view>
			</view>
		</view>

		<!-- 自动夜答 - 底部弹窗 -->
		<view class="bottom-sheet-overlay" v-if="showEasycheckModal" @click="closeEasycheckModal">
			<view class="bottom-sheet" @click.stop>
				<view class="sheet-handle"></view>
				<scroll-view class="sheet-body" scroll-y>
					<!-- 创建表单 -->
					<template v-if="easycheckMode === 'create'">
						<view class="easycheck-title">创建自动夜答实例</view>
						<view class="form-group">
							<text class="form-label">手机号</text>
							<input class="form-input" type="number" v-model="easycheckForm.mobile" placeholder="请输入手机号" maxlength="11" />
						</view>
						<view class="form-group">
							<text class="form-label">密码</text>
							<input class="form-input" type="password" v-model="easycheckForm.password" placeholder="请输入密码" />
						</view>
						<view class="form-group">
							<text class="form-label">实例名称 <text class="form-optional">（可选）</text></text>
							<input class="form-input" type="text" v-model="easycheckForm.instanceName" placeholder="留空将使用随机名称" />
						</view>
						<view class="easycheck-btn" :class="{ loading: easycheckCreating }" @click="createEasycheckInstance">
							<text v-if="!easycheckCreating">创建</text>
							<text v-else>创建中...</text>
						</view>
					</template>

					<!-- 状态面板 -->
					<template v-if="easycheckMode === 'status' && easycheckStatus">
						<view class="easycheck-title">实例状态</view>
						<view class="easycheck-status-card">
							<view class="status-row-item">
								<text class="status-label">实例名称</text>
								<text class="status-value">{{ easycheckStatus.name }}</text>
							</view>
							<view class="status-row-item">
								<text class="status-label">运行状态</text>
								<view :class="['easycheck-badge', easycheckStatus.running ? 'running' : 'stopped']">
									<text>{{ easycheckStatus.running ? '运行中' : '已停止' }}</text>
								</view>
							</view>
							<view class="status-row-item">
								<text class="status-label">目标 URL</text>
								<text class="status-value mono" selectable>{{ easycheckStatus.url }}</text>
							</view>
							<view class="status-row-item">
								<text class="status-label">创建时间</text>
								<text class="status-value">{{ easycheckStatus.created_at }}</text>
							</view>
						</view>
						<view class="easycheck-btn secondary" :class="{ loading: easycheckStatusLoading }" @click="refreshEasycheckStatus">
							<text>刷新状态</text>
						</view>
					</template>
				</scroll-view>
			</view>
		</view>
	</view>
</template>

<script>
import CryptoJS from 'crypto-js'
import apiConfig from '@/config/api.config.json'
import { API_BASE } from '@/config/base'

const AEC_API_BASE = 'https://aec.kyrian.asia'
import { checkUpdate } from '@/utils/update'

export default {
	data() {
		return {
			statusBarHeight: 0,
			userName: '张三',
			currentTab: 0,
			showScanModal: false,
			showWaterModal: false,
			waterData: {
				success: false,
				query_date: '',
				total_buckets: 0,
				deliverers: []
			},
			scanResult: {
				result: '',
				scanType: '',
				decrypted: null,
				isEncrypted: false
			},
			encryptionKey: 'e373d090928170eb',
			showSettingsModal: false,
			localVersionName: '',
			localVersionCode: '',
			utilityApps: [
				{ icon: '🖼️', name: '添加水印', desc: '给照片添加上时间、姓名水印和二维码', path: 'pages/watermark/index' },
				{ icon: '🌙', name: '自动夜答', desc: '查看或创建自动夜答实例', action: 'openEasycheck' },
				{ icon: '🚰', name: '查询送水', desc: '查看今日白班送水情况', action: 'queryWater' }
			],
			filteredApps: null,
			statusExpanded: false,
			statusTimer: null,
			statusData: {
				name: '',
				online: false,
				distance: 0,
				timestamp: 0,
				distanceText: '',
				timeText: '',
				lastPunchText: ''
			},
			statusLoaded: false,
			showEasycheckModal: false,
			easycheckMode: 'create',
			easycheckForm: {
				mobile: '',
				password: '',
				instanceName: ''
			},
			easycheckInstanceId: '',
			easycheckStatus: null,
			easycheckCreating: false,
			easycheckStatusLoading: false,
			easycheckServerOffline: false
		}
	},
	onLoad() {
		const systemInfo = uni.getSystemInfoSync()
		this.statusBarHeight = systemInfo.statusBarHeight || 0
		
		// #ifdef APP-PLUS
		try {
			if (typeof plus !== 'undefined' && plus.runtime) {
				this.localVersionName = plus.runtime.version || '1.0.0'
				this.localVersionCode = String(parseInt(plus.runtime.versionCode, 10) || 0)
			}
		} catch (e) {
			this.localVersionName = '1.0.0'
			this.localVersionCode = '0'
		}
		// #endif
		// #ifndef APP-PLUS
		this.localVersionName = '1.0.0'
		this.localVersionCode = '0'
		// #endif
		
		const cachedKey = uni.getStorageSync('watermark_encryption_key')
		if (cachedKey) {
			this.encryptionKey = cachedKey
		} else {
			uni.setStorageSync('watermark_encryption_key', this.encryptionKey)
		}

		this.fetchStatus()
		this.scheduleNextStatusFetch()
	},
	onUnload() {
		if (this.statusTimer) {
			clearTimeout(this.statusTimer)
			this.statusTimer = null
		}
	},
	methods: {
		onSearchInput(e) {
			const query = (e.detail.value || '').trim().toLowerCase()
			if (!query) {
				this.filteredApps = null
				return
			}
			const indices = []
			this.utilityApps.forEach((app, i) => {
				const name = app.name.toLowerCase()
				const desc = app.desc.toLowerCase()
				if (name.includes(query) || desc.includes(query)) {
					indices.push(i)
				}
			})
			this.filteredApps = indices.length > 0 ? indices : []
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
					}
				}
			} catch (error) {
				console.log('获取加密key失败，使用缓存key:', error)
			}
		},
		isEncryptedQRCode(text) {
			if (!text || typeof text !== 'string') return false
			try {
				const parsed = JSON.parse(text)
				if (parsed && typeof parsed === 'object' && parsed.text && parsed.version) return true
			} catch (e) { return false }
			return false
		},
		async decryptQRCode(encryptedText) {
			try {
				const parsed = JSON.parse(encryptedText)
				if (!parsed.text) return null
				const base64Text = parsed.text.replace(/\\u003d/g, '=')
				await this.fetchKeyFromServer()
				const key = CryptoJS.enc.Utf8.parse(this.encryptionKey)
				const decrypted = CryptoJS.AES.decrypt(base64Text, key, {
					mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7
				})
				const decryptedText = decrypted.toString(CryptoJS.enc.Utf8)
				if (!decryptedText) return null
				return JSON.parse(decryptedText)
			} catch (error) {
				console.error('解密失败:', error)
				return null
			}
		},
		decimalToDMS(decimal, isLatitude) {
			const abs = Math.abs(decimal)
			const degrees = Math.floor(abs)
			const minutesFloat = (abs - degrees) * 60
			const minutes = Math.floor(minutesFloat)
			const seconds = Math.round((minutesFloat - minutes) * 60)
			const direction = isLatitude ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'W')
			return `${degrees}°${minutes}'${seconds}"${direction}`
		},
		formatDecryptedData(data) {
			if (!data || typeof data !== 'object') return []
			const formatted = []
			if (data.n) formatted.push({ label: '姓名', value: data.n })
			if (data.ot) {
				const date = new Date(data.ot * 1000)
				const y = date.getFullYear(), mo = String(date.getMonth() + 1).padStart(2,'0')
				const d = String(date.getDate()).padStart(2,'0'), h = String(date.getHours()).padStart(2,'0')
				const mi = String(date.getMinutes()).padStart(2,'0'), s = String(date.getSeconds()).padStart(2,'0')
				formatted.push({ label: '时间', value: `${y}-${mo}-${d} ${h}:${mi}:${s}` })
			}
			if (data.g && data.g.la !== undefined && data.g.lo !== undefined) {
				formatted.push({ label: '定位', value: `${this.decimalToDMS(data.g.la, true)}\n${this.decimalToDMS(data.g.lo, false)}` })
			}
			if (data.or !== undefined) formatted.push({ label: '时间可靠性', value: data.or.toString() })
			if (data.s) formatted.push({ label: '员工ID', value: data.s.toString() })
			return formatted
		},
		handleScan() {
			uni.scanCode({
				scanType: ['qrCode'],
				success: async (res) => {
					const scanText = res.result || ''
					const isEncrypted = this.isEncryptedQRCode(scanText)
					let decryptedData = null
					if (isEncrypted) {
						uni.showLoading({ title: '解析中...' })
						decryptedData = await this.decryptQRCode(scanText)
						uni.hideLoading()
						if (decryptedData) {
							this.scanResult = { result: scanText, scanType: res.scanType || '二维码', decrypted: decryptedData, isEncrypted: true }
						} else {
							this.scanResult = { result: scanText, scanType: res.scanType || '二维码', decrypted: null, isEncrypted: true }
							uni.showToast({ title: '解密失败，显示原始内容', icon: 'none', duration: 2000 })
						}
					} else {
						this.scanResult = { result: scanText, scanType: res.scanType || '未知', decrypted: null, isEncrypted: false }
					}
					this.showScanModal = true
				},
				fail: (err) => {
					if (err.errMsg && !err.errMsg.includes('cancel')) {
						uni.showToast({ title: '扫码失败：' + (err.errMsg || '未知错误'), icon: 'none', duration: 2000 })
					}
				}
			})
		},
		closeScanModal() {
			this.showScanModal = false
			setTimeout(() => {
				this.scanResult = { result: '', scanType: '', decrypted: null, isEncrypted: false }
			}, 300)
		},
		async queryWaterDelivery() {
			uni.showLoading({ title: '加载中...' })
			try {
				// #ifdef H5
				const requestUrl = '/api/water'
				// #endif
				// #ifndef H5
				const requestUrl = `${API_BASE}/api/water`
				// #endif
				const response = await new Promise((resolve, reject) => {
					uni.request({
						url: requestUrl, method: 'GET',
						success: (res) => { if (res.statusCode === 200 && res.data) resolve(res.data); else reject(new Error('请求失败')) },
						fail: (err) => { reject(err) }
					})
				})
				uni.hideLoading()
				this.waterData = {
					success: response.success || false, query_date: response.query_date || '',
					total_buckets: response.total_buckets || 0, deliverers: response.deliverers || []
				}
				this.showWaterModal = true
			} catch (error) {
				uni.hideLoading()
				uni.showToast({ title: '查询失败，请稍后重试', icon: 'none', duration: 2000 })
			}
		},
		closeWaterModal() { this.showWaterModal = false },
		getInitials(name) { if (!name) return '?'; return name.charAt(0).toUpperCase() },
		isUrl(str) { if (!str || typeof str !== 'string') return false; const urlPattern = /^(https?|ftp):\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]$/i; return urlPattern.test(str.trim()) },
		openScanUrl() {
			const url = this.scanResult.result
			if (!this.isUrl(url)) { uni.showToast({ title: '无效的网址', icon: 'none', duration: 2000 }); return }
			this.closeScanModal()
			setTimeout(() => { this.openExternalUrl(url) }, 300)
		},
		copyScanResult() {
			const content = this.scanResult.result
			uni.setClipboardData({
				data: content,
				success: () => { uni.showToast({ title: '已复制到剪贴板', icon: 'success', duration: 2000 }); this.closeScanModal() },
				fail: () => { uni.showToast({ title: '复制失败', icon: 'none', duration: 2000 }) }
			})
		},
		handleContentClick() {
			if (!this.scanResult.isEncrypted && this.isUrl(this.scanResult.result)) this.openScanUrl()
		},
		openSettingsModal() { this.showSettingsModal = true },
		closeSettingsModal() { this.showSettingsModal = false },
		checkForUpdateManually() {
			this.closeSettingsModal()
			checkUpdate({ silent: false }).catch(err => { console.error('手动检查更新失败:', err) })
		},
		handleAppClick(app) {
			if (app.disabled) {
				uni.showToast({ title: '敬请期待', icon: 'none', duration: 2000 })
				return
			}
			if (app.action === 'queryWater') { this.queryWaterDelivery(); return }
			if (app.action === 'openEasycheck') { this.handleEasycheck(); return }
			if (app.url) { this.openExternalUrl(app.url); return }
			if (app.path) {
				const url = app.path.startsWith('/') ? app.path : '/' + app.path
				uni.navigateTo({
					url: url,
					success: () => {},
					fail: (err) => {
						const altUrl = app.path.startsWith('/') ? app.path.substring(1) : app.path
						uni.navigateTo({ url: altUrl, fail: (err2) => { uni.showToast({ title: '跳转失败', icon: 'none', duration: 3000 }) } })
					}
				})
				return
			}
			uni.showToast({ title: app.name, icon: 'none', duration: 2000 })
		},
		openExternalUrl(url) {
			// #ifdef H5
			window.open(url, '_blank')
			// #endif
			// #ifdef APP-PLUS
			if (typeof plus !== 'undefined' && plus.runtime) { plus.runtime.openURL(url) } else { uni.showToast({ title: '无法打开链接', icon: 'none', duration: 2000 }) }
			// #endif
			// #ifdef MP
			uni.setClipboardData({ data: url, success: () => { uni.showToast({ title: '链接已复制，请在浏览器中打开', icon: 'none', duration: 3000 }) } })
			// #endif
		},
		switchTab(index) {
			this.currentTab = index
			const tabNames = ['首页', '应用', '我的']
			uni.showToast({ title: tabNames[index], icon: 'none', duration: 1500 })
		},
		toggleStatusDetail() {
			this.statusExpanded = !this.statusExpanded
		},
		async fetchStatus() {
			try {
				const res = await new Promise((resolve, reject) => {
					uni.request({
						// #ifdef H5
						url: '/api/person-device-status/location-latest',
						// #endif
						// #ifndef H5
						url: `${API_BASE}/api/person-device-status/location-latest`,
						// #endif
						method: 'GET',
						success: r => resolve(r),
						fail: e => reject(e)
					})
				})
				if (res.statusCode === 200 && res.data && res.data.records && res.data.records.length > 0) {
					const r = res.data.records[0]
					const ts = new Date(res.data.timestamp)
					const pad = n => String(n).padStart(2, '0')
					const timeStr = `${ts.getFullYear()}-${pad(ts.getMonth()+1)}-${pad(ts.getDate())} ${pad(ts.getHours())}:${pad(ts.getMinutes())}:${pad(ts.getSeconds())}`
					const isOnline = r.status === '1'
					const dist = r.distance_m || 0
					const distText = dist > 1000 ? `距项目 ${(dist / 1000).toFixed(2)} km` : `距项目 ${Math.round(dist)} m`
					this.statusData = {
						name: r.name || '李仕科',
						online: isOnline,
						distance: dist,
						timestamp: res.data.timestamp,
						distanceText: distText,
						timeText: timeStr,
						lastPunchText: timeStr
					}
				}
				this.statusLoaded = true
			} catch (e) {
				console.log('获取人员状态失败:', e)
				this.statusLoaded = true
			}
		},
		scheduleNextStatusFetch() {
			// 计算到下一个分钟的第5秒的延迟，对齐服务器数据更新节奏
			const now = new Date()
			const next = new Date(now)
			next.setSeconds(5)
			next.setMilliseconds(0)
			if (next <= now) next.setMinutes(next.getMinutes() + 1)
			const delay = next.getTime() - now.getTime()
			this.statusTimer = setTimeout(() => {
				this.fetchStatus()
				this.scheduleNextStatusFetch()
			}, delay)
		},
		async handleEasycheck() {
			uni.showLoading({ title: '加载中...' })
			const alive = await this.checkServerAlive()
			uni.hideLoading()
			if (!alive) {
				uni.showToast({ title: '自动夜答管理系统未运行，请联系开发者', icon: 'none', duration: 3000 })
				return
			}
			this.loadEasycheckForm()
			this.easycheckStatus = null
			const savedId = uni.getStorageSync('easycheck_instance_id')
			if (savedId) {
				this.easycheckInstanceId = savedId
				this.easycheckMode = 'status'
				this.easycheckStatusLoading = true
				this.showEasycheckModal = true
				this.queryEasycheckStatus(savedId)
			} else {
				this.easycheckInstanceId = ''
				this.easycheckMode = 'create'
				this.showEasycheckModal = true
			}
		},
		async checkServerAlive() {
			try {
				const res = await new Promise((resolve, reject) => {
					const timer = setTimeout(() => reject(new Error('超时')), 5000)
					uni.request({
						url: `${AEC_API_BASE}/api/status`,
						method: 'GET',
						success: (r) => { clearTimeout(timer); resolve(r) },
						fail: (e) => { clearTimeout(timer); reject(e) }
					})
				})
				if (res.statusCode === 502 || res.statusCode >= 500) return false
				if (!res.data || typeof res.data !== 'object') return false
				return true
			} catch {
				return false
			}
		},
		closeEasycheckModal() {
			this.showEasycheckModal = false
			setTimeout(() => {
				this.easycheckMode = 'create'
				this.easycheckStatus = null
			}, 300)
		},
		async queryEasycheckStatus(id) {
			this.easycheckStatusLoading = true
			try {
				const res = await new Promise((resolve, reject) => {
					uni.request({
						url: `${AEC_API_BASE}/api/status`,
						method: 'POST',
						header: { 'Content-Type': 'application/json' },
						data: { id },
						success: r => resolve(r),
						fail: e => reject(e)
					})
				})
				if (res.statusCode === 200 && res.data) {
					if (res.data.code === 0 && res.data.instance) {
						this.easycheckStatus = res.data.instance
						this.easycheckMode = 'status'
					} else if (res.data.code === 1) {
						uni.removeStorageSync('easycheck_instance_id')
						this.easycheckInstanceId = ''
						this.easycheckMode = 'create'
						this.easycheckStatus = null
						uni.showToast({ title: '实例已不存在', icon: 'none', duration: 2000 })
					} else {
						throw new Error(res.data.msg || '查询失败')
					}
				} else {
					throw new Error('请求失败')
				}
			} catch (err) {
				uni.showToast({ title: '查询状态失败', icon: 'none', duration: 2000 })
				this.easycheckMode = 'create'
				this.easycheckStatus = null
			} finally {
				this.easycheckStatusLoading = false
			}
		},
		async createEasycheckInstance() {
			const { mobile, password, instanceName } = this.easycheckForm
			if (!mobile || !password) {
				uni.showToast({ title: '请填写手机号和密码', icon: 'none', duration: 2000 })
				return
			}
			this.easycheckCreating = true
			try {
				const urlRes = await new Promise((resolve, reject) => {
					uni.request({
						url: `${AEC_API_BASE}/api/get-easycheck-url`,
						method: 'POST',
						header: { 'Content-Type': 'application/json' },
						data: { mobile, password },
						success: r => resolve(r),
						fail: e => reject(e)
					})
				})
				if (urlRes.statusCode !== 200 || !urlRes.data || urlRes.data.code !== 0) {
					throw new Error(urlRes.data?.msg || '获取授权URL失败')
				}
				const easycheckUrl = urlRes.data.easycheck_url
				const name = instanceName.trim() || `auto-${String(Math.random()).slice(2, 8)}`
				const createRes = await new Promise((resolve, reject) => {
					uni.request({
						url: `${AEC_API_BASE}/api/create`,
						method: 'POST',
						header: { 'Content-Type': 'application/json' },
						data: { instance_name: name, easycheck_url: easycheckUrl },
						success: r => resolve(r),
						fail: e => reject(e)
					})
				})
				if (createRes.statusCode === 201 && createRes.data && createRes.data.code === 0) {
					const instanceId = createRes.data.instance_id
					this.easycheckInstanceId = instanceId
					uni.setStorageSync('easycheck_instance_id', instanceId)
					this.saveEasycheckForm()
					await this.queryEasycheckStatus(instanceId)
				} else {
					throw new Error(createRes.data?.msg || '创建实例失败')
				}
			} catch (err) {
				uni.showToast({ title: err.message || '创建失败', icon: 'none', duration: 2000 })
			} finally {
				this.easycheckCreating = false
			}
		},
		refreshEasycheckStatus() {
			if (this.easycheckInstanceId) this.queryEasycheckStatus(this.easycheckInstanceId)
		},
		saveEasycheckForm() {
			uni.setStorageSync('easycheck_mobile', this.easycheckForm.mobile)
			uni.setStorageSync('easycheck_password', this.easycheckForm.password)
			uni.setStorageSync('easycheck_instance_name', this.easycheckForm.instanceName)
		},
		loadEasycheckForm() {
			this.easycheckForm.mobile = uni.getStorageSync('easycheck_mobile') || ''
			this.easycheckForm.password = uni.getStorageSync('easycheck_password') || ''
			this.easycheckForm.instanceName = uni.getStorageSync('easycheck_instance_name') || ''
		}
	},
}
</script>

<style lang="scss" scoped>
/* ========== Page Base ========== */
.page {
	min-height: 100vh;
	background: #f5f6f8;
	padding: 0 20px 40px;
	box-sizing: border-box;
}

.status-bar {
	width: 100%;
	background: transparent;
}

/* ========== Header ========== */
.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 0 0;
}

.header-title {
	font-size: 20px;
	font-weight: 700;
	color: #1a1a2e;
}

.header-actions {
	display: flex;
	gap: 8px;
}

.icon-btn {
	width: 36px;
	height: 36px;
	border-radius: 10px;
	background: #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.2s ease;
	color: #8a8a9a;
	box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.icon-btn:active {
	transform: scale(0.92);
	background: #f0f0f4;
}

/* ========== Hero ========== */
.hero {
	text-align: center;
	padding: 24px 0 20px;
}

.hero-title {
	display: block;
	font-size: 24px;
	font-weight: 700;
	color: #1a1a2e;
	line-height: 1.3;
	letter-spacing: -0.5px;
}

.hero-tags {
	display: flex;
	justify-content: center;
	gap: 10px;
	margin-top: 14px;
}

.tag {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 6px 14px;
	background: #ffffff;
	border-radius: 20px;
	font-size: 13px;
	color: #8a8a9a;
	box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.tag-icon {
	font-size: 14px;
}

/* ========== Section Label ========== */
.section-label {
    display: flex; align-items: center; gap: 6px;
    margin-bottom: 10px; margin-top: 4px;
}
.section-label-icon { width: 14px; height: 14px; display: block; }
.section-label-text {
	font-size: 12px; font-weight: 600;
	color: #8a8a9a; letter-spacing: 0.5px;
}

/* ========== Status Card ========== */
.status-card {
	background: #ffffff;
	border-radius: 14px;
	padding: 14px 16px;
	margin-bottom: 14px;
	box-shadow: 0 2px 16px rgba(0,0,0,0.06);
	transition: all 0.2s ease;
	border: 1px solid transparent;
}
.status-card:active { transform: scale(0.99); }

.status-row {
	display: flex; align-items: center; gap: 10px;
}
.status-info { flex: 1; min-width: 0; }
.status-name-row {
	display: flex; align-items: center; gap: 10px;
}
.status-name { font-size: 15px; font-weight: 600; color: #1a1a2e; }
.status-dot-img {
	width: 10px; height: 10px; flex-shrink: 0; display: block;
}
.status-distance {
	font-size: 12px; color: #8a8a9a; margin-top: 2px;
}
.status-meta { text-align: right; flex-shrink: 0; }
.status-time {
	font-size: 11px; color: #b0b0c0; white-space: nowrap;
}
.status-chevron {
	display: flex; align-items: center; justify-content: center;
	margin-left: 6px; flex-shrink: 0;
	transition: transform 0.3s ease;
}
.status-chevron.expanded { transform: rotate(180deg); }
.chevron-icon { width: 14px; height: 14px; display: block; }

/* Expanded details */
.status-detail {
	overflow: hidden;
	max-height: 0;
	transition: max-height 0.35s ease, padding 0.35s ease;
	padding: 0 48px 0 0;
}
.status-detail.show {
	max-height: 200px;
	padding-top: 12px;
}
.status-detail-inner {
	border-top: 1px solid #e8e8ed;
	padding-top: 12px;
}
.detail-row {
	display: flex; justify-content: space-between; align-items: center;
	padding: 5px 0; font-size: 13px;
}
.detail-label { color: #8a8a9a; }
.detail-value { color: #1a1a2e; font-weight: 500; }
.detail-value.mono {
	font-family: 'SF Mono', Menlo, Consolas, monospace;
	font-size: 12px;
}
.status-badge {
	display: inline-flex; align-items: center;
	padding: 2px 10px; border-radius: 10px; font-size: 12px; font-weight: 500;
}
.status-badge.online {
	background: rgba(52,199,89,0.12); color: #34c759;
}
.status-badge.offline {
	background: rgba(142,142,147,0.12); color: #8a8a9a;
}
.badge-dot-img {
	width: 7px; height: 7px; display: block; margin-right: 6px;
}

/* ========== Search ========== */
.search-box {
	display: flex;
	align-items: center;
	gap: 10px;
	background: #ffffff;
	border-radius: 14px;
	padding: 0 16px;
	height: 50px;
	margin-bottom: 20px;
	box-shadow: 0 2px 16px rgba(0,0,0,0.06);
}

.search-input {
	flex: 1;
	height: 100%;
	border: none;
	outline: none;
	background: transparent;
	font-size: 15px;
	color: #1a1a2e;
}

.search-input::placeholder {
	color: #a0a0b8;
}

/* ========== Tools ========== */
.tools-list {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.tool-card {
	display: flex;
	align-items: center;
	gap: 14px;
	background: #ffffff;
	border-radius: 16px;
	padding: 16px;
	box-shadow: 0 2px 16px rgba(0,0,0,0.06);
	transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
	animation: fadeInUp 0.4s ease both;
}

.tool-card:nth-child(1) { animation-delay: 0.05s; }
.tool-card:nth-child(2) { animation-delay: 0.1s; }
.tool-card:nth-child(3) { animation-delay: 0.15s; }

.tool-card.hidden {
	display: none;
}

.tool-card:active {
	transform: scale(0.98);
}

@keyframes fadeInUp {
	from { opacity: 0; transform: translateY(12px); }
	to { opacity: 1; transform: translateY(0); }
}

.tool-icon {
	width: 48px;
	height: 48px;
	border-radius: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.tool-icon-1 { background: #7c5cfc; }
.tool-icon-2 { background: #ec4899; }
.tool-icon-3 { background: #06b6d4; }

.tool-content {
	flex: 1;
	min-width: 0;
}

.tool-name {
	display: block;
	font-size: 16px;
	font-weight: 600;
	color: #1a1a2e;
	margin-bottom: 3px;
}

.tool-desc {
	display: block;
	font-size: 13px;
	color: #8a8a9a;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.tool-arrow {
	color: #8a8a9a;
	flex-shrink: 0;
	transition: transform 0.2s ease;
}

.tool-card:active .tool-arrow {
	transform: translateX(3px);
}

/* ========== Bottom Sheet ========== */
.bottom-sheet-overlay {
	position: fixed;
	top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0,0,0,0.4);
	z-index: 9999;
	animation: fadeIn 0.2s ease;
}

.bottom-sheet {
	position: fixed;
	bottom: 0; left: 0; right: 0;
	background: #ffffff;
	border-radius: 20px 20px 0 0;
	max-height: 90vh;
	display: flex;
	flex-direction: column;
	animation: sheetUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	max-width: 420px;
	margin: 0 auto;
}

@keyframes sheetUp {
	from { transform: translateY(100%); }
	to { transform: translateY(0); }
}

.sheet-handle {
	width: 36px;
	height: 4px;
	background: #d1d1d6;
	border-radius: 2px;
	margin: 12px auto 8px;
	position: sticky;
	top: 0;
	z-index: 1;
	flex-shrink: 0;
}

.sheet-body {
	padding: 8px 20px 32px;
	flex: 1;
	overflow-y: auto;
	max-height: 75vh;
	width: 100%;
	box-sizing: border-box;
}

.sheet-body > view {
	width: 100%;
	box-sizing: border-box;
}

.water-date {
	text-align: center;
	margin-bottom: 16px;
}

.water-date-label { font-size: 14px; color: #8e8e93; }
.water-date-value { font-size: 14px; color: #1c1c1e; font-weight: 600; }

.water-total-card {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 16px;
	padding: 24px;
	background: linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%);
	border-radius: 16px;
	margin-bottom: 16px;
}

.water-total-icon {
	width: 56px; height: 56px;
	background: rgba(255,255,255,0.1);
	border-radius: 14px;
	display: flex; align-items: center; justify-content: center;
	color: white;
}

.water-total-info { display: flex; flex-direction: column; }
.water-total-number { font-size: 36px; font-weight: 800; color: white; line-height: 1; }
.water-total-label { font-size: 13px; color: rgba(255,255,255,0.7); margin-top: 4px; }

.sheet-divider { height: 1px; background: #f0f0f0; margin: 16px 0; }

.water-section-title {
	font-size: 15px;
	font-weight: 600;
	color: #1c1c1e;
	margin-bottom: 12px;
	display: flex;
	align-items: center;
	gap: 6px;
}
.water-section-title::before {
	content: '';
	width: 6px; height: 6px;
	background: #0284c7;
	border-radius: 50%;
}

.water-deliverer-list { display: flex; flex-direction: column; gap: 10px; }

.water-deliverer-item {
	display: flex; align-items: center; justify-content: space-between;
	padding: 14px 16px; background: #f8f9fc; border-radius: 12px;
	width: 100%;
	box-sizing: border-box;
}

.deliverer-left { display: flex; align-items: center; gap: 12px; }

.deliverer-avatar {
	width: 40px; height: 40px; border-radius: 50%;
	background: #0284c7; display: flex; align-items: center; justify-content: center;
	font-size: 16px; font-weight: 700; color: white; flex-shrink: 0;
}

.deliverer-info { display: flex; flex-direction: column; }
.deliverer-name { font-size: 15px; font-weight: 600; color: #1c1c1e; }
.deliverer-mobile { font-size: 13px; color: #8e8e93; margin-top: 2px; }
.deliverer-right { display: flex; gap: 16px; }

.deliverer-stat { display: flex; flex-direction: column; align-items: center; min-width: 40px; }
.stat-number { font-size: 18px; font-weight: 700; color: #0284c7; }
.stat-label { font-size: 11px; color: #8e8e93; margin-top: 2px; }

.water-empty { text-align: center; padding: 40px; color: #8e8e93; font-size: 14px; }

/* ========== Scan Modal ========== */
.scan-modal {
	position: fixed; top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0,0,0,0.5); z-index: 9999;
	display: flex; align-items: center; justify-content: center;
	animation: fadeIn 0.2s ease;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.scan-modal-content {
	width: 85%; max-width: 320px;
	background: white; border-radius: 20px; overflow: hidden;
	animation: modalUp 0.25s ease;
	box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}

@keyframes modalUp {
	from { transform: translateY(20px); opacity: 0; }
	to { transform: translateY(0); opacity: 1; }
}

.scan-modal-header {
	display: flex; align-items: center; justify-content: space-between;
	padding: 20px 24px; border-bottom: 1px solid #f0f0f0;
}

.scan-modal-title { font-size: 18px; font-weight: 700; color: #1a1a2e; }

.scan-modal-close {
	width: 32px; height: 32px; border-radius: 50%;
	background: #f0f0f0; display: flex; align-items: center; justify-content: center;
	color: #8a8a9a;
}
.scan-modal-close:active { background: #e0e0e0; }

.scan-modal-body { padding: 20px 24px; max-height: 50vh; overflow-y: auto; }

.scan-label { display: block; font-size: 14px; color: #8a8a9a; margin-bottom: 8px; font-weight: 600; }
.scan-value { display: block; font-size: 15px; color: #1a1a2e; line-height: 1.6; word-break: break-all; user-select: text; }
.scan-content {
	padding: 14px; background: #f8f9fa; border-radius: 12px; min-height: 48px;
	user-select: text; -webkit-user-select: text;
}
.scan-content-clickable:active { background: #eef0f4; }
.scan-url-clickable { color: #7c5cfc; text-decoration: underline; }

.decrypted-content { margin-top: 8px; }
.decrypted-header { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #f0f0f0; }
.decrypted-title { font-size: 16px; font-weight: 700; color: #7c5cfc; }

.decrypted-item {
	margin-bottom: 12px; padding: 14px; background: #f8f9fa; border-radius: 12px; border-left: 3px solid #7c5cfc;
}
.decrypted-item-label { font-size: 14px; font-weight: 600; color: #1a1a2e; margin-bottom: 6px; }
.decrypted-item-value { font-size: 15px; color: #7c5cfc; font-weight: 500; word-break: break-all; user-select: text; }
.decrypted-item-value.location-value { white-space: pre-line; line-height: 1.8; }

.decrypt-failed { padding: 16px; background: #fff8e6; border-radius: 12px; border-left: 3px solid #f59e0b; }
.decrypt-failed-text { font-size: 14px; color: #b45309; }

.scan-modal-footer { display: flex; border-top: 1px solid #f0f0f0; }
.scan-modal-btn {
	flex: 1; height: 52px; display: flex; align-items: center; justify-content: center;
	font-size: 16px; font-weight: 600; transition: all 0.2s ease;
}
.cancel-btn { color: #8a8a9a; background: white; }
.cancel-btn:active { background: #f5f5f5; }
.copy-btn { color: white; background: #7c5cfc; }
.copy-btn:active { opacity: 0.85; }

/* ========== Settings in Bottom Sheet ========== */
.settings-section { margin-bottom: 24px; width: 100%; box-sizing: border-box; }
.settings-section-title {
	font-size: 13px; font-weight: 600; color: #8e8e93;
	letter-spacing: 0.3px; margin-bottom: 12px;
}

.settings-info-item {
	display: flex; justify-content: space-between; align-items: center;
	padding: 14px 16px; background: #f8f9fc; border-radius: 12px; margin-bottom: 8px;
	width: 100%;
	box-sizing: border-box;
}
.settings-info-label { font-size: 14px; color: #8e8e93; }
.settings-info-value { font-size: 14px; color: #1c1c1e; font-weight: 600; }

.settings-update-btn {
	display: flex; align-items: center; justify-content: center;
	padding: 16px; background: #1c1c1e; border-radius: 14px;
	transition: all 0.15s ease;
}
.settings-update-btn:active { opacity: 0.8; }
.settings-update-btn-text { font-size: 16px; font-weight: 600; color: white; }

/* ========== Easycheck Modal ========== */
.easycheck-title {
	font-size: 18px; font-weight: 700; color: #1a1a2e;
	text-align: center; margin: 8px 0 20px;
}
.form-group { margin-bottom: 16px; }
.form-label {
	display: block; font-size: 14px; font-weight: 600;
	color: #1a1a2e; margin-bottom: 6px;
}
.form-optional { font-size: 12px; color: #8a8a9a; font-weight: 400; }
.form-input {
	width: 100%; height: 48px; padding: 0 14px;
	background: #f5f6f8; border-radius: 12px; border: none;
	font-size: 15px; color: #1a1a2e; box-sizing: border-box;
}
.form-input::placeholder { color: #a0a0b8; }
.form-input:focus {
	background: #ffffff;
	box-shadow: 0 0 0 2px rgba(124,92,252,0.15);
}
.easycheck-btn {
	display: flex; align-items: center; justify-content: center;
	height: 50px; border-radius: 14px;
	background: linear-gradient(135deg, #7c5cfc 0%, #a78bfa 100%);
	font-size: 16px; font-weight: 700; color: white;
	margin-top: 24px; transition: all 0.2s ease;
}
.easycheck-btn:active { opacity: 0.85; transform: scale(0.98); }
.easycheck-btn.loading { opacity: 0.7; pointer-events: none; }
.easycheck-btn.secondary {
	background: #1c1c1e; margin-top: 16px;
}
.easycheck-btn.secondary:active { opacity: 0.8; }
.easycheck-status-card {
	background: #f8f9fc; border-radius: 14px; padding: 16px;
}
.status-row-item {
	display: flex; justify-content: space-between; align-items: center;
	padding: 10px 0; font-size: 14px;
}
.status-row-item + .status-row-item { border-top: 1px solid #e8e8ed; }
.status-label { color: #8a8a9a; font-weight: 500; flex-shrink: 0; margin-right: 12px; }
.status-value { color: #1a1a2e; font-weight: 600; text-align: right; word-break: break-all; }
.status-value.mono { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 13px; }
.easycheck-badge {
	display: inline-flex; align-items: center;
	padding: 3px 12px; border-radius: 10px; font-size: 13px; font-weight: 600;
}
.easycheck-badge.running { background: rgba(52,199,89,0.12); color: #34c759; }
.easycheck-badge.stopped { background: rgba(142,142,147,0.12); color: #8a8a9a; }


</style>
