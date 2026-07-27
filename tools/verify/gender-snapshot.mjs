/**
 * 성별 파라미터화 불변식 스냅샷 (성별 제한 해제 1차).
 *
 *   node gender-snapshot.mjs baseline   변경 전 기준을 캡처(임시파일에 저장)
 *   node gender-snapshot.mjs after      변경 후 스냅샷을 기준과 대조
 *
 * ★ 불변식: 리터럴을 토큰으로 바꿔도 **기본 배치에서 출력은 1바이트도 안 바뀐다.**
 *   변경 전/후 genderSnapshot() 배열이 완전히 같아야 PASS. 성별 스왑 시엔 달라져야 한다.
 */
import { APP_URL, enterGame, launch, log, ok } from './helpers.mjs'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const tag = process.argv[2] ?? 'baseline'
const BASE = join(tmpdir(), 'queening-gender-baseline.json')

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(200)

const snap = await page.evaluate(() => window.__queeningAi.genderSnapshot())
log(`스냅샷 ${snap.length}줄`)

if (tag === 'baseline') {
  writeFileSync(BASE, JSON.stringify(snap))
  log('기준 baseline 저장:', BASE)
  await browser.close()
} else {
  if (!existsSync(BASE)) {
    log('*** FAIL *** baseline 이 없습니다 — 먼저 `node gender-snapshot.mjs baseline` 을 도세요.')
    await browser.close()
    process.exit(1)
  }
  const base = JSON.parse(readFileSync(BASE, 'utf8'))
  const diffs = []
  const n = Math.max(base.length, snap.length)
  for (let i = 0; i < n; i++) if (base[i] !== snap[i]) diffs.push({ i, base: base[i], now: snap[i] })
  log('A1 ★ 기본 배치 출력 불변(1바이트도 안 바뀜):',
    ok(diffs.length === 0), diffs.length ? `(${diffs.length}건 차이)` : '')
  diffs.slice(0, 25).forEach((d) => log(`   [${d.i}] "${d.base}" → "${d.now}"`))

  // 성별 스왑 — 5인 전부 반대로. 토큰이 살아 있으면 출력이 실제로 달라져야 한다.
  const swapped = await page.evaluate(() => window.__queeningAi.genderSnapshot({
    characterGenders: { heir: 'female', loyalist: 'male', commander: 'male', prince: 'female', hero: 'female' },
  }))
  let changed = 0
  for (let i = 0; i < snap.length; i++) if (snap[i] !== swapped[i]) changed++
  log('A2 ★ 성별 스왑 시 출력이 실제로 달라짐(토큰이 살아 있음):', ok(changed > 0), `(${changed}줄 변화)`)

  // 구체 확인 — 스왑 후 "섭정공의 딸"/"충신 가문의 아들" 이 등장, "그녀" 가 heir 쪽에 생김.
  const joined = swapped.join('\n')
  log('A3 heir 여성화 → "섭정공의 딸" 등장:', ok(joined.includes('섭정공의 딸')))
  log('A4 loyalist 남성화 → "충신 가문의 아들" 등장:', ok(joined.includes('충신 가문의 아들')))
  await browser.close()
}
