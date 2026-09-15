import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(scriptDir, '..')

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'))
}

function fail(message) {
  console.error(`[release:validate] ${message}`)
  process.exitCode = 1
}

const pkg = readJson('package.json')
const tauriConfig = readJson('src-tauri/tauri.conf.json')
const manifest = readJson('updates/latest.json')
const cargoToml = fs.readFileSync(path.join(rootDir, 'src-tauri/Cargo.toml'), 'utf8')
const cargoVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1]
const expectedVersion = pkg.version
const platform = manifest.platforms?.['windows-x86_64']

if (tauriConfig.version !== expectedVersion) {
  fail(`tauri.conf.json 版本 ${tauriConfig.version} 与 package.json ${expectedVersion} 不一致`)
}

if (cargoVersion !== expectedVersion) {
  fail(`Cargo.toml 版本 ${cargoVersion || '缺失'} 与 package.json ${expectedVersion} 不一致`)
}

if (manifest.version !== expectedVersion) {
  fail(`latest.json 版本 ${manifest.version} 与 package.json ${expectedVersion} 不一致`)
}

if (!platform?.url || !platform?.signature) {
  fail('latest.json 缺少 windows-x86_64 的 url 或 signature')
} else {
  const expectedFileName = `lulu_${expectedVersion}_x64-setup.exe`
  let urlFileName = ''

  try {
    urlFileName = path.posix.basename(new URL(platform.url).pathname)
  } catch {
    fail(`更新地址不是有效 URL：${platform.url}`)
  }

  if (urlFileName && urlFileName !== expectedFileName) {
    fail(`更新地址指向 ${urlFileName}，当前版本应使用 ${expectedFileName}`)
  }

  try {
    const decodedSignature = Buffer.from(platform.signature, 'base64').toString('utf8')
    if (!decodedSignature.includes(`file:${expectedFileName}`)) {
      const signedFile = decodedSignature.match(/file:([^\r\n]+)/)?.[1] || '未知文件'
      fail(`数字签名属于 ${signedFile}，当前版本应签名 ${expectedFileName}`)
    }
  } catch (error) {
    fail(`数字签名无法解析：${error.message}`)
  }

  const localSignaturePath = path.join(
    rootDir,
    'src-tauri',
    'target',
    'release',
    'bundle',
    'nsis',
    `${expectedFileName}.sig`
  )

  if (fs.existsSync(localSignaturePath)) {
    const localSignature = fs.readFileSync(localSignaturePath, 'utf8').trim()
    if (localSignature !== platform.signature.trim()) {
      fail(`latest.json 的数字签名与本地 ${path.basename(localSignaturePath)} 不一致`)
    }
  }
}

if (!process.exitCode) {
  console.log(`[release:validate] v${expectedVersion} 更新清单校验通过`)
}
