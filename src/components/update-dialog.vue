<template>
	<view class="update-overlay" v-if="visible" @click="handleBackdrop">
		<view class="update-dialog" @click.stop>
			<view class="update-title">版本更新</view>
			<view class="update-body">
				<text class="update-desc">发现新版本 {{ versionName }}</text>
				<text v-if="updateDesc" class="update-desc">{{ updateDesc }}</text>
			</view>

			<!-- 非强制更新：左下跳过，右上是/否 -->
			<view v-if="!forceUpdate" class="update-actions">
				<view class="update-btn skip" @click="handleSkip">跳过</view>
				<view class="update-right">
					<view class="update-btn yes" @click="handleYes">是</view>
					<view class="update-btn gap"></view>
					<view class="update-btn no" @click="handleNo">否</view>
				</view>
			</view>

			<!-- 强制更新：仅去更新 -->
			<view v-else class="update-actions">
				<view class="update-btn yes full" @click="handleYes">去更新</view>
			</view>
		</view>
	</view>
</template>

<script>
import { onUpdateDialog, ignoreCurrentVersion, openDownloadUrl } from '@/utils/update'

export default {
	name: 'UpdateDialog',
	data() {
		return {
			visible: false,
			versionInfo: null
		}
	},
	computed: {
		versionName() { return this.versionInfo ? this.versionInfo.versionName : '' },
		forceUpdate() { return this.versionInfo ? !!this.versionInfo.forceUpdate : false },
		updateDesc() { return this.versionInfo ? this.versionInfo.updateDesc : '' }
	},
	mounted() {
		// 注册全局更新回调，App 启动检测或手动检查都会走到这里
		onUpdateDialog((info) => {
			this.versionInfo = info
			this.visible = true
		})
	},
	methods: {
		close() {
			this.visible = false
			this.versionInfo = null
		},
		// 点遮罩：强制更新不可关闭，非强制可关闭（等同"否"）
		handleBackdrop() {
			if (!this.forceUpdate) this.close()
		},
		// 跳过 = 忽略该版本，仅对当前版本生效
		handleSkip() {
			ignoreCurrentVersion(this.versionInfo.versionCode)
			this.close()
			uni.showToast({ title: '已跳过该版本', icon: 'success', duration: 2000 })
		},
		// 否 = 本次不更新也不忽略
		handleNo() {
			this.close()
		},
		// 是 = 立即更新
		handleYes() {
			openDownloadUrl(this.versionInfo.downloadUrl)
			this.close()
		}
	}
}
</script>

<style>
.update-overlay {
	position: fixed;
	top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0,0,0,0.5);
	z-index: 9999;
	display: flex;
	align-items: center;
	justify-content: center;
	animation: fadeIn 0.2s ease;
}
.update-dialog {
	width: 300px;
	max-width: 80%;
	background: #ffffff;
	border-radius: 12px;
	padding: 20px 0 0;
	overflow: hidden;
}
.update-title {
	font-size: 17px;
	font-weight: 600;
	text-align: center;
	color: #1c1c1e;
	margin-bottom: 12px;
}
.update-body {
	padding: 0 20px 4px;
	box-sizing: border-box;
}
.update-desc {
	display: block;
	font-size: 13px;
	line-height: 1.6;
	color: #3c3c43;
	white-space: pre-wrap;
}
.update-actions {
	display: flex;
	justify-content: space-between;
	align-items: center;
	border-top: 1px solid #d1d1d6;
	margin-top: 16px;
	padding: 5px 20px 12px;
}
.update-btn {
	height: 25px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 14px;
	border: none;
	background: transparent;
}
.update-btn::after { border: none; }
.update-btn.skip { color: #8e8e93; padding-left: 4px; }
.update-right {
	display: flex;
	align-items: center;
}
.update-btn.yes { color: #007aff; font-weight: 600; }
.update-btn.no { color: #1c1c1e; }
.update-btn.gap { width: 32px; } /* 是/否之间的间距 */
.update-btn.full { flex: 1; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
