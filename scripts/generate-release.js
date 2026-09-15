/**
 * 发布辅助脚本 - 生成线上 latest.json 模板与说明
 * 使用方法: node scripts/generate-release.js
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const pkgPath = path.join(rootDir, 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
const version = pkg.version
const artifactName = `lulu_${version}_x64-setup.exe`
const signaturePath = path.join(
  rootDir,
  'src-tauri',
  'target',
  'release',
  'bundle',
  'nsis',
  `${artifactName}.sig`
)

if (!fs.existsSync(signaturePath)) {
  console.error(`❌ 未找到当前版本签名文件: ${signaturePath}`)
  console.error('请先设置 TAURI_SIGNING_PRIVATE_KEY_PATH 并执行 npm run tauri build。')
  process.exit(1)
}

const signature = fs.readFileSync(signaturePath, 'utf-8').trim()
const signedFile = Buffer.from(signature, 'base64')
  .toString('utf-8')
  .match(/file:([^\r\n]+)/)?.[1]

if (signedFile !== artifactName) {
  console.error(`❌ 签名属于 ${signedFile || '未知文件'}，当前版本安装包应为 ${artifactName}`)
  process.exit(1)
}

console.log('====================================================')
console.log(`🚀 正在为版本 v${version} 生成线上 latest.json 配置模板`)
console.log('====================================================\n')

const template = {
  version: version,
  notes: "1. 修复已知问题；\n2. 优化系统性能与使用体验；\n3. 新增在线自动更新功能。",
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature,
      url: `https://github.com/lulu1hao/shetuanzudui/releases/download/v${version}/${artifactName}`
    }
  }
}

const outputPath = path.join(rootDir, 'latest.template.json')
fs.writeFileSync(outputPath, JSON.stringify(template, null, 2), 'utf-8')

console.log(`✅ 模板已生成至: ${outputPath}`)
console.log('\n📝 发布 3 步走简易指引：')
console.log('1. 执行打包命令：')
console.log('   $env:TAURI_SIGNING_PRIVATE_KEY_PATH = "src-tauri/lulu.key"')
console.log('   npm run tauri build')
console.log(`2. 确认 GitHub Release 已上传 ${artifactName}`)
console.log('3. 修改 latest.template.json 的 notes 后复制为 updates/latest.json')
console.log('4. 执行 npm run release:validate，通过后再发布更新清单\n')
