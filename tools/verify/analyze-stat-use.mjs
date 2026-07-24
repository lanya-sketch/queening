/**
 * 스탯별 "쓰이는 자리" 감사 — 실플레이 피드백(통치학이 초반에 쓸 데가 없다).
 *
 * 묻는 것: **11~14세 구간에 각 스탯이 실제로 쓰이는 자리가 몇 개인가.**
 *   게이트 감사(analyze-gates)는 "넘을 수 있는가"를 보지만, 여기서는
 *   "그 나이에 그 스탯이 등장하기는 하는가"를 센다. 초반 3년간 쓸모가 없으면
 *   플레이어는 그 스탯을 버리고, 간판 스탯이 그러면 게임의 얼굴이 죽는다.
 *
 * 쓰이는 자리 셋을 구분해 센다 — 성격이 다르기 때문이다.
 *   · 이벤트 조건  — 그 스탯이 있어야 사건이 열린다(가장 강한 쓰임)
 *   · 선택지 잠금  — 그 스탯이 있어야 그 대응을 고를 수 있다
 *   · 결과 차등    — 잠기진 않지만 스탯에 따라 결과가 갈린다(4-C)
 *   · 통찰        — 잠금도 분기도 아니고 배경 한 줄을 더 읽는다(4-D)
 *
 * 조사 전용. 아무것도 고치지 않는다.
 */
import { APP_URL, enterGame, launch, log } from './helpers.mjs'

const STAT_KO = {
  statecraft: '통치학', finance: '재정', rhetoric: '변론', martial: '무예', courtcraft: '궁정처세',
}

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(300)

const rows = await page.evaluate(() => {
  const out = []
  for (const e of window.__queeningAi.events()) {
    const c = e.condition ?? {}
    const age = c.minAge ?? null
    for (const [k, v] of Object.entries(c.stats ?? {})) {
      out.push({ kind: '이벤트 조건', stat: k, min: v.min ?? null, age, title: e.title })
    }
    for (const ins of e.insights ?? []) {
      for (const [k, v] of Object.entries(ins.requires?.stats ?? {})) {
        out.push({ kind: '통찰', stat: k, min: v.min ?? null, age, title: e.title })
      }
    }
    for (const ch of e.choices ?? []) {
      for (const [k, v] of Object.entries(ch.requires?.stats ?? {})) {
        out.push({ kind: '선택지 잠금', stat: k, min: v.min ?? null, age, title: `${e.title} → ${ch.label}` })
      }
      if (ch.tiers?.length && ch.tierStat) {
        const top = Math.max(...ch.tiers.map((t) => t.min))
        out.push({ kind: '결과 차등', stat: ch.tierStat, min: top, age, title: `${e.title} → ${ch.label}` })
      }
    }
  }
  return out
})

/**
 * ★ minAge 가 없는 이벤트는 "언제든" 이므로 초반 구간에도 등장할 수 있다.
 *   다만 임계가 높으면 실제로는 나중에 열린다 — 그래서 임계도 함께 본다.
 *   초반 구간의 기준선(균형 빌드 실측): 11세 13 · 12세 16 · 13세 19 · 14세 22.
 */
const EARLY_LINE = { 11: 13, 12: 16, 13: 19, 14: 22 }
const inEarly = (r) => (r.age ?? 11) <= 14
/** 초반에 실제로 손이 닿는 임계인가(14세 기준선 22 + 여유 6). */
const reachableEarly = (r) => r.min === null || r.min <= 28

log('=== 11~14세 구간에 각 스탯이 쓰이는 자리 ===')
log('   기준선(균형 실측): ' + Object.entries(EARLY_LINE).map(([a, v]) => `${a}세 ${v}`).join(' · '))
log('')

const early = rows.filter(inEarly)
for (const [key, ko] of Object.entries(STAT_KO)) {
  const mine = early.filter((r) => r.stat === key)
  const reachable = mine.filter(reachableEarly)
  log(`${ko.padEnd(5)} 총 ${String(mine.length).padStart(2)}자리 · 그중 초반에 닿는 임계 ${reachable.length}자리`)
  for (const r of mine) {
    const mark = reachableEarly(r) ? ' ' : '×'
    log(`   ${mark} ${String(r.age ?? '-').padStart(2)}세 [${r.kind}] ${r.title} — ${ko} ${r.min}`)
  }
  log('')
}

log('=== 요약 (초반에 닿는 임계만) ===')
const summary = Object.entries(STAT_KO).map(([key, ko]) => ({
  ko, n: early.filter((r) => r.stat === key && reachableEarly(r)).length,
})).sort((a, b) => b.n - a.n)
for (const s of summary) log(`   ${s.ko.padEnd(5)} ${'■'.repeat(s.n)} ${s.n}`)

log('')
log('=== 참고: 15세 이후에 쓰이는 자리 ===')
const late = rows.filter((r) => !inEarly(r))
for (const [key, ko] of Object.entries(STAT_KO)) {
  log(`   ${ko.padEnd(5)} ${late.filter((r) => r.stat === key).length}자리`)
}

await browser.close()
