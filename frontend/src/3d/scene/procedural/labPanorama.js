// Панорама 360° лаборатории ОТК, нарисованная кодом на canvas (равнопромежуточная проекция 2:1).
// Нужна, чтобы показать режим панорамы без скачивания файлов; на 2 этапе заменяется фото заказчика.
import * as THREE from 'three'

// yaw/pitch (градусы) → пиксели текстуры. Соответствует yawPitchToVec3 при сфере с scale.x = −1.
function px(yaw, pitch, W, H) {
  const u = ((((yaw - 90) % 360) + 360) % 360) / 360
  return [u * W, ((90 - pitch) / 180) * H]
}

// Рисует прямоугольник между углами yaw1..yaw2 и pitch1..pitch2 (с переносом через шов).
function rect(ctx, W, H, yaw1, yaw2, pitchTop, pitchBottom, fill) {
  const [x1, y1] = px(yaw1, pitchTop, W, H)
  let [x2, y2] = px(yaw2, pitchBottom, W, H)
  ctx.fillStyle = fill
  if (x2 < x1) {
    ctx.fillRect(x1, y1, W - x1, y2 - y1)
    ctx.fillRect(0, y1, x2, y2 - y1)
  } else ctx.fillRect(x1, y1, x2 - x1, y2 - y1)
}

export function makeLabPanoramaTexture(size = 2048) {
  const W = size
  const H = size / 2
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // потолок, стены, пол
  let g = ctx.createLinearGradient(0, 0, 0, H * 0.32)
  g.addColorStop(0, '#f4f6f8')
  g.addColorStop(1, '#e3e8ee')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H * 0.32)
  g = ctx.createLinearGradient(0, H * 0.32, 0, H * 0.56)
  g.addColorStop(0, '#e9eef3')
  g.addColorStop(1, '#d9e0e7')
  ctx.fillStyle = g
  ctx.fillRect(0, H * 0.32, W, H * 0.24)
  g = ctx.createLinearGradient(0, H * 0.56, 0, H)
  g.addColorStop(0, '#b9c4cf')
  g.addColorStop(1, '#8e9aa6')
  ctx.fillStyle = g
  ctx.fillRect(0, H * 0.56, W, H * 0.44)

  // светильники на потолке
  for (let yaw = 0; yaw < 360; yaw += 45) rect(ctx, W, H, yaw - 8, yaw + 8, 62, 58, '#ffffff')
  // плитка пола
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  for (let p = -12; p > -90; p -= 8) {
    const [, y] = px(0, p, W, H)
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }
  // окна
  for (const yaw of [150, 185, 220]) {
    rect(ctx, W, H, yaw - 12, yaw + 12, 28, 6, '#9cc3e6')
    rect(ctx, W, H, yaw - 0.6, yaw + 0.6, 28, 6, '#e3e8ee')
  }
  // дверь
  rect(ctx, W, H, 268, 288, 22, -16, '#7d8fa3')
  rect(ctx, W, H, 284, 286, 2, -1, '#d0d6dc')

  // лабораторные столы (столешница + тумбы) по периметру
  const benches = [[-40, 70], [100, 140], [300, 350]]
  for (const [a, b] of benches) {
    rect(ctx, W, H, a, b, -6, -9, '#2f3b48')
    rect(ctx, W, H, a, b, -9, -22, '#cfd6dd')
    for (let y = a + 4; y < b; y += 12) rect(ctx, W, H, y, y + 0.7, -10, -21, '#9aa7b6')
  }
  // вытяжной шкаф
  rect(ctx, W, H, 105, 125, 24, -6, '#dde3e8')
  rect(ctx, W, H, 107, 123, 18, -2, '#a9cbe8')

  // приборы: вискозиметр, анализатор вспышки, спектрометр
  const devices = [
    [-30, -18, 12, '#3b6ea8'],
    [-12, -6, 6, '#e8ecef'],
    [44, 60, 10, '#2f9e44'],
    [306, 322, 9, '#3b6ea8'],
    [330, 342, 5, '#e8ecef'],
  ]
  for (const [a, b, top, c] of devices) {
    rect(ctx, W, H, a, b, top, -6, c)
    rect(ctx, W, H, a + 2, b - 2, top - 2, top - 5, '#1f3550')
  }

  // штатив с очередью проб (точка «Отбор проб», yaw ≈ 20)
  rect(ctx, W, H, 6, 36, -2, -6, '#5d6b7a')
  for (let i = 0; i < 12; i++) {
    const yaw = 8 + i * 2.4
    rect(ctx, W, H, yaw, yaw + 1.4, 4, -2, i < 9 ? '#c8962e' : '#e8d38a')
    rect(ctx, W, H, yaw, yaw + 1.4, 5, 4, '#2f3b48')
  }
  // табло очереди
  rect(ctx, W, H, 10, 32, 24, 14, '#1f3550')
  ctx.fillStyle = '#ffd43b'
  ctx.font = `bold ${Math.round(W / 70)}px sans-serif`
  ctx.textAlign = 'center'
  const [tx, ty] = px(21, 18, W, H)
  ctx.fillText('В ОЧЕРЕДИ: 9 ПРОБ', tx, ty)

  // лаборант
  rect(ctx, W, H, 72, 80, 8, -24, '#f4f6f8')
  rect(ctx, W, H, 73.5, 78.5, 13, 8, '#e2b48c')

  // плакат по безопасности
  rect(ctx, W, H, 236, 252, 22, 6, '#2f9e44')
  rect(ctx, W, H, 238, 250, 20, 8, '#e9f5ec')

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}
