/**
 * 应用更新工具模块
 * 封装版本检测、忽略版本、更新弹窗、浏览器跳转等逻辑
 * 详见：docs/update-flow-design.md
 */

import { API_BASE } from '@/config/base'

// 本地存储key
const STORAGE_KEY_IGNORED = 'wbtools_ignored_versions'

// 待展示的更新信息与全局弹窗回调（由 update-dialog.vue 注册）
let pendingVersionInfo = null
let dialogHandler = null

/**
 * 获取本地版本信息
 * @returns {Object} { versionCode: number, versionName: string }
 */
function getLocalVersion() {
  let versionCode = 0
  let versionName = '1.0.0'

  // #ifdef APP-PLUS
  try {
    if (typeof plus !== 'undefined' && plus.runtime) {
      versionCode = parseInt(plus.runtime.versionCode, 10) || 0
      versionName = plus.runtime.version || versionName
    }
  } catch (e) {
    console.warn('[Update] 获取本地版本号失败:', e)
  }
  // #endif

  return { versionCode, versionName }
}

/**
 * 获取被忽略的版本列表
 * @returns {number[]}
 */
function getIgnoredVersions() {
  try {
    const ignored = uni.getStorageSync(STORAGE_KEY_IGNORED)
    return ignored ? JSON.parse(ignored) : []
  } catch (e) {
    return []
  }
}

/**
 * 忽略指定版本，仅对该版本号生效
 * @param {number} versionCode
 */
export function ignoreCurrentVersion(versionCode) {
  const ignored = getIgnoredVersions()
  if (!ignored.includes(versionCode)) {
    ignored.push(versionCode)
    uni.setStorageSync(STORAGE_KEY_IGNORED, JSON.stringify(ignored))
  }
}

/**
 * 从服务器获取最新版本信息
 * @returns {Promise<Object|null>}
 */
function fetchLatestVersion() {
  return new Promise((resolve, reject) => {
    // H5 通过 Vite proxy 转发避免跨域问题
    // #ifdef H5
    const url = '/api/wbtools_version/latest'
    // #endif
    // #ifndef H5
    const url = `${API_BASE}/api/wbtools_version/latest`
    // #endif

    uni.request({
      url: url,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.versionCode) {
          resolve(res.data)
        } else if (res.statusCode === 404) {
          resolve(null)
        } else {
          reject(new Error('服务器返回异常'))
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

/**
 * 打开浏览器下载链接
 * @param {string} url
 */
export function openDownloadUrl(url) {
  if (!url) {
    uni.showToast({ title: '下载地址未配置', icon: 'none', duration: 2000 })
    return
  }
  // #ifdef H5
  window.open(url, '_blank')
  // #endif

  // #ifdef APP-PLUS
  if (typeof plus !== 'undefined' && plus.runtime) {
    plus.runtime.openURL(url)
  } else {
    uni.setClipboardData({
      data: url,
      success: () => {
        uni.showToast({
          title: '下载链接已复制，请在浏览器中打开',
          icon: 'none',
          duration: 3000
        })
      }
    })
  }
  // #endif

  // #ifdef MP
  uni.setClipboardData({
    data: url,
    success: () => {
      uni.showToast({
        title: '下载链接已复制，请在浏览器中打开',
        icon: 'none',
        duration: 3000
      })
    }
  })
  // #endif
}

/**
 * 注册更新弹窗回调（由 update-dialog.vue 调用）
 * 若检测逻辑先于弹窗组件完成，会先暂存，注册时立即补触发
 * @param {(versionInfo: Object) => void} handler
 */
export function onUpdateDialog(handler) {
  dialogHandler = handler
  if (pendingVersionInfo) {
    const info = pendingVersionInfo
    pendingVersionInfo = null
    handler(info)
  }
}

/**
 * 检查更新
 * @param {Object} [options]
 * @param {boolean} [options.silent=false] - 静默模式，已是最新时不做提示
 * @returns {Promise<void>}
 */
export async function checkUpdate(options = {}) {
  const { silent = false } = options

  try {
    const localInfo = getLocalVersion()
    const remoteInfo = await fetchLatestVersion()

    if (!remoteInfo) {
      if (!silent) {
        uni.showToast({
          title: '暂无版本信息',
          icon: 'none',
          duration: 2000
        })
      }
      return
    }

    // 检查是否被忽略（精确匹配版本号，仅对当前版本生效）
    const ignoredVersions = getIgnoredVersions()
    if (ignoredVersions.includes(remoteInfo.versionCode)) {
      console.log('[Update] 该版本已被忽略，跳过更新提示')
      return
    }

    // 比较版本号
    if (remoteInfo.versionCode > localInfo.versionCode) {
      if (dialogHandler) {
        dialogHandler(remoteInfo)
      } else {
        // 弹窗组件尚未挂载，先暂存，等注册后补触发
        pendingVersionInfo = remoteInfo
      }
    } else if (!silent) {
      uni.showToast({
        title: '已是最新版本',
        icon: 'success',
        duration: 2000
      })
    }
  } catch (error) {
    console.error('[Update] 检查更新失败:', error)
    if (!silent) {
      uni.showToast({
        title: '检查更新失败',
        icon: 'none',
        duration: 2000
      })
    }
  }
}
