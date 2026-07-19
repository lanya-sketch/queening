// 플레이스홀더 착장 이미지 생성기.
// 진짜 그림이 준비되면 같은 파일명으로 덮어쓰기만 하면 된다.
// thumb 300x400(반신) / full 720x1280(전신) — 매니페스트의 권장 규격과 같다.
//
//   npm run gen:outfits
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(REPO, 'public', 'assets', 'outfits')
mkdirSync(OUT, { recursive: true })

const SKIN = '#e8c9a8'
const HAIR = '#2b2118'

const OUTFITS = [
  { id: 'casual', name: '사복', bg1: '#1e293b', bg2: '#0f172a', robe: '#64748b', accent: '#cbd5e1', trim: '#94a3b8' },
  { id: 'office', name: '정무복', bg1: '#172554', bg2: '#0b1120', robe: '#1e40af', accent: '#93c5fd', trim: '#3b82f6' },
  { id: 'ceremonial', name: '대례복', bg1: '#450a0a', bg2: '#1c0505', robe: '#991b1b', accent: '#fcd34d', trim: '#f59e0b' },
  { id: 'military', name: '기사 갑주', bg1: '#14532d', bg2: '#052e16', robe: '#166534', accent: '#bef264', trim: '#4d7c0f' },
]

// 반신 초상 300x400 — 얼굴 위주. 이름은 UI 가 표시하므로 새기지 않는다.
const thumb = (o) => `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400" role="img" aria-label="${o.name} 초상">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${o.bg1}"/><stop offset="1" stop-color="${o.bg2}"/>
    </linearGradient>
  </defs>
  <rect width="300" height="400" fill="url(#bg)"/>
  <circle cx="150" cy="150" r="118" fill="${o.robe}" opacity="0.12"/>
  <rect x="132" y="158" width="36" height="56" rx="16" fill="${SKIN}"/>
  <ellipse cx="150" cy="128" rx="52" ry="60" fill="${SKIN}"/>
  <path d="M98 126 C98 66 202 66 202 126 C202 98 180 86 150 86 C120 86 98 98 98 126 Z" fill="${HAIR}"/>
  <circle cx="130" cy="134" r="4.5" fill="${HAIR}"/><circle cx="170" cy="134" r="4.5" fill="${HAIR}"/>
  <path d="M150 202 C88 208 58 252 50 400 L250 400 C242 252 212 208 150 202 Z" fill="${o.robe}"/>
  <path d="M150 204 L112 400 L150 400 Z" fill="${o.trim}"/>
  <path d="M150 204 L188 400 L150 400 Z" fill="${o.accent}" opacity="0.55"/>
</svg>
`

// 전신 720x1280 — 착장이 잘 보이는 세로 전신.
const full = (o) => `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280" role="img" aria-label="${o.name}을 입은 왕 전신">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${o.bg1}"/><stop offset="1" stop-color="${o.bg2}"/>
    </linearGradient>
  </defs>
  <rect width="720" height="1280" fill="url(#bg)"/>
  <ellipse cx="360" cy="1195" rx="230" ry="34" fill="#020617" opacity="0.45"/>
  <rect x="336" y="298" width="48" height="62" rx="20" fill="${SKIN}"/>
  <ellipse cx="360" cy="250" rx="60" ry="70" fill="${SKIN}"/>
  <path d="M300 248 C300 178 420 178 420 248 C420 216 396 202 360 202 C324 202 300 216 300 248 Z" fill="${HAIR}"/>
  <circle cx="337" cy="258" r="5.5" fill="${HAIR}"/><circle cx="383" cy="258" r="5.5" fill="${HAIR}"/>
  <path d="M248 392 C204 424 190 522 186 664 L246 672 C244 542 250 462 268 420 Z" fill="${o.robe}"/>
  <path d="M472 392 C516 424 530 522 534 664 L474 672 C476 542 470 462 452 420 Z" fill="${o.robe}"/>
  <circle cx="216" cy="700" r="24" fill="${SKIN}"/>
  <circle cx="504" cy="700" r="24" fill="${SKIN}"/>
  <path d="M360 338 C282 344 250 402 240 560 L224 1178 L496 1178 L480 560 C470 402 438 344 360 338 Z" fill="${o.robe}"/>
  <path d="M360 344 L318 566 L360 606 L402 566 Z" fill="${o.accent}" opacity="0.9"/>
  <rect x="234" y="612" width="252" height="46" rx="6" fill="${o.trim}"/>
  <rect x="234" y="612" width="252" height="10" rx="5" fill="${o.accent}" opacity="0.6"/>
  <rect x="224" y="1146" width="272" height="32" fill="${o.trim}"/>
  <path d="M352 680 L368 680 L364 1140 L356 1140 Z" fill="${o.accent}" opacity="0.35"/>
  <rect x="0" y="1208" width="720" height="72" fill="#020617" opacity="0.72"/>
  <text x="360" y="1258" text-anchor="middle" font-family="system-ui, sans-serif" font-size="40" font-weight="600" fill="#e2e8f0">${o.name}</text>
</svg>
`

for (const o of OUTFITS) {
  writeFileSync(join(OUT, `${o.id}-thumb.svg`), thumb(o), 'utf8')
  writeFileSync(join(OUT, `${o.id}-full.svg`), full(o), 'utf8')
  console.log('생성:', `${o.id}-thumb.svg`, `${o.id}-full.svg`)
}
console.log('출력 경로:', OUT)
