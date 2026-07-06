/**
 * 简易 Cookie Jar — 在 Node.js fetch 中手动管理 Cookie
 *
 * Node 18 内置 fetch 不自动管理 Cookie，需要手动实现。
 * 本模块只覆盖本流程需要用到的 domain/path 匹配逻辑。
 */

export class CookieJar {
  constructor() {
    /** @type {Map<string, {name:string, value:string, domain:string, path:string, httpOnly:boolean}>} */
    this._store = new Map()
  }

  /**
   * 从响应头中提取 Set-Cookie 并存入 jar
   * @param {string} requestUrl - 请求的完整 URL（用于提取 domain）
   * @param {Response} response
   */
  setFromResponse(requestUrl, response) {
    const headers = response.headers
    const urlObj = new URL(requestUrl)

    // Node 20+ 有 getSetCookie()，Node 18 用 fallback
    const rawCookies = typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : this._legacyGetSetCookie(headers)

    for (const raw of rawCookies) {
      const parsed = this._parse(raw, urlObj.hostname)
      if (parsed) {
        const key = `${parsed.name}@${parsed.domain}`
        this._store.set(key, parsed)
      }
    }
  }

  /**
   * 获取发往指定 URL 时应携带的 Cookie 字符串
   * @param {string} url
   * @returns {string} "name1=value1; name2=value2"
   */
  getCookieString(url) {
    const urlObj = new URL(url)
    const parts = []

    for (const [key, cookie] of this._store) {
      // domain 匹配：目标 hostname 以 cookie.domain 结尾
      if (!urlObj.hostname.endsWith(cookie.domain) &&
          cookie.domain !== urlObj.hostname) continue
      // path 匹配：目标 pathname 以 cookie.path 开头
      if (!urlObj.pathname.startsWith(cookie.path)) continue
      parts.push(`${cookie.name}=${cookie.value}`)
    }

    return parts.join('; ')
  }

  /** 清空所有 Cookie */
  clear() {
    this._store.clear()
  }

  // ─── 以下为内部方法 ──────────────────────────────────────

  /**
   * Node 18 fallback：从 Headers 中提取所有 Set-Cookie 原始字符串。
   * Node 18 将多个 Set-Cookie 合并为一个逗号分隔字符串，
   * 我们简单按 ", " 拆分（本流程的 cookie 值不含 ", "）。
   */
  _legacyGetSetCookie(headers) {
    const raw = headers.get('set-cookie')
    if (!raw) return []
    // 按 ", " 拆分，但跳过 Date 格式中的 ", "
    // "Expires=Thu, 01 Jan 1970" -> 这里的 ", " 不应拆分
    const result = []
    let i = 0
    let buf = ''
    while (i < raw.length) {
      // 逗号可能出现在 Expires 值中，格式 "Wdy, DD Mon YYYY"
      if (raw[i] === ',' && !this._isCommaInExpires(raw, i, buf)) {
        result.push(buf.trim())
        buf = ''
        i++
        // 跳过后面的空格
        while (i < raw.length && raw[i] === ' ') i++
        continue
      }
      buf += raw[i]
      i++
    }
    if (buf.trim()) result.push(buf.trim())
    return result
  }

  /** 判断当前位置的逗号是否在 Expires 日期值内部 */
  _isCommaInExpires(raw, idx, buf) {
    // 如果逗号前面最近的一段包含 "Expires="，说明是日期中的逗号
    const before = (buf + raw.slice(0, idx)).toLowerCase()
    // 找最近的一个 "expires="
    const expiresIdx = before.lastIndexOf('expires=')
    if (expiresIdx === -1) return false
    // 看从这个 expires= 到当前逗号之间是否有分号（属性分隔符）
    const afterExpires = before.slice(expiresIdx)
    return !afterExpires.includes(';')
  }

  /**
   * 解析单条 Set-Cookie 字符串
   * Set-Cookie: name=value; Path=/; Domain=.example.com; HttpOnly
   */
  _parse(raw, defaultDomain) {
    const parts = raw.split(';').map(s => s.trim())
    const first = parts[0]
    const eqIdx = first.indexOf('=')
    if (eqIdx === -1) return null

    const name = first.slice(0, eqIdx).trim()
    const value = first.slice(eqIdx + 1).trim()
    if (!name) return null

    let domain = defaultDomain
    let path = '/'
    let httpOnly = false

    for (let i = 1; i < parts.length; i++) {
      const seg = parts[i]
      const segEq = seg.indexOf('=')
      const key = segEq === -1 ? seg.toLowerCase() : seg.slice(0, segEq).trim().toLowerCase()
      const val = segEq === -1 ? '' : seg.slice(segEq + 1).trim()

      if (key === 'domain') domain = val.startsWith('.') ? val : val
      else if (key === 'path') path = val || '/'
      else if (key === 'httponly' || key === 'httpOnly') httpOnly = true
    }

    return { name, value, domain, path, httpOnly }
  }
}
