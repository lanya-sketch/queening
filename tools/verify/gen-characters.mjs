// 연애 대상 플레이스홀더 초상 생성기 (M2b-3a).
// 실제 그림이 준비되면 같은 파일명으로 덮어쓰면 된다.
//
//   npm run gen:characters
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(REPO, 'public', 'assets', 'characters')
mkdirSync(OUT, { recursive: true })

const SKIN = '#e8c9a8'

const CHARACTERS = [
  { id: 'heir', label: '①', bg1: '#3b0764', bg2: '#1e1b4b', robe: '#6d28d9', hair: '#1f2937' },
  { id: 'loyalist', label: '②', bg1: '#0c4a6e', bg2: '#082f49', robe: '#0284c7', hair: '#78350f' },
  { id: 'prince', label: '③', bg1: '#7c2d12', bg2: '#431407', robe: '#c2410c', hair: '#292524' },
  { id: 'commander', label: '⑤', bg1: '#14532d', bg2: '#052e16', robe: '#15803d', hair: '#44403c' },
  { id: 'hero', label: '④', bg1: '#334155', bg2: '#0f172a', robe: '#64748b', hair: '#1c1917' },
]

const svg = (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400" role="img" aria-label="${c.id} 초상 (플레이스홀더)">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c.bg1}"/><stop offset="1" stop-color="${c.bg2}"/>
    </linearGradient>
  </defs>
  <rect width="300" height="400" fill="url(#bg)"/>
  <circle cx="150" cy="150" r="118" fill="${c.robe}" opacity="0.14"/>
  <rect x="132" y="158" width="36" height="56" rx="16" fill="${SKIN}"/>
  <ellipse cx="150" cy="128" rx="52" ry="60" fill="${SKIN}"/>
  <path d="M98 126 C98 66 202 66 202 126 C202 98 180 86 150 86 C120 86 98 98 98 126 Z" fill="${c.hair}"/>
  <circle cx="130" cy="134" r="4.5" fill="${c.hair}"/><circle cx="170" cy="134" r="4.5" fill="${c.hair}"/>
  <path d="M150 202 C88 208 58 252 50 400 L250 400 C242 252 212 208 150 202 Z" fill="${c.robe}"/>
  <text x="150" y="372" text-anchor="middle" font-family="system-ui, sans-serif" font-size="44" fill="#e2e8f0" opacity="0.5">${c.label}</text>
</svg>
`

for (const c of CHARACTERS) {
  writeFileSync(join(OUT, `${c.id}.svg`), svg(c), 'utf8')
  console.log('생성:', `${c.id}.svg`)
}
console.log('출력 경로:', OUT)
