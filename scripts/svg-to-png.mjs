/**
 * SVG → PNG 转换脚本
 *
 * 用途：将 src/assets/icons/ 下的所有 SVG 转换为 PNG，输出到 src/static/images/
 *
 * 用法：
 *   node scripts/svg-to-png.mjs               # 默认输出 48px
 *   node scripts/svg-to-png.mjs --size=32      # 自定义尺寸
 *   node scripts/svg-to-png.mjs --color=red    # 全部覆盖为同一颜色
 *
 * 颜色说明：
 *   SVG 中 stroke="currentColor" 时，脚本会自动替换为合适颜色。
 *   白色图标（camera/image/moon/water）→ #ffffff
 *   其他图标                             → #8a8a9a（应用默认灰色）
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SVG_DIR = path.join(ROOT, 'src', 'assets', 'icons')
const PNG_DIR = path.join(ROOT, 'src', 'static', 'images')

// 默认输出尺寸：取 viewBox 宽高的 2 倍（兼顾 retina）
const DEFAULT_SCALE = 2

// 单独指定尺寸的图标（icon键名 → 输出像素）
const SIZE_OVERRIDES = {
  'location-pin': 32,
}

// 默认颜色（用在浅色背景上的图标）
const DEFAULT_COLOR = '#8a8a9a'

// 白色图标（用在深色/彩色背景上，如 tool-icon、upload-icon）
const WHITE_ICONS = new Set(['camera', 'image', 'moon', 'water'])

// 紫色图标（应用强调色，如 person）
const PURPLE_ICONS = new Set(['person'])

function readSvg(svgPath) {
  const key = path.basename(svgPath, '.svg')
  let content = fs.readFileSync(svgPath, 'utf-8')
  // 替换 currentColor 为实际颜色
  let color
  if (PURPLE_ICONS.has(key)) {
    color = '#7c5cfc'
  } else if (WHITE_ICONS.has(key)) {
    color = '#ffffff'
  } else {
    color = DEFAULT_COLOR
  }
  content = content.replace(/currentColor/g, color)
  return { key, content, color }
}

function getViewBox(content) {
  const match = content.match(/viewBox="(\d+)\s+(\d+)\s+(\d+)\s+(\d+)"/)
  if (!match) return { width: 24, height: 24 }
  return {
    width: parseInt(match[3], 10),
    height: parseInt(match[4], 10),
  }
}

async function main() {
  const sizeArg = process.argv.find(a => a.startsWith('--size='))
  const customSize = sizeArg ? parseInt(sizeArg.split('=')[1], 10) : null
  const colorArg = process.argv.find(a => a.startsWith('--color='))
  const overrideColor = colorArg ? colorArg.split('=')[1] : null

  if (overrideColor) {
    console.log(`🎨 强制所有图标颜色: ${overrideColor}`)
  }

  if (!fs.existsSync(SVG_DIR)) {
    console.error(`❌ SVG 源目录不存在: ${SVG_DIR}`)
    process.exit(1)
  }

  if (!fs.existsSync(PNG_DIR)) {
    fs.mkdirSync(PNG_DIR, { recursive: true })
  }

  const files = fs.readdirSync(SVG_DIR).filter(f => f.endsWith('.svg'))
  if (files.length === 0) {
    console.log('⚠️  没有找到 SVG 文件')
    return
  }

  console.log(`📦 SVG 源目录:  ${SVG_DIR}`)
  console.log(`📦 PNG 输出目录: ${PNG_DIR}`)
  console.log('')

  for (const file of files) {
    const svgPath = path.join(SVG_DIR, file)
    const pngName = file.replace(/\.svg$/, '.png')
    const pngPath = path.join(PNG_DIR, pngName)

    const { key, content, color } = readSvg(svgPath)
    const vb = getViewBox(content)
    const outSize = SIZE_OVERRIDES[key] || customSize || Math.max(vb.width, vb.height) * DEFAULT_SCALE

    const finalColor = overrideColor || color

    // 如果有强制颜色覆盖，再次替换
    const svgData = overrideColor
      ? content.replace(/(?:stroke|fill)="[^"]*"/g, `stroke="${overrideColor}"`)
      : content

    await sharp(Buffer.from(svgData, 'utf-8'))
      .resize(outSize, undefined, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(pngPath)

    const srcStat = fs.statSync(svgPath)
    const dstStat = fs.statSync(pngPath)
    console.log(`  ✓ ${file}  →  ${pngName}  (${finalColor}, ${outSize}px, ${(dstStat.size / 1024).toFixed(1)} KB)`)
  }

  console.log('')
  console.log(`✅ 完成，共转换 ${files.length} 个图标`)
}

main().catch(err => {
  console.error('❌ 转换出错:', err)
  process.exit(1)
})
