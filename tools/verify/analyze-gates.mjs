// 게이트 임계 감사 (실플레이 피드백 #25) — **조사 전용**. 고치지 않고 표만 뽑는다.
//
// 1) 모든 이벤트·선택지의 게이트(나이·스탯·자원)를 뽑고
// 2) '균형 육성' 빌드를 실제 엔진(stepTurn)으로 108턴 돌려 스탯 곡선을 실측하고
// 3) 각 게이트를 그 나이의 균형 빌드 스탯과 대조해 "넘는가/못 넘는가"를 표로 낸다.
import { APP_URL, enterGame, launch, log } from './helpers.mjs'

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(300)

// ── 1) 게이트 수집 ─────────────────────────────────────────
const gates = await page.evaluate(() => {
  const out = []
  for (const e of window.__queeningAi.events()) {
    const c = e.condition ?? {}
    const statGate = c.stats ?? {}
    const resGate = c.resources ?? {}
    if (Object.keys(statGate).length || Object.keys(resGate).length || c.minAge) {
      out.push({
        kind: '이벤트', id: e.id, title: e.title, minAge: c.minAge ?? null,
        stats: statGate, resources: resGate,
      })
    }
    for (const ch of e.choices ?? []) {
      const rs = ch.requires?.stats ?? {}
      const rr = ch.requires?.resources ?? {}
      if (Object.keys(rs).length || Object.keys(rr).length) {
        out.push({
          kind: '선택지', id: `${e.id}/${ch.id}`, title: `${e.title} → ${ch.label}`,
          minAge: c.minAge ?? null, stats: rs, resources: rr,
        })
      }
    }
  }
  return out
})

// ── 2) 균형 육성 빌드 실측 (엔진 그대로) ────────────────────
const LESSON = {
  statecraft: 'lecture-statecraft', finance: 'lecture-finance', rhetoric: 'debate-practice',
  martial: 'sword-training', courtcraft: 'attend-banquet',
}
const curve = await page.evaluate((LESSON) => {
  const q = window.__queeningAi
  q.setDeterministic(true)
  q.setMinorEnabled(false) // 소소 잡음 제외 — 활동 성장만 본다
  const byAge = {}
  for (let i = 0; i < 108; i++) {
    const g = q.state
    // 균형 육성: 심신이 낮으면 쉬고, 아니면 가장 낮은 두 스탯을 배우고 하나는 쉰다.
    let plan
    if (g.wellbeing < 45) plan = ['rest', 'rest', 'rest']
    else {
      const order = Object.keys(LESSON).sort((a, b) => g.stats[a] - g.stats[b])
      plan = [LESSON[order[0]], LESSON[order[1]], 'rest']
    }
    const r = q.stepTurn(plan)
    const s = q.state.stats
    byAge[r.age] = {
      통치학: Math.round(s.statecraft), 재정: Math.round(s.finance),
      변론: Math.round(s.rhetoric), 무예: Math.round(s.martial),
      궁정처세: Math.round(s.courtcraft),
      심신: Math.round(q.state.wellbeing), 영향도: Math.round(q.state.courtInfluence),
    }
    if (r.phase === 'ended') break
  }
  return byAge
}, LESSON)

const KEY = {
  statecraft: '통치학', finance: '재정', rhetoric: '변론', martial: '무예', courtcraft: '궁정처세',
}

log('=== 균형 육성 빌드 스탯 곡선 (실측, 소소 제외) ===')
log('나이  통치학 재정 변론 무예 궁정처세 | 심신 영향도')
for (const age of Object.keys(curve).sort((a, b) => a - b)) {
  const c = curve[age]
  log(
    `${String(age).padStart(3)}  ${String(c.통치학).padStart(5)} ${String(c.재정).padStart(4)}` +
    ` ${String(c.변론).padStart(4)} ${String(c.무예).padStart(4)} ${String(c.궁정처세).padStart(7)}` +
    ` | ${String(c.심신).padStart(4)} ${String(c.영향도).padStart(5)}`,
  )
}

// ── 3) 대조 ────────────────────────────────────────────────
log('')
log('=== 게이트 × 균형 빌드 대조 (★ = 균형 빌드가 그 나이에 못 넘음) ===')
const rows = []
for (const g of gates) {
  const statKeys = Object.keys(g.stats)
  if (!statKeys.length) continue
  const age = g.minAge ?? 11
  // 그 나이의 균형 빌드 스탯(없으면 가장 가까운 이전 나이)
  let c = curve[age]
  for (let a = age; a >= 11 && !c; a--) c = curve[a]
  if (!c) continue
  const reqs = statKeys.map((k) => `${KEY[k] ?? k} ${g.stats[k].min ?? '-'}`)
  const unmet = statKeys.filter((k) => g.stats[k].min !== undefined && (c[KEY[k]] ?? 0) < g.stats[k].min)
  rows.push({
    age, kind: g.kind, title: g.title, req: reqs.join(', '),
    have: statKeys.map((k) => `${KEY[k] ?? k} ${c[KEY[k]] ?? '?'}`).join(', '),
    unmet: unmet.length > 0,
  })
}
rows.sort((a, b) => a.age - b.age || (a.unmet === b.unmet ? 0 : a.unmet ? -1 : 1))
for (const r of rows) {
  log(`${r.unmet ? '★' : ' '} ${String(r.age).padStart(2)}세 [${r.kind}] ${r.title}`)
  log(`     요구 ${r.req}  /  균형 ${r.have}`)
}
const blocked = rows.filter((r) => r.unmet)
log('')
log(`총 스탯 게이트 ${rows.length}건 중 균형 빌드가 못 넘는 것 ${blocked.length}건`)

await browser.close()
