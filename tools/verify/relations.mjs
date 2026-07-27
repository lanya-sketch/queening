/**
 * 성별 개방 2차 검증 — 인트로 선택 · 에셋 렌더 · 전 조합.
 *
 * A. 인트로 「인연」 스텝 — 접힌 기본(그대로 시작)으로 지나갈 수 있고, 펼치면 5인 남/여 토글.
 *    성별을 바꾸면 이름이 즉시 갈리고(섭정공의 아들↔딸), 선택이 게임 상태에 남는다.
 * B. 에셋 렌더 — 5인 × 남/여 × 나이(13/16/20) 초상 경로가 실제로 200(404 0건).
 * C. 전 조합 엔딩 수렴 — 성별 32조합에서 judgeEnding 이 정확히 하나로 수렴(성별 직교 실측).
 */
import { APP_URL, launch, log, ok } from './helpers.mjs'

const browser = await launch()
const errors = []

// ── A. 인트로 「인연」 스텝 ────────────────────────────────
log('=== A. 인트로 「인연」 스텝 (375px) ===')
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.getByRole('button', { name: '새 게임' }).click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: '건너뛰기' }).click()
await page.waitForTimeout(150)
await page.getByRole('button', { name: '다음', exact: true }).click() // 성별/이름
await page.waitForTimeout(150)
await page.getByRole('button', { name: '다음', exact: true }).click() // 기질
await page.waitForTimeout(250)

log('A1 인연 스텝 도달(프롬프트):', ok(await page.getByText('이 조정에서 만날 인연들').isVisible()))
log('A2 접힌 기본 — "그대로 시작" 원탭 노출:',
  ok(await page.getByRole('button', { name: '그대로 시작' }).isVisible()))
log('A3 접힌 기본 — 5인 토글은 숨김:',
  ok((await page.locator('[data-relation-choice]').count()) === 0))

// 펼침
await page.locator('[data-relations-customize]').click()
await page.waitForTimeout(200)
log('A4 "직접 고르기" → 5인 노출:', ok((await page.locator('[data-relation-choice]').count()) === 5))
const overflow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
log('A4b 인연 스텝(펼침) 375px 무오버플로:', `${overflow.sw}/${overflow.iw}`, ok(overflow.sw <= overflow.iw))
const heirNameBefore = await page.locator('[data-relation-choice="heir"] p').first().innerText()
log('A5 heir 기본 이름 "섭정공의 아들":', heirNameBefore, ok(heirNameBefore === '섭정공의 아들'))

// heir 를 여로 스왑 → 이름 즉시 갈림
await page.locator('[data-relation-choice="heir"] [data-relation-gender="female"]').click()
await page.waitForTimeout(150)
const heirNameAfter = await page.locator('[data-relation-choice="heir"] p').first().innerText()
log('A6 ★ heir 여 스왑 → 이름 즉시 "섭정공의 딸":', heirNameAfter, ok(heirNameAfter === '섭정공의 딸'))
// loyalist 를 남으로
await page.locator('[data-relation-choice="loyalist"] [data-relation-gender="male"]').click()
await page.waitForTimeout(150)

// 시작 → 선택이 게임 상태에 남는다
await page.getByRole('button', { name: '시작한다' }).click()
await page.waitForTimeout(300)
const saved = await page.evaluate(() => window.__queeningAi.state.characterGenders)
log('A7 ★ 선택이 게임 상태에 반영(heir=여·loyalist=남):',
  JSON.stringify(saved), ok(saved.heir === 'female' && saved.loyalist === 'male'))

// 접힌 기본으로 지나가면 현행 배치 유지(별도 컨텍스트).
const page2 = await browser.newPage({ viewport: { width: 375, height: 812 } })
await page2.goto(APP_URL, { waitUntil: 'networkidle' })
await page2.evaluate(() => localStorage.clear())
await page2.reload({ waitUntil: 'networkidle' })
await page2.getByRole('button', { name: '새 게임' }).click()
await page2.waitForTimeout(250)
await page2.getByRole('button', { name: '건너뛰기' }).click()
await page2.waitForTimeout(120)
await page2.getByRole('button', { name: '다음', exact: true }).click()
await page2.waitForTimeout(120)
await page2.getByRole('button', { name: '다음', exact: true }).click()
await page2.waitForTimeout(200)
await page2.getByRole('button', { name: '그대로 시작' }).click()
await page2.waitForTimeout(250)
const kept = await page2.evaluate(() => window.__queeningAi.state.characterGenders)
log('A8 "그대로 시작" → 현행 배치(①③④남/②⑤여):', JSON.stringify(kept),
  ok(kept.heir === 'male' && kept.loyalist === 'female' && kept.prince === 'male'
    && kept.commander === 'female' && kept.hero === 'male'))
await page2.close()

// ── B. 에셋 렌더 (전 조합 초상 404 0건) ────────────────────
log('')
log('=== B. 에셋 렌더 — 초상 경로 200(404 0건) ===')
const CHARS = ['heir', 'loyalist', 'prince', 'commander', 'hero']
const AGES = [13, 16, 20]
const paths = await page.evaluate(({ chars, ages }) => {
  const g = window.__queeningAi
  const m = g.state // manifest 는 브릿지로 직접 못 읽으니 charPortraitSrc 로 해석
  void m
  const out = []
  for (const id of chars) {
    for (const gen of ['male', 'female']) {
      for (const age of ages) {
        const src = g.charPortraitSrc(id, gen, age)
        out.push({ id, gen, age, src })
      }
    }
  }
  return out
}, { chars: CHARS, ages: AGES })

let notResolved = paths.filter((p) => !p.src)
log('B1 모든 조합이 초상 경로로 해석됨:', ok(notResolved.length === 0),
  notResolved.length ? JSON.stringify(notResolved.slice(0, 5)) : '')

// 실제 파일 200 확인(중복 경로는 한 번만).
const uniq = [...new Set(paths.map((p) => p.src).filter(Boolean))]
let bad = []
for (const src of uniq) {
  const url = new URL(src, APP_URL).href
  const res = await page.request.get(url)
  if (res.status() !== 200) bad.push(`${src} → ${res.status()}`)
}
log('B2 ★ 초상 파일 404/오류 0건:', `${uniq.length}개 경로`, ok(bad.length === 0))
bad.slice(0, 10).forEach((b) => log('   ' + b))

// ── C. 전 조합 엔딩 수렴 (성별 직교 실측) ──────────────────
log('')
log('=== C. 전 조합(32) 엔딩 수렴 ===')
const conv = await page.evaluate(({ chars }) => {
  const g = window.__queeningAi
  // 32 성별 조합.
  const combos = []
  for (let mask = 0; mask < 32; mask++) {
    const cg = {}
    chars.forEach((id, i) => { cg[id] = (mask >> i) & 1 ? 'female' : 'male' })
    combos.push(cg)
  }
  // 다양한 종료 상태 50개(결정론적 의사난수).
  let seed = 12345
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
  const endings = new Set()
  let mismatches = 0
  for (let s = 0; s < 50; s++) {
    const st = {
      ...g.state, age: 21,
      stats: {
        statecraft: Math.round(rnd() * 100), finance: Math.round(rnd() * 100),
        rhetoric: Math.round(rnd() * 100), martial: Math.round(rnd() * 100),
        courtcraft: Math.round(rnd() * 100),
      },
      courtInfluence: Math.round(rnd() * 100),
      regentSuspicion: Math.round(rnd() * 100), regentRapport: Math.round(rnd() * 100),
      flags: {
        truth_deep: rnd() > 0.5, truth_shallow: rnd() > 0.5,
        house_commons_defended: rnd() > 0.5, empire_defied: rnd() > 0.5,
        romance_confirmed: rnd() > 0.5,
      },
    }
    const ref = JSON.stringify(g.judgeEnding({ ...st, characterGenders: combos[0] }))
    endings.add(ref)
    for (let c = 1; c < combos.length; c++) {
      const j = JSON.stringify(g.judgeEnding({ ...st, characterGenders: combos[c] }))
      if (j !== ref) mismatches++
    }
  }
  return { mismatches, distinctEndings: endings.size, states: 50, combos: combos.length }
}, { chars: CHARS })
log('C1 ★ 50상태 × 32조합에서 성별에 따른 판정 불일치 0:', conv.mismatches, ok(conv.mismatches === 0))
log('C2 상태가 실제로 다양함(엔딩 여러 종류 도달):', `${conv.distinctEndings}종`,
  ok(conv.distinctEndings >= 3))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : '*** FAIL ***\n  ' + errors.join('\n  '))
await browser.close()
