/**
 * 성별 리터럴 린트 (성별 제한 해제 1차 · 회귀 가드).
 *
 * ★ 연애 대상 5인을 가리키는 성별 고정 리터럴이 데이터에 새로 들어오는 걸 막는다.
 *   진짜 완전성 증명은 gender-snapshot 의 스왑 검사(A2~A4)가 한다 — 렌더 결과가
 *   성별에 따라 실제로 갈리는지 실측하므로. 이 린트는 가벼운 회귀 가드다.
 *
 *   규칙:
 *   L1 그녀 — 5인은 '그'로 통일하므로 서사 리터럴 '그녀'는 0건이어야 한다(강한 금지).
 *   L2 딸   — 관계어 딸은 {자식:x} 토큰이어야 한다. 리터럴 딸(동사 '딸리다' 제외)은 0건.
 *   L3 아들 — 캐릭터 표지(섭정공/충신 가문/무관 가문)와 함께 나오는 리터럴 아들은
 *            토큰화 누락이다. (군주=선왕의 아들 은 이 라운드 범위 밖이라 표지가 없으면 통과.)
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DIRS = ['src/data/scenes', 'src/data/events', 'src/data/endings', 'src/data/persona']
const CHAR_MARKER = /섭정공|충신 가문|무관 가문/

function stripComments(src) {
  return src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
}
/** 토큰·복합어·동사를 지워 '진짜 리터럴'만 남긴다. */
function bare(line) {
  return line
    .replace(/\{자식:[a-z]+\}/g, '')
    .replace(/받아들|알아들/g, '')
    .replace(/딸리|딸림|딸려|딸린|딸려/g, '')
}

const hits = []
for (const dir of DIRS) {
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.ts')) continue
    const path = join(dir, f)
    stripComments(readFileSync(path, 'utf8')).split('\n').forEach((line, i) => {
      const b = bare(line)
      if (/그녀/.test(b)) hits.push({ path, line: i + 1, term: '그녀', text: line.trim() })
      if (/딸/.test(b)) hits.push({ path, line: i + 1, term: '딸', text: line.trim() })
      if (/아들/.test(b) && CHAR_MARKER.test(line)) {
        hits.push({ path, line: i + 1, term: '아들(캐릭터 표지)', text: line.trim() })
      }
    })
  }
}

const ok = (b) => (b ? 'PASS' : '*** FAIL ***')
console.log('=== gender-lint · 5인 지칭 성별 리터럴 회귀 가드 ===')
console.log('L1 ★ 5인 지칭 성별 리터럴(그녀/딸/캐릭터-아들) 0건:',
  ok(hits.length === 0), hits.length ? `(${hits.length}건)` : '')
for (const h of hits) console.log(`   ${h.path}:${h.line} [${h.term}] ${h.text.slice(0, 84)}`)
process.exit(hits.length ? 1 : 0)
