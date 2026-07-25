/**
 * 콘텐츠·에셋 배선 3 (주변 인물) 검증 — 작동 + 실제 화면.
 *
 * A. 초상 해석 — 5인(old_noble·maid_head·knight·scribe·commander_father)이
 *    성별 고정·나이축 없음으로 크롭(thumb)/원본(full) 경로를 낸다. HTTP 404 없음.
 * B. commander_father = VN — scene-commander-father 에서 화자 줄에 전신 스프라이트가 뜬다.
 * C. 노귀족 = 크롭 — 「옛 신하의 방문」 소소 인라인에 얼굴 크롭이 얹힌다.
 * D. 모브 = 텍스트 — 시녀장·기사·서기 소소엔 portrait 가 없어 얼굴이 안 뜬다(정책).
 * E. 온보딩 노귀족 = 크롭 — 화자에 얼굴이 붙는다(예전엔 이름만).
 */
import { APP_URL, enterGame, launch, log, ok, passIntro, shotsDir } from './helpers.mjs'

const OUT = shotsDir('wiring3')
const NEW = ['old_noble', 'maid_head', 'knight', 'scribe', 'commander_father']
const GENDER = { old_noble: 'male', maid_head: 'female', knight: 'male', scribe: 'male', commander_father: 'male' }

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const badChar = []
page.on('response', (r) => {
  if (r.status() >= 400 && r.url().includes('/characters/') && !r.url().includes('favicon')) {
    badChar.push(`HTTP ${r.status()}: ${r.url()}`)
  }
})
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(300)

const setGame = (patch) => page.evaluate((p) => window.__queeningAi.setGame(p), patch)
const csrc = (id, g, a) =>
  page.evaluate(([i, gg, aa]) => window.__queeningAi.charPortraitSrc(i, gg, aa), [id, g, a])

// ── A. 초상 해석 ──────────────────────────────────────────
log('=== A. 주변 인물 초상 해석 (성별 고정·나이 없음) ===')
for (const id of NEW) {
  // 일부러 반대 성별·엉뚱한 나이로 물어도 매니페스트가 성별을 고정하고 나이 토큰이 없어야 한다.
  const r = await csrc(id, GENDER[id] === 'male' ? 'female' : 'male', 25)
  const thumb = r?.thumbSrc ?? ''
  const full = r?.fullSrc ?? ''
  const noAge = !/_1[0-9]\.png|_20\.png/.test(thumb)
  const okPath =
    thumb.includes(`/portraits/others/${id}.png`) &&
    full.includes(`/characters/others/${id}.png`) && noAge
  log(`A·${id}: ${thumb.split('/').slice(-2).join('/')}`, ok(okPath))
}
const unknown = await csrc('nobody3', 'male', 15)
log('A·미등록 → null:', ok(unknown === null))

// ── B. commander_father VN ────────────────────────────────
log('')
log('=== B. commander_father = VN (전신 스프라이트) ===')
await setGame({ age: 18, monarchGender: 'male' })
await page.evaluate(() => window.__queeningAi.forceEvent('commander-father-audience'))
await page.waitForTimeout(400)
let cfSprite = null
for (let i = 0; i < 8; i++) {
  cfSprite = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('article img')]
    const s = imgs.find((im) => (im.getAttribute('src') ?? '').includes('/characters/others/commander_father'))
    return s ? { src: s.getAttribute('src'), w: s.naturalWidth } : null
  })
  if (cfSprite) break
  const next = page.getByRole('button', { name: /^(다음|계속)$/ })
  if (await next.isVisible().catch(() => false)) { await next.click(); await page.waitForTimeout(200) }
}
log('B1 ★ 씬 화자 줄에 commander_father 전신 스프라이트:', cfSprite?.src.split('/').slice(-2).join('/'),
  ok(!!cfSprite && cfSprite.src.includes('/characters/others/commander_father.png') && !cfSprite.src.includes('/portraits/')))
log('B2 ★ 전신 원본 로드됨(크롭 아님):', `${cfSprite?.w ?? 0}px`, ok((cfSprite?.w ?? 0) > 0))
const cfLabel = await page.getByText('가문의 수장').first().isVisible().catch(() => false)
log('B3 화자 라벨 표시(가문의 수장):', ok(cfLabel))
await page.screenshot({ path: `${OUT}/commander-father-vn.png` })

// ── C·D. 소소 인라인: 노귀족 크롭 vs 모브 텍스트 ──────────
log('')
log('=== C·D. 소소 인라인 — 노귀족 크롭 / 모브 텍스트 ===')
async function runInlineFor(eventId) {
  return page.evaluate((eid) => {
    const q = window.__queeningAi
    q.setDeterministic(true)
    q.setGame({
      age: 12, date: { year: 1, month: 5 }, phase: 'schedule', actionPoints: 3,
      plannedActivityIds: ['rest'], flags: {},
      lastTurnReport: {
        date: { year: 1, month: 5 }, activityIds: [], activityDeltas: [], eventDeltas: [],
        triggeredEventIds: [eid], inlineEventIds: [eid],
      },
      pendingEventIds: [],
    })
    // 결과 화면으로.
    q.setGame({ phase: 'result' })
  }, eventId)
}
// 노귀족: 얼굴 크롭이 인라인에 뜬다.
await runInlineFor('daily-old-noble')
await page.waitForTimeout(300)
const nobleFace = await page.locator('[data-report-face="old_noble"]').first()
const nobleFaceOk = await nobleFace.isVisible().catch(() => false)
const nobleFaceW = nobleFaceOk ? await nobleFace.evaluate((im) => im.naturalWidth) : 0
log('C1 ★ 「옛 신하의 방문」 인라인에 노귀족 크롭:', `${nobleFaceW}px`, ok(nobleFaceOk && nobleFaceW > 0))
log('C2 ★ 크롭 경로가 others 크롭:',
  ok((await nobleFace.getAttribute('src').catch(() => '') ?? '').includes('/portraits/others/old_noble.png')))
await page.screenshot({ path: `${OUT}/noble-inline-crop.png` })

// 모브(시녀장): portrait 없음 → 얼굴 안 뜸.
await runInlineFor('daily-chamberlain')
await page.waitForTimeout(300)
const anyFaceOnMob = await page.locator('[data-report-face]').count()
const mobTextShown = await page.locator('[data-report-event="daily-chamberlain"]').isVisible().catch(() => false)
log('D1 ★ 「시녀장의 잔소리」(모브)엔 얼굴 크롭 없음(텍스트 정책):', ok(anyFaceOnMob === 0))
log('D2 모브 소소 본문은 정상 표시:', ok(mobTextShown))

// ── E. 온보딩 노귀족 크롭 ─────────────────────────────────
// 실제 진입 흐름을 탄다: 타이틀 → 새 게임 → 인트로 → 온보딩(화자=노귀족).
log('')
log('=== E. 온보딩 노귀족 = 크롭 ===')
const ob = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await ob.goto(APP_URL, { waitUntil: 'networkidle' })
await ob.evaluate(() => localStorage.clear())
await ob.reload({ waitUntil: 'networkidle' })
await ob.waitForTimeout(300)
await ob.getByRole('button', { name: '새 게임' }).first().click()
await ob.waitForTimeout(300)
await passIntro(ob, 'male') // 건너뛰기 + 성별 + 시작한다 → 온보딩
await ob.waitForTimeout(400)
const obFace = ob.locator('[data-onboard-face="old_noble"]').first()
const obOk = await obFace.isVisible().catch(() => false)
const obW = obOk ? await obFace.evaluate((im) => im.naturalWidth) : 0
log('E1 ★ 온보딩 화자에 노귀족 크롭:', `${obW}px`, ok(obOk && obW > 0))
if (obOk) await ob.screenshot({ path: `${OUT}/onboarding-face.png` })

log('')
log('배선 404(캐릭터 에셋):', badChar.length === 0 ? 'PASS (없음)' : badChar.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
