/**
 * 게이트 임계 감사 — 밸런스 재설계 2단계.
 *
 * 1단계에서 성장 곡선이 통째로 바뀌었으므로(균형 20세 합계 491 → 282), 기존 게이트 26개가
 * 어느 빌드에서 열리고 어디서 죽었는지를 **새 곡선 기준으로** 다시 잰다.
 *
 * 이전 판(#25 조사)과 달라진 점:
 *   · 빌드를 셋 돌린다 — 균형 / 특화(현실형) / 회유. "균형이 못 넘는다"와
 *     "아무도 못 넘는다"는 전혀 다른 문제라서 한 빌드로는 판단할 수 없다.
 *   · 스탯 게이트뿐 아니라 **자원 게이트(영향도·신망·의심·신뢰)** 도 본다 —
 *     실제로 깨진 회유 루트가 자원 게이트였다.
 *   · 여유(margin)를 찍는다 — "1점 차 칼날 게이트"를 눈으로 찾기 위함.
 *
 * 조사 전용. 이 스크립트는 아무것도 고치지 않는다.
 */
import { APP_URL, enterGame, launch, log } from './helpers.mjs'

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(300)

// ── 1) 게이트 수집 ─────────────────────────────────────────
const { gates, tiered } = await page.evaluate(() => {
  const out = []
  const tiered = []
  for (const e of window.__queeningAi.events()) {
    const c = e.condition ?? {}
    if (Object.keys(c.stats ?? {}).length || Object.keys(c.resources ?? {}).length) {
      out.push({ kind: '이벤트', id: e.id, title: e.title, minAge: c.minAge ?? null,
        stats: c.stats ?? {}, resources: c.resources ?? {} })
    }
    for (const ch of e.choices ?? []) {
      const rs = ch.requires?.stats ?? {}
      const rr = ch.requires?.resources ?? {}
      if (Object.keys(rs).length || Object.keys(rr).length) {
        out.push({ kind: '선택지', id: `${e.id}/${ch.id}`, title: `${e.title} → ${ch.label}`,
          minAge: c.minAge ?? null, stats: rs, resources: rr })
      }
      // ★ 4-C 결과 차등 — 잠금이 아니라 등급이라 게이트 표가 아니라 별도로 본다.
      if (ch.tiers?.length && ch.tierStat) {
        tiered.push({ title: `${e.title} → ${ch.label}`, minAge: c.minAge ?? null,
          stat: ch.tierStat, mins: ch.tiers.map((t) => t.min).sort((a, b) => a - b) })
      }
    }
  }
  return { gates: out, tiered }
})

// ── 2) 빌드별 곡선 실측 (엔진 stepTurn 그대로) ──────────────
/**
 * ★ 빌드는 "그 축을 실제로 미는 플레이"를 하나씩 대표해야 한다.
 *   공부만 하는 빌드 셋으로 재면 영향도 게이트가 전부 죽은 것처럼 보인다 —
 *   실제로는 직접 재가를 쓰는 빌드가 20세에 영향도 97 까지 간다(simulate F).
 *   의심 게이트도 마찬가지로 무리형에서만 열린다. 축마다 대표 빌드를 둔다.
 */
const BUILDS = [
  { key: '균형', desc: '매달 가장 낮은 스탯', order: null },
  { key: '특화', desc: '통치학→궁정처세→변론 순, 상한 닿으면 다음', order: ['statecraft', 'courtcraft', 'rhetoric', 'finance', 'martial'] },
  { key: '회유', desc: '정무 배석으로 신망을 밀고 통치학·궁정처세', order: ['statecraft', 'courtcraft'], accord: true },
  /**
   * ★ 균형 육성을 하면서 **정무 배석을 이따금** 섞는 빌드.
   *
   *   묻는 것 하나: 회유(담판 신망 50)가 **전용 빌드에만** 열리는가, 섞어서도 가는 길인가.
   *   회유는 주요 정치 경로라 "완전 특화해야만 열린다"면 그건 밸런스 문제다.
   *   섞는 정도는 "심신이 받쳐 줄 때 3달에 한 번" — 최적화가 아니라 곁들이는 수준.
   */
  { key: '균형+배석', desc: '균형 육성 + 정무 배석을 3달에 한 번', order: null, dabble: 3 },
  // 얼마나 섞어야 닿는지 구간을 좁히려고 한 단계 더 진한 버전도 잰다.
  { key: '균형+배석2', desc: '균형 육성 + 정무 배석을 2달에 한 번', order: null, dabble: 2 },
  { key: '실권', desc: '통치학을 밀고 14세부터 직접 재가·밀서로 실권을 되찾는다', order: ['statecraft', 'courtcraft'], reclaim: true },
  { key: '무리', desc: '놀이 없이 매달 수업 2 + 휴식 1 (의심이 최대로 차는 축)', order: null, overwork: true },
]

const curves = {}

// 빌드마다 페이지를 새로 연다 — 리셋 경로에 의존하지 않고 상태 오염을 원천 차단한다.
async function measure(b) {
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await p.goto(APP_URL, { waitUntil: 'networkidle' })
  await p.evaluate(() => localStorage.clear())
  await p.reload({ waitUntil: 'networkidle' })
  await enterGame(p)
  await p.waitForTimeout(200)
  const res = await p.evaluate((b) => {
    const LESSON = {
      statecraft: 'lecture-statecraft', finance: 'lecture-finance', rhetoric: 'debate-practice',
      martial: 'sword-training', courtcraft: 'attend-banquet',
    }
    const q = window.__queeningAi
    q.setDeterministic(true)
    q.setMinorEnabled(true)
    const byAge = {}
    const uses = {}
    const byYear = {}
    for (let i = 0; i < 130; i++) {
      const g = q.state
      const plan = []
      let ap = 3
      const add = (id, cost = 1) => {
        if (ap >= cost) {
          plan.push(id); ap -= cost
          uses[id] = (uses[id] ?? 0) + 1
          const yr = (byYear[g.age] ??= {})
          yr[id] = (yr[id] ?? 0) + 1
        }
      }

      const keys = Object.keys(LESSON)
      const pickStat = () => (b.order
        ? (b.order.find((k) => g.stats[k] < 100) ?? b.order[0])
        : keys.slice().sort((x, y) => g.stats[x] - g.stats[y])[0])

      if (b.overwork) {
        // 무리형: 수지를 무시하고 수업 2 + 휴식 1 을 고집한다.
        add(LESSON[pickStat()]); add(LESSON[pickStat()]); add('rest')
      } else {
        if (g.wellbeing < 18) { add('rest'); add('rest') }
        else if (g.wellbeing < 40) add('rest')
        // 회유 빌드는 신망을 버는 칸을 우선한다(정무 배석 AP2).
        if (b.accord) {
          if (ap >= 2 && g.regentRapport < 70) add('attend-council', 2)
          else if (g.regentSuspicion > 40) add('cede-affairs')
        }
        // 실권 빌드는 14세·통치학 35 부터 직접 재가로 정무를 되찾는다.
        if (b.reclaim && ap >= 2 && g.age >= 14 && g.stats.statecraft >= 35) add('direct-decree', 2)
        // 곁들이기: 3달에 한 번, 심신이 받쳐 줄 때만 정무 배석(AP2).
        if (b.dabble && ap >= 2 && i % b.dabble === 0 && g.wellbeing >= 30) add('attend-council', 2)
        const playAt = b.dabble || b.accord ? 42 : 55
        if (ap >= 1 && g.regentSuspicion >= playAt) add('play')
        while (ap >= 1) {
          // 심신이 다음 수업을 못 버티면 회복으로 돌린다.
          if (plan.some((x) => Object.values(LESSON).includes(x)) && g.wellbeing < 30) add('rest')
          else add(LESSON[pickStat()])
        }
      }
      const r = q.stepTurn(plan)
      const s = q.state.stats
      byAge[r.age] = {
        통치학: Math.round(s.statecraft), 재정: Math.round(s.finance), 변론: Math.round(s.rhetoric),
        무예: Math.round(s.martial), 궁정처세: Math.round(s.courtcraft),
        심신: Math.round(q.state.wellbeing), 영향도: Math.round(q.state.courtInfluence),
        신망: Math.round(q.state.regentRapport), 의심: Math.round(q.state.regentSuspicion),
        신뢰: Math.round(q.state.tutorTrust),
      }
      if (r.phase === 'ended') break
    }
    return { byAge, uses, byYear }
  }, b)
  await p.close()
  return res
}

const usage = {}
const yearly = {}
for (const b of BUILDS) {
  const r = await measure(b)
  curves[b.key] = r.byAge
  usage[b.key] = r.uses
  yearly[b.key] = r.byYear
}

const STAT_KEY = { statecraft: '통치학', finance: '재정', rhetoric: '변론', martial: '무예', courtcraft: '궁정처세' }
const RES_KEY = { courtInfluence: '영향도', regentRapport: '신망', regentSuspicion: '의심', tutorTrust: '신뢰', wellbeing: '심신' }

for (const b of BUILDS) {
  log('')
  log(`=== ${b.key} 빌드 곡선 (${b.desc}) ===`)
  log(' 나이  통치 재정 변론 무예 궁정 | 심신 영향 신망 의심 신뢰')
  for (const age of Object.keys(curves[b.key]).sort((x, y) => x - y)) {
    const c = curves[b.key][age]
    const n = (v, w = 4) => String(v).padStart(w)
    log(` ${n(age, 3)}  ${n(c.통치학)} ${n(c.재정)} ${n(c.변론)} ${n(c.무예)} ${n(c.궁정처세)} |` +
      ` ${n(c.심신)} ${n(c.영향도)} ${n(c.신망)} ${n(c.의심)} ${n(c.신뢰)}`)
  }
  /*
   * ★ 칸 사용 — "플래너가 그 버튼을 정말 눌렀는가".
   *   조건이 빡빡해 한 번도 안 눌린 채 "그 경로는 안 열린다"고 결론 내릴 뻔한 적이 있다.
   *   결론을 쓰기 전에 횟수를 눈으로 본다.
   */
  const u = usage[b.key] ?? {}
  log('   칸 사용: ' + Object.entries(u).sort((x, y) => y[1] - x[1])
    .map(([k, v]) => `${k} ${v}`).join(' · '))
  /*
   * ★ 신망을 움직이는 두 칸을 나이별로 따로 본다.
   *   총 횟수가 비슷한데 결과가 크게 다르면 원인은 **시점**이나 **상쇄**다:
   *     15세 전 배석은 상한 30 에 부딪혀 버려지고, 연회는 누를 때마다 신망 −1 이다.
   */
  const y = yearly[b.key] ?? {}
  const ages = Object.keys(y).map(Number).sort((a, b2) => a - b2)
  const council = ages.map((a) => `${a}:${y[a]['attend-council'] ?? 0}`).join(' ')
  const banquet = ages.map((a) => `${a}:${y[a]['attend-banquet'] ?? 0}`).join(' ')
  const before15 = ages.filter((a) => a < 15).reduce((n, a) => n + (y[a]['attend-council'] ?? 0), 0)
  const after15 = ages.filter((a) => a >= 15).reduce((n, a) => n + (y[a]['attend-council'] ?? 0), 0)
  log(`   배석/년: ${council}   → 15세 전 ${before15} · 15세 이후 ${after15}`)
  log(`   연회/년: ${banquet}   → 총 ${ages.reduce((n, a) => n + (y[a]['attend-banquet'] ?? 0), 0)} (신망 −1씩)`)
}

// ── 3) 대조 ────────────────────────────────────────────────
/**
 * ★ "그 나이에 넘는가"가 아니라 **"몇 세에 처음 넘는가"** 를 묻는다.
 *
 *   지난 판은 minAge 가 없는 이벤트를 11세로 취급해, 실제로는 나중에 열리는 게이트를
 *   "균형 빌드가 못 넘음"으로 잘못 세었다(감사 도구가 만든 가짜 ★ 4건). 최초 충족 나이를
 *   찾으면 그 오류가 원천적으로 사라지고, "언제 열리는가"라는 더 쓸모 있는 답이 나온다.
 */
function firstMetAge(curve, minAge, reqs) {
  const ages = Object.keys(curve).map(Number).sort((a, b) => a - b)
  for (const age of ages) {
    if (age < (minAge ?? 11)) continue
    const c = curve[age]
    const margins = reqs.map((r) => {
      const have = c[r.field] ?? 0
      return r.min !== undefined ? have - r.min : r.max - have
    })
    if (margins.every((m) => m >= 0)) return { age, worst: Math.min(...margins) }
  }
  // 못 넘으면 마지막 나이에서 얼마나 모자랐는지를 돌려준다.
  const last = curve[ages[ages.length - 1]]
  const margins = reqs.map((r) => {
    const have = last[r.field] ?? 0
    return r.min !== undefined ? have - r.min : r.max - have
  })
  return { age: null, worst: Math.min(...margins) }
}

log('')
log('=== 게이트 × 빌드 대조 ===')
log('   숫자 = 처음 충족하는 나이(괄호는 그때의 여유). ✘ = 끝까지 못 넘음(괄호는 최종 부족분).')
const rows = []
for (const g of gates) {
  const age = g.minAge ?? 11
  const reqs = []
  for (const [k, v] of Object.entries(g.stats)) {
    if (v.min !== undefined) reqs.push({ label: STAT_KEY[k] ?? k, field: STAT_KEY[k] ?? k, min: v.min })
    if (v.max !== undefined) reqs.push({ label: STAT_KEY[k] ?? k, field: STAT_KEY[k] ?? k, max: v.max })
  }
  for (const [k, v] of Object.entries(g.resources)) {
    if (v.min !== undefined) reqs.push({ label: RES_KEY[k] ?? k, field: RES_KEY[k] ?? k, min: v.min })
    if (v.max !== undefined) reqs.push({ label: RES_KEY[k] ?? k, field: RES_KEY[k] ?? k, max: v.max })
  }
  if (!reqs.length) continue

  const per = {}
  for (const b of BUILDS) per[b.key] = firstMetAge(curves[b.key], g.minAge, reqs)

  /**
   * ★ 칼날 판정은 **minAge 시점의 여유**로 본다.
   *   최초 충족 나이의 여유로 재면 임계를 넘는 해는 늘 여유가 작아 전부 칼날로 잡힌다(가짜 20건).
   *   진짜 문제는 "이벤트가 뜨는 그 나이에 1~2점이 모자라 막힌다"이고, 그건 minAge 가
   *   박혀 있는 게이트에만 성립한다.
   */
  let razorAt = null
  if (g.minAge) {
    const c = curves['균형'][g.minAge] ?? curves['특화'][g.minAge]
    for (const b of BUILDS) {
      const cc = curves[b.key][g.minAge]
      if (!cc) continue
      const m = Math.min(...reqs.map((r) => {
        const have = cc[r.field] ?? 0
        return r.min !== undefined ? have - r.min : r.max - have
      }))
      if (m >= -3 && m <= 2) razorAt = { build: b.key, margin: m }
    }
    void c
  }

  /**
   * 마일스톤 지연 — minAge 에 열리라고 써 둔 문이 실제로는 몇 년 늦게 열리는가.
   *
   * ★ 기준은 **가장 빠른 빌드**다. 균형이 아니라. 특화 전용으로 의도한 "큰 문"은
   *   균형이 늦게 여는 게 설계이고, 그걸 지연으로 세면 의도한 설계가 전부 결함으로 잡힌다
   *   (실제로 처음 재었을 때 큰 문 5건이 그렇게 잡혔다). 진짜 문제는
   *   **어느 빌드도 제때 못 여는 문** — 그건 임계가 곡선에서 떨어져 나갔다는 뜻이다.
   */
  const earliest = Math.min(...BUILDS.map((b) => per[b.key].age ?? 99))
  const delay = g.minAge && earliest < 99 ? earliest - g.minAge : null
  // 균형이 늦는 정도는 따로 남긴다 — 문제는 아니지만 "얼마나 큰 문인가"의 척도다.
  const balanceDelay = g.minAge && per['균형'].age !== null ? per['균형'].age - g.minAge : null

  rows.push({
    age, kind: g.kind, title: g.title, minAge: g.minAge,
    req: reqs.map((r) => `${r.label} ${r.min !== undefined ? '≥' + r.min : '≤' + r.max}`).join(', '),
    per, delay, balanceDelay, razorAt,
    deadForAll: BUILDS.every((b) => per[b.key].age === null),
    balanceOnly: per['균형'].age === null && BUILDS.some((b) => per[b.key].age !== null),
  })
}
rows.sort((a, b) => a.age - b.age || a.title.localeCompare(b.title))
for (const r of rows) {
  const mark = r.deadForAll ? '☠' : r.balanceOnly ? '△' : (r.delay ?? 0) >= 2 ? '⏳' : r.razorAt ? '⚔' : ' '
  const cells = BUILDS.map((b) => {
    const p = r.per[b.key]
    return p.age === null ? `${b.key} ✘(${p.worst})` : `${b.key} ${p.age}세`
  }).join('  ')
  log(`${mark} 최소 ${String(r.age).padStart(2)}세 [${r.kind}] ${r.title}`)
  log(`      요구 ${r.req}`)
  log(`      ${cells}` +
    (r.delay ? `   ⏳균형 지연 ${r.delay}년` : '') +
    (r.razorAt ? `   ⚔${r.razorAt.build} minAge 여유 ${r.razorAt.margin}` : ''))
}
// ── 4) 결과 차등(4-C) — 잠기지 않으니 게이트가 아니다. 등급이 실제로 갈리는지만 본다.
log('')
log('=== 결과 차등 선택지 (4-C) — 이벤트가 뜨는 나이에 빌드별로 어느 등급인가 ===')
for (const t of tiered) {
  const field = STAT_KEY[t.stat] ?? t.stat
  const cells = BUILDS.map((b) => {
    const c = curves[b.key][t.minAge ?? 11] ?? curves[b.key][Math.min(...Object.keys(curves[b.key]).map(Number))]
    const have = c?.[field] ?? 0
    // 가장 높은 충족 문턱의 순번 = 등급(0=어설픔, 마지막=제대로).
    const idx = t.mins.reduce((acc, m, i) => (have >= m ? i : acc), 0)
    return `${b.key} ${have}→${idx === t.mins.length - 1 ? '제대로' : '어설픔'}`
  }).join('  ')
  log(` ${String(t.minAge ?? '-').padStart(2)}세 ${t.title}`)
  log(`      기준 ${field} 문턱 ${t.mins.join('/')}  |  ${cells}`)
}
const splits = tiered.filter((t) => {
  const field = STAT_KEY[t.stat] ?? t.stat
  const top = t.mins[t.mins.length - 1]
  const vals = BUILDS.map((b) => (curves[b.key][t.minAge ?? 11]?.[field] ?? 0) >= top)
  return vals.some(Boolean) && vals.some((v) => !v)
})
log(`  차등 ${tiered.length}건 중 빌드에 따라 실제로 결과가 갈리는 것 ${splits.length}건`)

log('')
log(`총 게이트 ${rows.length}건 (빌드 ${BUILDS.length}종: ${BUILDS.map((b) => b.key).join('·')})`)
log(`  ☠ 어느 빌드도 못 넘음(죽은 게이트): ${rows.filter((r) => r.deadForAll).length}건`)
log(`  △ 균형만 못 넘음(특화 전용 큰 문): ${rows.filter((r) => r.balanceOnly).length}건`)
log(`  ⏳ 가장 빠른 빌드조차 2년 이상 늦게 엶(임계가 곡선에서 떨어짐): ${rows.filter((r) => (r.delay ?? 0) >= 2).length}건`)
log(`  ⚔ minAge 시점 여유가 −3~+2(칼날): ${rows.filter((r) => r.razorAt).length}건`)

await browser.close()
