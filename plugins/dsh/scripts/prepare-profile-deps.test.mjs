import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  assertPackageName,
  fileSpecPath,
  prepareProfileDeps,
  tarballFilename,
} from './prepare-profile-deps.mjs'

test('fileSpecPath 解析 file: 与 link:，忽略 registry spec', () => {
  const profile = '/profile'
  assert.equal(fileSpecPath('file:/abs/a.tgz', profile), '/abs/a.tgz')
  assert.equal(fileSpecPath('link:/abs/plugin', profile), '/abs/plugin')
  assert.equal(fileSpecPath('file:///abs/a.tgz', profile), '/abs/a.tgz')
  assert.equal(fileSpecPath('file:./rel.tgz', profile), path.resolve(profile, 'rel.tgz'))
  assert.equal(fileSpecPath('^1.2.3', profile), null)
  assert.equal(fileSpecPath('workspace:*', profile), null)
})

test('tarballFilename 去掉 scope', () => {
  assert.equal(tarballFilename('@oddity/dsh-agent-bot', '0.0.1'), 'oddity-dsh-agent-bot-0.0.1.tgz')
  assert.equal(tarballFilename('dsh-cron-loop', '0.0.3'), 'dsh-cron-loop-0.0.3.tgz')
})

test('assertPackageName 拒绝路径穿越', () => {
  assert.doesNotThrow(() => assertPackageName('@oddity/dsh-agent-bot'))
  assert.throws(() => assertPackageName('../etc'), /非法依赖名/)
  assert.throws(() => assertPackageName('@oddity/../../etc'), /非法依赖名/)
})

test('prepareProfileDeps 丢掉读不到的待替换依赖，并冻结其它已安装副本', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dsh-prepare-'))
  try {
    const profile = path.join(root, 'profile')
    const gone = path.join(root, 'gone', 'old.tgz')
    const siblingGone = path.join(root, 'gone', 'sibling.tgz')
    const readable = path.join(root, 'ok.tgz')
    await mkdir(path.join(profile, 'node_modules', 'dsh-cron-loop'), { recursive: true })
    await writeFile(readable, 'ok')
    await writeFile(
      path.join(profile, 'node_modules', 'dsh-cron-loop', 'package.json'),
      JSON.stringify({ name: 'dsh-cron-loop', version: '0.0.3' }),
    )
    await writeFile(
      path.join(profile, 'package.json'),
      `${JSON.stringify({
        name: 'dsh-profile-web',
        dependencies: {
          '@oddity/dsh-agent-bot': `file:${gone}`,
          'dsh-cron-loop': `file:${siblingGone}`,
          'dsh-remote-access': `file:${readable}`,
          zod: '^4.0.0',
        },
      }, null, 2)}\n`,
    )
    /** @type {string[]} */
    const packed = []
    const result = prepareProfileDeps({
      profileDir: profile,
      replaceName: '@oddity/dsh-agent-bot',
      pack(packageDir, destDir, manifest) {
        packed.push(`${packageDir}:${manifest.name}@${manifest.version}:${destDir}`)
        const tarball = path.join(destDir, tarballFilename(manifest.name, manifest.version))
        mkdirSync(destDir, { recursive: true })
        writeFileSync(tarball, 'frozen')
        return tarball
      },
    })
    const pkg = JSON.parse(await readFile(path.join(profile, 'package.json'), 'utf8'))
    assert.equal(pkg.dependencies['@oddity/dsh-agent-bot'], undefined)
    assert.equal(
      pkg.dependencies['dsh-cron-loop'],
      `file:${path.join(profile, '.kept-tarballs', 'dsh-cron-loop-0.0.3.tgz')}`,
    )
    assert.equal(pkg.dependencies['dsh-remote-access'], `file:${readable}`)
    assert.equal(pkg.dependencies.zod, '^4.0.0')
    assert.deepEqual(result.dropped, [{ name: '@oddity/dsh-agent-bot', spec: `file:${gone}` }])
    assert.equal(result.kept.length, 1)
    assert.equal(result.kept[0].name, 'dsh-cron-loop')
    assert.equal(packed.length, 1)

    packed.length = 0
    const again = prepareProfileDeps({
      profileDir: profile,
      replaceName: '@oddity/dsh-agent-bot',
      pack() {
        packed.push('again')
        return '/unused.tgz'
      },
    })
    assert.deepEqual(again, { dropped: [], kept: [] })
    assert.deepEqual(packed, [])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('prepareProfileDeps 在其它丢失的 tarball 没有安装副本时失败，且不改 package.json', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dsh-prepare-'))
  try {
    const profile = path.join(root, 'profile')
    await mkdir(profile, { recursive: true })
    const original = {
      name: 'dsh-profile-web',
      dependencies: {
        'dsh-cron-loop': 'file:/missing/dsh-cron-loop.tgz',
      },
    }
    await writeFile(path.join(profile, 'package.json'), `${JSON.stringify(original, null, 2)}\n`)
    assert.throws(
      () => prepareProfileDeps({
        profileDir: profile,
        replaceName: '@oddity/dsh-agent-bot',
        pack() {
          throw new Error('不应打包')
        },
      }),
      /dsh-cron-loop/,
    )
    const pkg = JSON.parse(await readFile(path.join(profile, 'package.json'), 'utf8'))
    assert.equal(pkg.dependencies['dsh-cron-loop'], 'file:/missing/dsh-cron-loop.tgz')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('可读的待替换依赖保持原 spec', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dsh-prepare-'))
  try {
    const profile = path.join(root, 'profile')
    const tarball = path.join(root, 'bot.tgz')
    await mkdir(profile, { recursive: true })
    await writeFile(tarball, 'ok')
    await writeFile(
      path.join(profile, 'package.json'),
      `${JSON.stringify({ dependencies: { '@oddity/dsh-agent-bot': `file:${tarball}` } }, null, 2)}\n`,
    )
    const result = prepareProfileDeps({
      profileDir: profile,
      replaceName: '@oddity/dsh-agent-bot',
      pack() {
        throw new Error('不应打包')
      },
    })
    assert.deepEqual(result, { dropped: [], kept: [] })
    const pkg = JSON.parse(await readFile(path.join(profile, 'package.json'), 'utf8'))
    assert.equal(pkg.dependencies['@oddity/dsh-agent-bot'], `file:${tarball}`)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
