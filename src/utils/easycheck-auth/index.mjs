/**
 * easycheck 授权 URL 获取工具
 *
 * 根据 docs/get-easycheck-url-flow.md 实现的完整 OAuth 流程。
 *
 * 对外只暴露一个函数：
 *   getEasycheckUrl(mobile, password) → Promise<string>
 *
 * 用法：
 *   import { getEasycheckUrl } from './src/utils/easycheck-auth/index.mjs'
 *   const url = await getEasycheckUrl('138xxxx', 'password')
 *   console.log('easycheck URL:', url)
 */

import { CookieJar } from './cookieJar.mjs'

// ─── 常量 ───────────────────────────────────────────────

const BASE_URL = 'https://base.onewo.com'
const GW_URL   = 'https://gw.4009515151.com'
const RM_URL   = 'https://rm.vankeservice.com'

const RURL = '/nightAnswer'

// ─── 内部工具 ───────────────────────────────────────────

/**
 * 发起 fetch 并自动携带 / 存储 Cookie，不跟随重定向。
 * 返回 { response, location }，location 为 Location 头（可能 null）。
 */
async function _fetch(url, options = {}, cookieJar) {
  const cookie = cookieJar.getCookieString(url)
  const res = await fetch(url, {
    redirect: 'manual',
    ...options,
    headers: {
      ...options.headers,
      ...(cookie ? { Cookie: cookie } : {}),
    },
  })
  cookieJar.setFromResponse(url, res)
  const location = res.headers.get('location')
  return { response: res, location }
}

/**
 * 跟随一组重定向链，用于需要完整跟踪所有中间 Set-Cookie 的场景。
 * 返回最终的非重定向（或超过 maxRedirects）的 response。
 */
async function _followAll(startUrl, options, cookieJar, maxRedirects = 5) {
  let url = startUrl
  for (let i = 0; i < maxRedirects; i++) {
    const { response, location } = await _fetch(url, options, cookieJar)
    if (!location) return response
    url = new URL(location, url).toString()
  }
  throw new Error(`[easycheck] 重定向链超过 ${maxRedirects} 步：${startUrl}`)
}

// ─── 主要流程 ───────────────────────────────────────────

/**
 * 通过 mobile + password 获取 easycheck 完整跳转 URL。
 *
 * @param {string} mobile  - 手机号
 * @param {string} password - 密码
 * @param {object} [opts]   - 可选配置
 * @param {boolean} [opts.verbose=false] - 是否打印调试日志
 * @returns {Promise<string>} 最终可以跳转的 easycheck URL
 */
export async function getEasycheckUrl(mobile, password, opts = {}) {
  const verbose = opts.verbose === true
  const log = verbose ? (...args) => console.log('[easycheck]', ...args) : () => {}
  const jar = new CookieJar()

  // ═══════════════════════════════════════════════════════
  // 阶段一：登录获取 Session Cookie (X-heimdall)
  // ═══════════════════════════════════════════════════════

  // ① 触发 OAuth 登录
  log('① GET /api/auth/jwt/zytlogin')
  let { response: r1, location: l1 } = await _fetch(
    `${BASE_URL}/api/auth/jwt/zytlogin`,
    null,
    jar,
  )
  if (!l1) throw new Error(`步骤①失败：未收到重定向 (HTTP ${r1.status})`)
  log('   → Location:', l1)

  // 从步骤①的 Location 中提取参数
  const authUrl1 = new URL(l1)
  const clientId    = authUrl1.searchParams.get('client_id')
  const redirectUrl = authUrl1.searchParams.get('redirect_uri') || `${BASE_URL}/api/auth/jwt/zyttoken`
  if (!clientId) throw new Error('步骤①：Location 中缺少 client_id')

  // ② 跟随 302 → OAuth 授权页
  log('② GET authorize')
  let { response: r2, location: l2 } = await _fetch(l1, null, jar)
  if (!l2) throw new Error(`步骤②失败：未收到重定向 (HTTP ${r2.status})`)
  log('   → Location:', l2)

  // 从步骤②的 Location（weblogin 页面）中提取参数
  const loginUrl   = new URL(l2)
  const state      = loginUrl.searchParams.get('state')
  const scopes     = loginUrl.searchParams.get('scopes') || 'r-staff'
  const oauthCode  = loginUrl.searchParams.get('oauth_code') || 'null'
  if (!state) throw new Error('步骤②：Location 中缺少 state')

  // ③ 账号密码登录
  log('③ POST /heimdall/api/oauth/authorize')
  const loginBody = {
    clientId,
    redirectUrl,
    scopes,
    state,
    oauthCode,
    mobile,
    password,
  }
  const { response: r3, location: l3 } = await _fetch(
    `${GW_URL}/heimdall/api/oauth/authorize`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginBody),
    },
    jar,
  )
  log('   → status:', r3.status)

  // 提取 auth_code
  let authCode = null
  // 方式 A：通过重定向 Location 获取 (302 + ?code=xxx)
  if (l3) {
    const codeParam = new URL(l3, GW_URL).searchParams.get('code')
    if (codeParam) authCode = codeParam
  }
  // 方式 B：JSON 体返回
  if (!authCode) {
    const contentType = r3.headers.get('content-type') || ''
    if (contentType.includes('json')) {
      const data = await r3.json()
      authCode = data.auth_code || data.code || null
    }
  }
  if (!authCode) {
    const text = await r3.text().catch(() => '(empty)')
    throw new Error(`步骤③失败：无法获取 auth_code\n状态: ${r3.status}\n响应: ${text.slice(0, 300)}`)
  }
  log('   → auth_code 已获取')

  // ④ 用 auth_code 换取票根 token，建立 X-heimdall 会话 Cookie
  log('④ GET /api/auth/jwt/zyttoken')
  const tokenUrl = `${BASE_URL}/api/auth/jwt/zyttoken?code=${encodeURIComponent(authCode)}&state=${encodeURIComponent(state)}`

  // 这儿必须完整跟随重定向链，中间会设置 X-heimdall Cookie
  const r4 = await _followAll(tokenUrl, null, jar)
  log('   → final status:', r4.status)

  // 验证 X-heimdall Cookie 已建立
  const heimdallCookie = jar.getCookieString(`${GW_URL}/heimdall/api/lebang/oauth/app/authorize`)
  if (!heimdallCookie) {
    log('   ⚠ 未检测到 X-heimdall Cookie，可能登录失败')
  } else {
    log('   ✅ X-heimdall Cookie 已建立')
  }

  // ═══════════════════════════════════════════════════════
  // 阶段二：利用 Session Cookie 免登录跳转 easycheck
  // ═══════════════════════════════════════════════════════

  // ⑤ 访问 easycheck 入口
  log('⑤ GET /api/easycheck/web/index')
  let { response: r5, location: l5 } = await _fetch(
    `${RM_URL}/api/easycheck/web/index?wkwebview=true&rurl=${encodeURIComponent(RURL)}`,
    null,
    jar,
  )
  if (!l5) throw new Error(`步骤⑤失败：未收到重定向 (HTTP ${r5.status})`)
  log('   → Location:', l5)

  // ⑥ 携带 X-heimdall Cookie 自动授权（auto_login=y）
  log('⑥ GET authorize (auto_login=y)')
  let { response: r6, location: l6 } = await _fetch(l5, null, jar)
  if (!l6) throw new Error(`步骤⑥失败：未收到重定向 (HTTP ${r6.status})`)
  log('   → Location:', l6)

  // ⑦ 换取 easycheck access_token（最终结果）
  log('⑦ GET /api/easycheck/web/oauth')
  let { response: r7, location: l7 } = await _fetch(l6, null, jar)

  // 如果这儿还有重定向，继续跟随直到拿到最终 URL
  let finalUrl = l7
  let lastResponse = r7
  while (finalUrl) {
    log('   → redirect to:', finalUrl)
    const { response: r, location: l } = await _fetch(finalUrl, null, jar)
    lastResponse = r
    if (!l) break
    finalUrl = l
  }

  if (finalUrl) {
    log('✅ 最终 easycheck URL:', finalUrl)
    return finalUrl
  }

  // 如果最终没有拿到 Location，尝试从 Cookie 构建
  log('   ⚠ 未找到最终 Location，检查 Cookie...')
  const akCookie = jar.getCookieString(`${RM_URL}/easycheck/`)
  if (akCookie) {
    const match = akCookie.match(/access_token_easycheck=([^;]+)/)
    if (match) {
      return `${RM_URL}/easycheck/#${RURL}?accessToken=${match[1]}`
    }
  }

  throw new Error('步骤⑦失败：无法获取 easycheck 最终 URL')
}

/**
 * getEasycheckUrl 的别名 / 便捷名称
 */
export { getEasycheckUrl as easycheckAuth }
