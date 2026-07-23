/**
 * 성장 곡선 수치 탐색용 오프라인 모델 (밸런스 재설계).
 *
 * ★ 이건 **증명이 아니라 탐색**이다. turn.ts 의 산식(등급→MONTH_SCALE→내구도 계수)만
 *   그대로 옮겨 놓고 이벤트·소소·확률은 뺐다. 여기서 후보 수치를 좁힌 다음
 *   tools/verify/balance.mjs(실제 UI 108개월)로 확정한다.
 */
const STATS = ['통치학', '재정', '변론', '무예', '궁정처세']
const START = { 통치학: 12, 재정: 8, 변론: 10, 무예: 6, 궁정처세: 5 }

function simulate(P, build) {
  const s = { ...START }
  let wellbeing = 70
  let suspicion = 10
  let accumulated = 0
  const tally = { lesson: 0, rest: 0, play: 0 }
  const yearly = []
  const byYear = {}

  for (let m = 0; m < 108; m++) {
    const age = 11 + Math.floor(m / 12)
    if (m % 12 === 0) {
      yearly.push({ age, sum: Math.round(STATS.reduce((a, k) => a + s[k], 0)), wellbeing: Math.round(wellbeing) })
    }
    const d = (age - 11) * 6 + accumulated
    const gf = 1 + Math.max(0, d - 30) * P.GROWTH_SLOPE
    const cf = 1 + Math.max(0, 30 - d) * (P.COST_SLOPE ?? 0.02)

    let ap = 3
    let lessonsThisMonth = 0
    const doLesson = () => {
      const key = build.pick(s)
      const tier = P.tiers.slice().sort((a, b) => b.min - a.min).find((t) => s[key] >= t.min)
      s[key] = Math.min(100, s[key] + tier.gain * P.SCALE * gf)
      wellbeing -= tier.cost * cf
      suspicion = Math.min(100, suspicion + tier.susp)
      tally.lesson++; lessonsThisMonth++; ap--
      byYear[age] = (byYear[age] ?? 0) + 1
    }
    const doRest = () => { wellbeing += P.rest; tally.rest++; ap-- }
    const doPlay = () => { wellbeing += P.play; suspicion = Math.max(0, suspicion - P.playSusp); tally.play++; ap-- }

    if (wellbeing < 18) { doRest(); if (ap) doRest() }
    else if (wellbeing < 40) doRest()
    if (ap && suspicion >= 55) doPlay()
    while (ap > 0) {
      // 다음 수업을 감당할 심신이 남았는지 — 아니면 회복으로 돌린다.
      const tierNow = P.tiers.slice().sort((a, b) => b.min - a.min).find((t) => s[build.pick(s)] >= t.min)
      if (lessonsThisMonth >= 1 && wellbeing - tierNow.cost * cf < 28) doRest()
      else doLesson()
    }
    wellbeing = Math.max(0, Math.min(100, wellbeing))
    if (wellbeing >= 55) accumulated += 0.4
  }
  yearly.push({ age: 20, sum: Math.round(STATS.reduce((a, k) => a + s[k], 0)), wellbeing: Math.round(wellbeing) })
  return { s, tally, yearly, byYear, suspicion: Math.round(suspicion) }
}

const BUILDS = [
  { key: 'BAL', pick: (s) => [...STATS].sort((a, b) => s[a] - s[b])[0] },
  { key: 'SPEC2', pick: (s) => ['통치학', '궁정처세'].sort((a, b) => s[a] - s[b])[0] },
  // 실제 플레이어는 밀던 스탯이 상한에 닿으면 다음 스탯으로 넘어간다(고정 2스탯보다 정직).
  { key: 'SPEC-SPILL', pick: (s) => {
    const order = ['통치학', '궁정처세', '변론', '재정', '무예']
    return order.find((k) => s[k] < 100) ?? '통치학'
  } },
]

const CANDIDATES = {
  '현행(1/4 · 6/9/13 · 30/60 · 휴12 놀16)': {
    SCALE: 1 / 4, GROWTH_SLOPE: 0.005, rest: 12, play: 16, playSusp: 5,
    tiers: [{ min: 0, gain: 6, cost: 6, susp: 1 }, { min: 30, gain: 9, cost: 9, susp: 2 }, { min: 60, gain: 13, cost: 13, susp: 3 }],
  },
  'A. 1/5 · 5/10/17 · 35/65 · 휴16 놀10': {
    SCALE: 1 / 5, GROWTH_SLOPE: 0.005, rest: 16, play: 10, playSusp: 6,
    tiers: [{ min: 0, gain: 5, cost: 7, susp: 1 }, { min: 35, gain: 10, cost: 11, susp: 2 }, { min: 65, gain: 17, cost: 16, susp: 4 }],
  },
  'B. 1/6 · 5/11/19 · 35/65 · 휴16 놀10': {
    SCALE: 1 / 6, GROWTH_SLOPE: 0.005, rest: 16, play: 10, playSusp: 6,
    tiers: [{ min: 0, gain: 5, cost: 7, susp: 1 }, { min: 35, gain: 11, cost: 11, susp: 2 }, { min: 65, gain: 19, cost: 16, susp: 4 }],
  },
  'C. 1/6 · 4/11/20 · 40/70 · 휴16 놀10': {
    SCALE: 1 / 6, GROWTH_SLOPE: 0.005, rest: 16, play: 10, playSusp: 6,
    tiers: [{ min: 0, gain: 4, cost: 7, susp: 1 }, { min: 40, gain: 11, cost: 11, susp: 2 }, { min: 70, gain: 20, cost: 16, susp: 4 }],
  },
  // ★ 초급 이득만 깎는다 — 균형 빌드는 대부분을 초급에서 보내므로 균형만 골라 맞는다.
  //   특화는 중·고급 체류가 길어 덜 맞는다. "벌이 아니라 특화에 복리" 설계 그대로.
  'D. 1/5 · 4/10/17 · 35/65 · 휴16 놀10': {
    SCALE: 1 / 5, GROWTH_SLOPE: 0.005, rest: 16, play: 10, playSusp: 6,
    tiers: [{ min: 0, gain: 4, cost: 7, susp: 1 }, { min: 35, gain: 10, cost: 11, susp: 2 }, { min: 65, gain: 17, cost: 16, susp: 4 }],
  },
  'E. 1/5 · 4/10/16 · 40/70 · 휴16 놀10': {
    SCALE: 1 / 5, GROWTH_SLOPE: 0.005, rest: 16, play: 10, playSusp: 6,
    tiers: [{ min: 0, gain: 4, cost: 7, susp: 1 }, { min: 40, gain: 10, cost: 11, susp: 2 }, { min: 70, gain: 16, cost: 16, susp: 4 }],
  },
  'F. 1/5 · 4.5/10/17 · 35/65 · 휴16 놀10': {
    SCALE: 1 / 5, GROWTH_SLOPE: 0.005, rest: 16, play: 10, playSusp: 6,
    tiers: [{ min: 0, gain: 4.5, cost: 7, susp: 1 }, { min: 35, gain: 10, cost: 11, susp: 2 }, { min: 65, gain: 17, cost: 16, susp: 4 }],
  },
  // 정수만 쓰는 변형 — 초급 이득은 A 와 같게 두고 **초급 대가를 올려** 칸 수로 깎는다.
  'G. 1/5 · 5/10/17 · 35/65 · 대가 8/11/16': {
    SCALE: 1 / 5, GROWTH_SLOPE: 0.005, rest: 16, play: 10, playSusp: 6,
    tiers: [{ min: 0, gain: 5, cost: 8, susp: 1 }, { min: 35, gain: 10, cost: 11, susp: 2 }, { min: 65, gain: 17, cost: 16, susp: 4 }],
  },
  'H. 1/5 · 5/10/17 · 38/68 · 대가 9/12/17': {
    SCALE: 1 / 5, GROWTH_SLOPE: 0.005, rest: 16, play: 10, playSusp: 6,
    tiers: [{ min: 0, gain: 5, cost: 9, susp: 1 }, { min: 38, gain: 10, cost: 12, susp: 2 }, { min: 68, gain: 17, cost: 17, susp: 4 }],
  },
  // ★ 초반 혹독을 내구도 계수로 강화 — 내구도 0 에서 심신 소모 ×1.6 → ×2.0 / ×2.5.
  //   "초반 1수업/월 강제"가 실제로 성립하는지를 가르는 유일한 손잡이다.
  'I. H + COST_SLOPE 0.033 (내구도0 ×2.0)': {
    SCALE: 1 / 5, GROWTH_SLOPE: 0.005, COST_SLOPE: 0.033, rest: 16, play: 10, playSusp: 6,
    tiers: [{ min: 0, gain: 5, cost: 9, susp: 1 }, { min: 38, gain: 10, cost: 12, susp: 2 }, { min: 68, gain: 17, cost: 17, susp: 4 }],
  },
  // 균형 빌드는 18~19세에 겨우 중급에 닿아 마지막 2년에 가속한다. 문턱을 올리면
  // 그 가속만 잘려 나가고, 이미 한참 위인 특화 빌드는 거의 안 맞는다.
  'K. I + 문턱 45/72': {
    SCALE: 1 / 5, GROWTH_SLOPE: 0.005, COST_SLOPE: 0.033, rest: 16, play: 10, playSusp: 6,
    tiers: [{ min: 0, gain: 5, cost: 9, susp: 1 }, { min: 45, gain: 10, cost: 12, susp: 2 }, { min: 72, gain: 17, cost: 17, susp: 4 }],
  },
  'J. H + COST_SLOPE 0.05 (내구도0 ×2.5)': {
    SCALE: 1 / 5, GROWTH_SLOPE: 0.005, COST_SLOPE: 0.05, rest: 16, play: 10, playSusp: 6,
    tiers: [{ min: 0, gain: 5, cost: 9, susp: 1 }, { min: 38, gain: 10, cost: 12, susp: 2 }, { min: 68, gain: 17, cost: 17, susp: 4 }],
  },
}

for (const [label, P] of Object.entries(CANDIDATES)) {
  console.log('\n' + '='.repeat(72))
  console.log(label)
  for (const b of BUILDS) {
    const r = simulate(P, b)
    const vals = STATS.map((k) => Math.round(r.s[k]))
    const sum = vals.reduce((a, x) => a + x, 0)
    const mark = b.key === 'BAL' ? (sum >= 250 && sum <= 300 ? ' ✔' : ' ✘') : ''
    console.log(`  ${b.key.padEnd(11)} 합 ${String(sum).padStart(3)}${mark}  [${vals.join(', ')}]  수업 ${r.tally.lesson} 휴식 ${r.tally.rest} 놀이 ${r.tally.play}  의심 ${r.suspicion}`)
    console.log(`     연도별 합계: ${r.yearly.map((y) => `${y.age}:${y.sum}`).join(' ')}`)
    // 초반 "1수업/월 강제" 확인 — 11~13세 수업칸이 12달 대비 몇 개인가.
    if (b.key === 'BAL') {
      console.log(`     연도별 수업칸(/12달): ${Object.entries(r.byYear).map(([a, n]) => `${a}:${n}`).join(' ')}`)
    }
  }
}
