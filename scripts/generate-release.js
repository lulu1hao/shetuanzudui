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

console.log('====================================================')
console.log(`🚀 正在为版本 v${version} 生成线上 latest.json 配置模板`)
console.log('====================================================\n')

const template = {
  version: version,
  notes: "1. 修复已知问题；\n2. 优化系统性能与使用体验；\n3. 新增在线自动更新功能。",
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature: "【请在此处粘贴 src-tauri/target/release/bundle/nsis/*.nsis.zip.sig 文件的内容】",
      url: `https://your-domain.com/updates/lulu_${version}_x64-setup.nsis.zip`
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
console.log('2. 打包完成后，在 src-tauri/target/release/bundle/nsis/ 下找到生成的 .nsis.zip 和 .sig 文件')
console.log('3. 将 .sig 文件的内容复制填入 latest.template.json 的 signature 字段，并将 .zip 和 .json 上传到服务器/GitHub Releases 即可！\n')
