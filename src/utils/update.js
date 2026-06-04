/**
 * 应用更新工具模块
 * 封装版本检测、忽略版本、更新弹窗、浏览器跳转等逻辑
 * 详见：docs/update-flow-design.md
 */

// 服务器地址（用于APP端直接请求）
const API_BASE_URL = 'http://kyrian.asia'

// 本地存储key
const STORAGE_KEY_IGNORED = 'wbtools_ignored_versions'

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
 * 添加版本到忽略列表
 * @param {number} versionCode
 */
function addIgnoredVersion(versionCode) {
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
    const url = `${API_BASE_URL}/api/wbtools_version/latest`
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
function openDownloadUrl(url) {
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
 * 显示更新对话框
 * @param {Object} versionInfo - 服务器返回的版本信息
 * @param {Object} localInfo - 本地版本信息
 */
function showUpdateDialog(versionInfo /*, localInfo */) {
  const { versionName, forceUpdate, updateDesc, downloadUrl } = versionInfo

  if (!downloadUrl) {
    uni.showToast({
      title: '下载地址未配置',
      icon: 'none',
      duration: 2000
    })
    return
  }

  // 构建更新说明文本
  let content = `发现新版本 ${versionName}\n\n`
  if (updateDesc) {
    content += updateDesc
  }

  if (forceUpdate) {
    // 强制更新 - 只显示"去更新"按钮，不可关闭
    uni.showModal({
      title: '版本更新',
      content: content,
      showCancel: false,
      confirmText: '去更新',
      success: (res) => {
        if (res.confirm) {
          openDownloadUrl(downloadUrl)
        }
      }
    })
  } else {
    // 非强制更新 - 取消后询问是否忽略该版本
    uni.showModal({
      title: '版本更新',
      content: content,
      cancelText: '取消',
      confirmText: '立即更新',
      success: (res) => {
        if (res.confirm) {
          openDownloadUrl(downloadUrl)
        } else {
          // 取消 - 提示是否忽略该版本
          uni.showModal({
            title: '提示',
            content: '是否忽略该版本，以后不再提醒？',
            cancelText: '否',
            confirmText: '忽略该版本',
            success: (res2) => {
              if (res2.confirm) {
                addIgnoredVersion(versionInfo.versionCode)
                uni.showToast({
                  title: '已忽略该版本',
                  icon: 'success',
                  duration: 2000
                })
              }
            }
          })
        }
      }
    })
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

    // 检查是否被忽略
    const ignoredVersions = getIgnoredVersions()
    if (ignoredVersions.includes(remoteInfo.versionCode)) {
      console.log('[Update] 该版本已被忽略，跳过更新提示')
      return
    }

    // 比较版本号
    if (remoteInfo.versionCode > localInfo.versionCode) {
      showUpdateDialog(remoteInfo, localInfo)
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
