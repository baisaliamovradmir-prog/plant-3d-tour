// Сборка версии для показа: 3D-тур (frontend/) + прототип двойника (prototype/, ветка frontend)
// в одной папке, которая запускается двойным щелчком по ZAPUSK.bat — без Node, Python и Docker.
//
//   node demo/build-demo.mjs      → release/plant-tour-demo/  (и архив release/plant-tour-demo.zip)
//
// Нужны обе ветки в одном дереве (после слияния 3d и frontend) и установленные зависимости фронтенда.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'release', 'plant-tour-demo')
const site = join(out, 'site')

const run = (cmd, args, cwd) => {
  // одной строкой через оболочку: на Windows npm — это npm.cmd
  const r = spawnSync([cmd, ...args].join(' '), { cwd, stdio: 'inherit', shell: true })
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} завершился с кодом ${r.status}`)
}

if (!existsSync(join(root, 'prototype', 'index.html'))) {
  console.error('Нет папки prototype/ — сначала слейте ветку frontend (прототип двойника) с веткой 3d.')
  process.exit(1)
}

console.log('1/3 сборка 3D-тура…')
if (!existsSync(join(root, 'frontend', 'node_modules'))) run('npm', ['install', '--no-audit', '--no-fund'], join(root, 'frontend'))
run('npm', ['run', 'build'], join(root, 'frontend'))

console.log('2/3 сборка папки показа…')
rmSync(out, { recursive: true, force: true })
mkdirSync(site, { recursive: true })
cpSync(join(root, 'frontend', 'dist'), site, { recursive: true })
cpSync(join(root, 'prototype'), join(site, 'twin'), { recursive: true })
for (const f of ['serve.ps1', 'ZAPUSK.bat', 'README.txt']) cpSync(join(root, 'demo', f), join(out, f))
writeFileSync(join(out, 'site', 'build.txt'), `собрано ${new Date().toISOString()}\n`)

console.log('3/3 архив…')
const zip = join(root, 'release', 'plant-tour-demo.zip')
rmSync(zip, { force: true })
// tar из Windows 10+ и macOS умеет zip (-a / --format zip)
const tar = spawnSync('tar', process.platform === 'win32' ? ['-a', '-c', '-f', zip, 'plant-tour-demo'] : ['--format', 'zip', '-c', '-f', zip, 'plant-tour-demo'], {
  cwd: join(root, 'release'),
  stdio: 'inherit',
})
console.log(tar.status === 0 ? `готово: ${zip}` : `папка готова: ${out} (архив не создан — заархивируйте вручную)`)
