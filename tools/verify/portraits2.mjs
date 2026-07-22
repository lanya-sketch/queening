// 콘텐츠·에셋 배선 2: 5인 + 모후·섭정공 초상 검증 (작동 + 실제 화면).
//
// ★ 대화창 크롭 / 이벤트 씬 전신(VN) / charId×성별×나이 해석·폴백·하위호환.
import { APP_URL, enterGame, launch, log, ok, shotsDir } from './helpers.mjs'

const OUT = shotsDir('portraits2')
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('response', (r) => {
  if (r.status() >= 400 && !r.url().includes('favicon') && r.url().includes('/characters/')) {
    errors.push(`HTTP ${r.status()}: ${r.url()}`)
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

// ─────────────────────────────────────────────────────────────
log('=== A. 캐릭터 초상 해석 (charId × 성별 × 나이) ===')
const heir = await csrc('heir', 'male', 16)
log('A1 ★ heir 남 16 → 크롭본/원본 경로:', heir?.thumbSrc.split('/').slice(-3).join('/'),
  ok(heir?.thumbSrc.includes('/portraits/heir/male/heir_m_16.png') &&
     heir?.fullSrc.includes('/characters/heir/male/heir_m_16.png')))
const loy = await csrc('loyalist', 'female', 20)
log('A2 ★ loyalist 여 20:', loy?.thumbSrc.split('/').pop(),
  ok(loy?.thumbSrc.includes('loyalist_f_20.png')))
const hero = await csrc('hero', 'male', 15)
log('A3 ★ hero 는 나이 없음(성인) → hero_m.png:', hero?.thumbSrc.split('/').pop(),
  ok(hero?.thumbSrc.includes('/hero/male/hero_m.png') && !/_1[0-9]\.png|_20\.png/.test(hero.thumbSrc)))
const qm = await csrc('queen_mother', 'male', 14)
log('A4 ★ 모후 → 성별 고정(여) others/queen_mother_f:', qm?.thumbSrc.split('/').pop(),
  ok(qm?.thumbSrc.includes('/others/queen_mother_f.png')))
const reg = await csrc('regent', 'female', 14)
log('A5 ★ 섭정공 → 성별 고정(남) others/regent_m:', reg?.thumbSrc.split('/').pop(),
  ok(reg?.thumbSrc.includes('/others/regent_m.png')))
const clampHi = await csrc('commander', 'female', 25)
log('A6 ★ 나이 상한 clamp(20):', clampHi?.thumbSrc.split('/').pop(),
  ok(clampHi?.thumbSrc.includes('commander_f_20.png')))
const clampLo = await csrc('prince', 'male', 9)
log('A7 ★ 나이 하한 clamp(13):', clampLo?.thumbSrc.split('/').pop(),
  ok(clampLo?.thumbSrc.includes('prince_m_13.png')))
const unknown = await csrc('nobody', 'male', 15)
log('A8 ★ 미등록 캐릭터 → null(스프라이트 안 그림):', ok(unknown === null))

// ─────────────────────────────────────────────────────────────
log('')
log('=== B. 대화창 크롭 (상대방만, 튜터 제외) ===')
await setGame({ age: 17, monarchGender: 'male' })
await page.evaluate(() => window.__queeningAi.openTalk('commander'))
await page.waitForTimeout(400)
const dlgImg = await page.evaluate(() => {
  const img = document.querySelector('[role="dialog"][aria-label="대화"] img')
  return { src: img?.getAttribute('src') ?? '', w: img?.naturalWidth ?? 0 }
})
log('B1 ★ 대화창 헤더가 상대(commander) 크롭:', dlgImg.src.split('/').slice(-2).join('/'),
  ok(dlgImg.src.includes('/portraits/commander/female/commander_f_17.png') && dlgImg.w > 0))
await page.screenshot({ path: `${OUT}/talk-crop.png` })
await page.keyboard.press('Escape')
await page.waitForTimeout(200)

// ─────────────────────────────────────────────────────────────
log('')
log('=== C. 이벤트 씬 전신 (VN 레이아웃) ===')
await setGame({ age: 16, monarchGender: 'female' })
await page.evaluate(() => window.__queeningAi.forceEvent('decisive-heir'))
await page.waitForTimeout(400)
// heir 가 말하는 줄까지 넘겨 스프라이트가 뜨게 한다.
for (let i = 0; i < 4; i++) {
  const sprite = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('article img')]
    const s = imgs.find((im) => (im.getAttribute('src') ?? '').includes('/characters/'))
    return s ? { src: s.getAttribute('src'), w: s.naturalWidth } : null
  })
  if (sprite) { globalThis.__sprite = sprite; break }
  const next = page.getByRole('button', { name: /^(다음|계속)$/ })
  if (await next.isVisible().catch(() => false)) { await next.click(); await page.waitForTimeout(200) }
}
const sprite = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('article img')]
  const s = imgs.find((im) => (im.getAttribute('src') ?? '').includes('/characters/'))
  return s ? { src: s.getAttribute('src'), w: s.naturalWidth } : null
})
log('C1 ★ 이벤트 씬에 화자(heir) 전신 스프라이트:', sprite?.src.split('/').slice(-3).join('/'),
  ok(!!sprite && sprite.src.includes('/characters/heir/') && !sprite.src.includes('/portraits/')))
log('C2 ★ 전신 원본 로드됨(크롭 아님):', `${sprite?.w}px`, ok((sprite?.w ?? 0) > 0))
await page.screenshot({ path: `${OUT}/scene-fullbody.png` })

// ─────────────────────────────────────────────────────────────
log('')
log('=== D. 하위호환 — characterPortraits 없는 매니페스트 ===')
const legacy = await page.evaluate(() => window.__queeningAi.validateManifest({
  version: 1, outfits: [{ id: 'casual', name: '사복', thumbSrc: '/x/t.png', fullSrc: '/x/f.png' }],
}))
log('D1 ★ characterPortraits 없어도 매니페스트 로드:',
  ok(legacy.manifest !== null && legacy.manifest.characterPortraits === undefined))

// ─────────────────────────────────────────────────────────────
log('')
log('=== E. 반응형 375px ===')
const mp = await browser.newPage({ viewport: { width: 375, height: 812 } })
await mp.goto(APP_URL, { waitUntil: 'networkidle' })
await enterGame(mp)
await mp.waitForTimeout(200)
await mp.evaluate(() => { window.__queeningAi.setGame({ age: 16, monarchGender: 'male' }); window.__queeningAi.forceEvent('decisive-heir') })
await mp.waitForTimeout(400)
const of = await mp.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
log('E1 이벤트 씬 375px 오버플로 없음:', ok(of.sw <= of.iw))
await mp.screenshot({ path: `${OUT}/scene-mobile.png` })

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
