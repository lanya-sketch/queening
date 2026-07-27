/**
 * 연애 대상 성별 파라미터화 검증 (성별 제한 해제 1차) — 자기완결(기준파일 불필요).
 *
 * A. 기본 배치 — heir=남(섭정공의 아들)·loyalist=여(충신 가문의 딸).
 * B. 성별 스왑 — 5인 전부 반대로 → 관계어가 실제로 갈린다(아들↔딸).
 * C. '그' 통일 — 캐릭터 성별을 바꿔도 서사에 '그녀'가 생기지 않는다(군주만 그/그녀).
 * D. 이름 헬퍼 — characterName 이 성별에 맞는 이름을 돌려준다.
 */
import { APP_URL, enterGame, launch, log, ok } from './helpers.mjs'

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(200)

const snap = (patch) => page.evaluate((p) => window.__queeningAi.genderSnapshot(p), patch ?? null)
const SWAP = { characterGenders: { heir: 'female', loyalist: 'male', commander: 'male', prince: 'female', hero: 'female' } }

const base = (await snap()).join('\n')
const swapped = (await snap(SWAP)).join('\n')

// ── A. 기본 배치 ──────────────────────────────────────────
log('=== A. 기본 배치 ===')
log('A1 heir 남 → "섭정공의 아들" 있음:', ok(base.includes('섭정공의 아들')))
log('A2 heir 기본에 "섭정공의 딸" 없음:', ok(!base.includes('섭정공의 딸')))
log('A3 loyalist 여 → "충신 가문의 딸" 있음:', ok(base.includes('충신 가문의 딸')))
log('A4 loyalist 기본에 "충신 가문의 아들" 없음:', ok(!base.includes('충신 가문의 아들')))

// ── B. 성별 스왑 ──────────────────────────────────────────
log('')
log('=== B. 성별 스왑 (관계어가 갈림) ===')
log('B1 heir 여 → "섭정공의 딸" 등장:', ok(swapped.includes('섭정공의 딸')))
log('B2 loyalist 남 → "충신 가문의 아들" 등장:', ok(swapped.includes('충신 가문의 아들')))
const baseArr = base.split('\n'), swapArr = swapped.split('\n')
let changed = 0
for (let i = 0; i < baseArr.length; i++) if (baseArr[i] !== swapArr[i]) changed++
log('B3 ★ 스왑으로 관계어 여러 줄이 갈림:', changed, ok(changed >= 20))

// ── C. '그' 통일 (그녀 안 생김) ───────────────────────────
log('')
log('=== C. \'그\' 통일 — 캐릭터 스왑이 그녀를 만들지 않음 ===')
const countHer = (s) => (s.match(/그녀/g) ?? []).length
log('C1 기본 배치에 캐릭터발 그녀 없음(군주 남이라 0):', countHer(base), ok(countHer(base) === 0))
log('C2 ★ 성별 스왑 후에도 그녀 0 (5인은 그로 통일):', countHer(swapped), ok(countHer(swapped) === 0))

// ── D. 이름 헬퍼 ──────────────────────────────────────────
log('')
log('=== D. characterName 헬퍼 ===')
const names = await page.evaluate((swap) => {
  const g = window.__queeningAi
  // 기본
  const male = g.resolveWith('{이름:heir}', { ...g.state, monarchGender: 'male' })
  // 여성 heir
  const female = g.resolveWith('{이름:heir}', { ...g.state, characterGenders: { ...g.state.characterGenders, heir: 'female' } })
  return { male, female }
}, SWAP)
log('D1 {이름:heir} 남 → 섭정공의 아들:', names.male, ok(names.male === '섭정공의 아들'))
log('D2 {이름:heir} 여 → 섭정공의 딸:', names.female, ok(names.female === '섭정공의 딸'))

// ── E. 밸런스·미스터리 무손상 — 성별은 판정 로직에 안 닿는다 ──
log('')
log('=== E. 성별은 엔딩/판정에 무영향 (밸런스·미스터리 직교) ===')
const judged = await page.evaluate((swap) => {
  const g = window.__queeningAi
  // 중반 정도의 임의 상태를 만들고, 성별만 바꿔 엔딩 판정을 비교한다.
  const st = {
    ...g.state, age: 21,
    stats: { statecraft: 60, finance: 40, rhetoric: 50, martial: 45, courtcraft: 55 },
    courtInfluence: 72, regentSuspicion: 30, regentRapport: 40,
    flags: { truth_deep: true, heir_knows_truth: true },
  }
  const defJudge = g.judgeEnding(st)
  const swapJudge = g.judgeEnding({ ...st, ...swap })
  return { def: JSON.stringify(defJudge), swap: JSON.stringify(swapJudge) }
}, SWAP)
log('E1 ★ 성별을 바꿔도 엔딩 판정이 동일(성별은 수치·flag 무관):',
  ok(judged.def === judged.swap))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : '*** FAIL ***\n  ' + errors.join('\n  '))
await browser.close()
