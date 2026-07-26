/**
 * 16~19세 관계 심화 검증 (데뷔탕트~결정적 씬 사이).
 *
 * A. 등록 — 12씬(①⑤ 3·②③④ 2), sceneId·priority 유일값.
 * B. ★ 호감도 게이트 — 관계 쌓인 캐릭터만 뜸(게이트 아래면 발동 후보 아님).
 * C. ★ 확정 안 됨 — 이 씬들은 romance_confirmed/settled 를 안 세우고 선택지도 없다(결정적 씬이 유일한 확정).
 * D. 70 도달 경로 — 각 씬이 호감도 +6.
 * E. ★ 달 분산 — 후반 현안(m6·m4·m5)·마일스톤(성년식 m3·debut m9·담판 m11)과 안 겹침.
 * F. ★ ④ 소문 회수 — hero-at-court insight 가 heard_frontier_rumor 있을 때만 뜬다.
 * G. romance_settled 게이트 — 이미 확정됐으면 심화 안 뜸.
 */
import { APP_URL, enterGame, launch, log, ok } from './helpers.mjs'

const IDS = [
  'relation-heir-1', 'relation-heir-2', 'relation-heir-3',
  'relation-commander-1', 'relation-commander-2', 'relation-commander-3',
  'relation-loyalist-1', 'relation-loyalist-2',
  'relation-prince-1', 'relation-prince-2',
  'relation-hero-1', 'relation-hero-2',
]
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(300)

const setGame = (patch) => page.evaluate((p) => window.__queeningAi.setGame(p), patch)
const triggerable = () => page.evaluate(() => window.__queeningAi.triggerable())

// ── A. 등록 ───────────────────────────────────────────────
log('=== A. 등록 ===')
const defs = await page.evaluate((ids) => {
  const events = window.__queeningAi.events()
  const byId = Object.fromEntries(events.map((e) => [e.id, e]))
  return ids.map((id) => {
    const e = byId[id]
    return {
      id, has: !!e, hasScene: !!e?.sceneId, pri: e?.priority,
      month: e?.condition?.month, minAge: e?.condition?.minAge,
      aff: e?.condition?.affection,
      unlocked: e?.condition?.flags?.romance_unlocked, settled: e?.condition?.flags?.romance_settled,
      confirms: JSON.stringify(e?.setFlags ?? {}), hasChoices: (e?.choices?.length ?? 0) > 0,
      bond: e?.effects?.find((x) => x.target?.kind === 'affection')?.amount,
    }
  })
}, IDS)
log('A1 12씬 전부 등록·sceneId 있음:', ok(defs.every((d) => d.has && d.hasScene)))
const prios = defs.map((d) => d.pri)
log('A2 priority 유일값(캐릭터 대역):', ok(new Set(prios).size === 12 && prios.every((p) => p > 60 && p < 61)))

// ── B. 호감도 게이트 ──────────────────────────────────────
log('')
log('=== B. 호감도 게이트 (안 친하면 안 뜸) ===')
async function canFire(id, patch) {
  await setGame({ phase: 'schedule', ...patch })
  const t = await triggerable()
  return t.includes(id)
}
// relation-heir-1: 17세 m2, 게이트 25.
const base = { flags: { romance_unlocked: true, romance_settled: false }, stats: { statecraft: 30, finance: 20, rhetoric: 20, martial: 20, courtcraft: 20 } }
const heirLow = await canFire('relation-heir-1', { age: 17, date: { year: 6, month: 2 }, affection: { heir: 20 }, ...base })
log('B1 ★ 호감도 20(<25) → 안 뜸:', ok(!heirLow))
const heirOk = await canFire('relation-heir-1', { age: 17, date: { year: 6, month: 2 }, affection: { heir: 30 }, ...base })
log('B2 ★ 호감도 30(≥25) → 뜸:', ok(heirOk))
// 로맨스 안 열렸으면 안 뜸.
const noRomance = await canFire('relation-heir-1', { age: 17, date: { year: 6, month: 2 }, affection: { heir: 40 }, flags: { romance_unlocked: false, romance_settled: false }, stats: base.stats })
log('B3 romance_unlocked 아니면 안 뜸(데뷔탕트 전):', ok(!noRomance))

// ── C. 확정 안 됨 ─────────────────────────────────────────
log('')
log('=== C. ★ 확정 안 됨 (결정적 씬이 유일한 확정) ===')
const noConfirm = defs.every((d) => !d.confirms.includes('romance_confirmed') && !d.confirms.includes('romance_settled'))
log('C1 ★ 심화 씬은 romance_confirmed/settled 를 안 세움:', ok(noConfirm))
log('C2 ★ 심화 씬은 선택지가 없음(수락/거절은 결정적 씬만):', ok(defs.every((d) => !d.hasChoices)))

// ── D. 호감도 상승 (70 경로) ──────────────────────────────
log('')
log('=== D. 70 도달 경로 (각 +6) ===')
log('D1 ★ 각 심화 씬이 호감도 +6:', JSON.stringify(defs.map((d) => d.bond)),
  ok(defs.every((d) => d.bond === 6)))

// ── E. 달 분산 ────────────────────────────────────────────
log('')
log('=== E. 달 분산 (현안·마일스톤 회피) ===')
// (나이, 달) 별 후반 현안·마일스톤 점유표.
const OCCUPIED = {
  17: [3, 6, 8, 10], // 성년식·제국책봉·약재·영웅입궁
  18: [4, 11], // 영주·담판/결렬
  19: [5, 1], // 선왕미완·처분/청산(연초)
  16: [6, 9, 10], // 하원·debut·외가
}
const clashes = defs.filter((d) => (OCCUPIED[d.minAge] ?? []).includes(d.month))
log('E1 ★ 심화 씬 달이 현안·마일스톤과 안 겹침:', JSON.stringify(clashes.map((d) => `${d.id}@${d.minAge}/${d.month}`)),
  ok(clashes.length === 0))
// 같은 (나이,달) 셀에 심화 두 개가 겹치지 않는지(같은 캐릭터끼리도).
const cells = defs.map((d) => `${d.minAge}-${d.month}`)
log('E2 심화끼리 (나이,달) 셀 충돌 0:', ok(new Set(cells).size === cells.length))

// ── F. ④ 소문 회수 ───────────────────────────────────────
log('')
log('=== F. ④ 소문 회수 (hero-at-court insight) ===')
async function heroInsight(flags) {
  await setGame({ age: 17, date: { year: 6, month: 10 }, phase: 'schedule',
    stats: { statecraft: 30, finance: 20, rhetoric: 20, martial: 20, courtcraft: 20 }, flags })
  await page.evaluate(() => window.__queeningAi.forceEvent('hero-at-court'))
  await page.waitForTimeout(250)
  const txt = await page.locator('[data-screen="event"]').innerText().catch(() => '')
  await page.keyboard.press('Escape').catch(() => {})
  return txt
}
const withRumor = await heroInsight({ heard_frontier_rumor: true })
log('F1 ★ 소문 들었으면 회수 문장("그 사람이 이 사람"):', ok(withRumor.includes('그 사람이 이 사람') || withRumor.includes('소문과 실물')))
const withoutRumor = await heroInsight({})
log('F2 ★ 소문 안 들었으면 회수 없음:', ok(!withoutRumor.includes('그 사람이 이 사람')))

// ── G. romance_settled 게이트 ─────────────────────────────
log('')
log('=== G. romance_settled 게이트 ===')
const settledBlocks = await canFire('relation-heir-1', { age: 17, date: { year: 6, month: 2 }, affection: { heir: 40 }, flags: { romance_unlocked: true, romance_settled: true }, stats: base.stats })
log('G1 ★ 이미 확정(settled)이면 심화 안 뜸:', ok(!settledBlocks))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
