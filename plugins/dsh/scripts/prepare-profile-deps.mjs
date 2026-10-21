#!/usr/bin/env node
// profile 里的 file:/link: 依赖指向的 tarball 丢了时，pnpm remove/add 会直接 ENOENT。
// release 会删掉插件 .dist，仓库换目录后旧绝对路径也会失效。
// 本脚本在 dsh plugin 之前改 package.json：
//   - 即将替换的包：删掉读不到的 spec，随后的 add 写入新路径
//   - 其它包：node_modules 里还有安装副本时，打包到 <profile>/.kept-tarballs/ 并改写 spec

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_NAME_RE = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i

/** @param {string} name */
export function assertPackageName(name) {
  if (!PACKAGE_NAME_RE.test(name)) throw new Error(`非法依赖名: ${name}`)
}

/**
 * npm/pnpm 打包文件名。scoped 包去掉 @，把 / 换成 -。
 * @param {string} name
 * @param {string} version
 */
export function tarballFilename(name, version) {
  const safe = name.startsWith('@') ? name.slice(1).replace('/', '-') : name
  return `${safe}-${version}.tgz`
}

/**
 * 从 file: / link: spec 取出文件系统路径。registry、workspace 等 spec 返回 null。
 * 相对路径相对 profile 目录解析。
 * @param {unknown} spec
 * @param {string} profileDir
 * @returns {string | null}
 */
export function fileSpecPath(spec, profileDir) {
  if (typeof spec !== 'string') return null
  const match = /^(file:|link:)(.*)$/.exec(spec)
  if (!match) return null
  let raw = match[2]
  if (match[1] === 'file:' && raw.startsWith('//')) {
    const hostAndPath = raw.slice(2)
    const slash = hostAndPath.indexOf('/')
    raw = slash === -1 ? '' : hostAndPath.slice(slash)
  }
  if (!raw) return ''
  if (raw.startsWith('/') || /^[A-Za-z]:[\\/]/.test(raw)) return raw
  return path.resolve(profileDir, raw)
}

/**
 * @param {string} packageDir
 * @param {string} destDir
 * @param {{ name: string, version: string }} manifest
 * @returns {string} 生成的 tarball 绝对路径
 */
export function packInstalled(packageDir, destDir, manifest) {
  mkdirSync(destDir, { recursive: true })
  const result = spawnSync('pnpm', ['pack', '--pack-destination', destDir], {
    cwd: packageDir,
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim()
    throw new Error(`pnpm pack 失败 (${manifest.name})${detail ? `: ${detail}` : ''}`)
  }
  const tarball = path.join(destDir, tarballFilename(manifest.name, manifest.version))
  if (!existsSync(tarball)) throw new Error(`pnpm pack 未生成 ${tarball}`)
  return tarball
}

/**
 * @param {{
 *   profileDir: string,
 *   replaceName: string,
 *   pack?: (packageDir: string, destDir: string, manifest: { name: string, version: string }) => string,
 * }} opts
 * @returns {{ dropped: { name: string, spec: string }[], kept: { name: string, from: string, to: string }[] }}
 */
export function prepareProfileDeps({ profileDir, replaceName, pack = packInstalled }) {
  assertPackageName(replaceName)
  const pkgPath = path.join(profileDir, 'package.json')
  /** @type {{ dependencies?: Record<string, string> }} */
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  const deps = pkg.dependencies ?? {}
  /** @type {{ name: string, spec: string }[]} */
  const dropped = []
  /** @type {{ name: string, from: string, to: string }[]} */
  const kept = []
  let changed = false

  for (const [name, spec] of Object.entries(deps)) {
    const target = fileSpecPath(spec, profileDir)
    if (target == null || (target !== '' && existsSync(target))) continue
    assertPackageName(name)
    if (name === replaceName) {
      delete deps[name]
      dropped.push({ name, spec })
      changed = true
      continue
    }
    const installed = path.join(profileDir, 'node_modules', name)
    const installedPkgPath = path.join(installed, 'package.json')
    if (!existsSync(installedPkgPath)) {
      throw new Error(
        `${name} 的依赖指向不存在的路径（${spec}），并且 ${installed} 里没有已安装副本。pnpm 更新其它插件前会打开这条路径。请先重新安装 ${name}，或从 dependencies 中删除它。`,
      )
    }
    /** @type {{ name?: string, version?: string }} */
    const manifest = JSON.parse(readFileSync(installedPkgPath, 'utf8'))
    if (!manifest.name || !manifest.version) {
      throw new Error(`${installedPkgPath} 缺少 name 或 version，无法冻结 tarball`)
    }
    const tarball = pack(installed, path.join(profileDir, '.kept-tarballs'), {
      name: manifest.name,
      version: manifest.version,
    })
    if (!existsSync(tarball)) throw new Error(`冻结 tarball 不存在: ${tarball}`)
    const next = `file:${tarball}`
    deps[name] = next
    kept.push({ name, from: spec, to: next })
    changed = true
  }

  if (changed) writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
  return { dropped, kept }
}

/** @param {string[]} argv */
export function parseArgs(argv) {
  /** @type {{ profile: string, replace: string, help: boolean }} */
  const opts = { profile: '', replace: '', help: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') opts.help = true
    else if (arg === '--profile') {
      opts.profile = argv[i + 1] ?? ''
      i += 1
    } else if (arg === '--replace') {
      opts.replace = argv[i + 1] ?? ''
      i += 1
    } else {
      throw new Error(`未知参数: ${arg}`)
    }
  }
  return opts
}

function printUsage() {
  console.log(`用法: node scripts/prepare-profile-deps.mjs --profile <profile 目录> --replace <包名>

在 dsh plugin remove/add 之前调用。读不到的 file:/link: 依赖会被改写，避免 pnpm ENOENT。`)
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) {
    printUsage()
    return
  }
  if (!opts.profile || !opts.replace) {
    throw new Error('用法: node scripts/prepare-profile-deps.mjs --profile <目录> --replace <包名>')
  }
  const result = prepareProfileDeps({ profileDir: opts.profile, replaceName: opts.replace })
  for (const item of result.dropped) {
    console.error(`[run.sh] 旧依赖打不开，已从 profile 移除 ${item.name}（${item.spec}）`)
  }
  for (const item of result.kept) {
    console.error(`[run.sh] ${item.name} 的 tarball 已丢失，已用当前安装内容冻结到 ${item.to.slice('file:'.length)}`)
  }
}

const entry = process.argv[1]
if (entry && path.resolve(entry) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[run.sh] ${message}`)
    process.exit(1)
  }
}
