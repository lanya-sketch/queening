// 콘텐츠·에셋 배선 1: 군주 초상 검증 (작동 + 실제 화면).
//
// ★ 크롭본이 실제로 뜨는지, 나이×성별×착장으로 바뀌는지, 폴백 체인·하위호환.
import { APP_URL, enterGame, launch, log, ok, shotsDir } from './helpers.mjs'

const OUT = shotsDir('portraits')
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('response', (r) => {
  if (r.status() >= 400 && !r.url().includes('favicon') && r.url().includes('/monarch/')) {
    errors.push(`HTTP ${r.status()}: ${r.url()}`)
  }
})

await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(300)

const setGame = (patch) => page.evaluate((p) => window.__queeningAi.setGame(p), patch)
const portraitImg = () =>
  page.evaluate(() => {
    const img = document.querySelector('aside button[aria-label*="군주 초상"] img')
    return { src: img?.getAttribute('src') ?? '', complete: img?.complete, w: img?.naturalWidth ?? 0 }
  })

// ─────────────────────────────────────────────────────────────
log('=== A. 초상이 실제 크롭본으로 뜬다 (플레이스홀더 교체) ===')
await setGame({ monarchGender: 'male', age: 11, currentOutfitId: 'casual' })
await page.waitForTimeout(300)
const m11 = await portraitImg()
log('A1 ★ 초상 src 가 크롭본 경로:', m11.src.split('/').slice(-2).join('/'),
  ok(m11.src.includes('/monarch/portraits/male/monarch_m_casual_11.png')))
log('A2 ★ 이미지가 실제로 로드됨(깨짐 없음):', `${m11.w}px`, ok(m11.complete === true && m11.w > 0))
log('A3 ★ 회색 실루엣 SVG 아님:', ok(!m11.src.includes('.svg')))
await page.screenshot({ path: `${OUT}/portrait-m11-casual.png`, clip: { x: 0, y: 0, width: 340, height: 240 } })

// ─────────────────────────────────────────────────────────────
log('')
log('=== B. 나이·성별·착장으로 바뀐다 ===')
await setGame({ age: 20 })
await page.waitForTimeout(250)
const m20 = await portraitImg()
log('B1 ★ 나이 11→20 → 초상 바뀜:', m20.src.split('/').pop(),
  ok(m20.src.includes('monarch_m_casual_20.png') && m20.src !== m11.src))
await page.screenshot({ path: `${OUT}/portrait-m20-casual.png`, clip: { x: 0, y: 0, width: 340, height: 240 } })

await setGame({ monarchGender: 'female', age: 16 })
await page.waitForTimeout(250)
const f16 = await portraitImg()
log('B2 ★ 성별 여왕 → 여성 초상:', f16.src.split('/').pop(),
  ok(f16.src.includes('/female/monarch_f_casual_16.png') && f16.w > 0))
await page.screenshot({ path: `${OUT}/portrait-f16-casual.png`, clip: { x: 0, y: 0, width: 340, height: 240 } })

// 착장 전환 — 갑주(무예 30 해금) 착용
await setGame({ monarchGender: 'male', age: 18, currentOutfitId: 'armor', stats: { statecraft: 40, finance: 20, rhetoric: 20, martial: 40, courtcraft: 30 } })
await page.waitForTimeout(250)
const armor = await portraitImg()
log('B3 ★ 착장 갑주 → 갑주 크롭본:', armor.src.split('/').pop(),
  ok(armor.src.includes('monarch_m_armor_18.png') && armor.w > 0))
await page.screenshot({ path: `${OUT}/portrait-m18-armor.png`, clip: { x: 0, y: 0, width: 340, height: 240 } })

// ─────────────────────────────────────────────────────────────
log('')
log('=== C. 폴백 체인 (resolveMonarchPortrait) ===')
const src = (g, a, o) => page.evaluate(([gg, aa, oo]) => window.__queeningAi.portraitSrc(gg, aa, oo), [g, a, o])
const c1 = await src('male', 11, 'debut')
log('C1 ★ debut 는 16세만 → 다른 나이는 casual:', c1?.thumbSrc.split('/').pop(),
  ok(c1?.thumbSrc.includes('monarch_m_casual_11.png')))
const c2 = await src('male', 16, 'debut')
log('C2 ★ debut 16세는 그대로:', c2?.thumbSrc.split('/').pop(),
  ok(c2?.thumbSrc.includes('monarch_m_debut_16.png')))
const c3 = await src('female', 25, 'casual')
log('C3 ★ 나이 범위 밖 → clamp(20):', c3?.thumbSrc.split('/').pop(),
  ok(c3?.thumbSrc.includes('monarch_f_casual_20.png')))
const c4 = await src('male', 14, 'nonexistent')
log('C4 ★ 없는 착장 → fallbackOutfit(casual):', c4?.thumbSrc.split('/').pop(),
  ok(c4?.thumbSrc.includes('monarch_m_casual_14.png')))
const c5 = await src('male', 9, 'casual')
log('C5 ★ 나이 하한 clamp(11):', c5?.thumbSrc.split('/').pop(),
  ok(c5?.thumbSrc.includes('monarch_m_casual_11.png')))
log('C6 thumb=크롭본 / full=원본 경로 분리:',
  ok(c2?.thumbSrc.includes('/portraits/') && !c2?.fullSrc.includes('/portraits/')))

// ─────────────────────────────────────────────────────────────
log('')
log('=== D. 하위호환 — portraits 없는 옛 매니페스트 ===')
const legacy = await page.evaluate(() => window.__queeningAi.validateManifest({
  version: 1,
  outfits: [{ id: 'casual', name: '사복', thumbSrc: '/x/thumb.svg', fullSrc: '/x/full.svg' }],
}))
log('D1 ★ 축 없는 옛 매니페스트도 로드됨:',
  ok(legacy.manifest !== null && legacy.manifest.outfits.length === 1))
log('D2 ★ portraits 섹션 없음(단일 이미지 폴백):',
  ok(legacy.manifest && legacy.manifest.portraits === undefined))
// 깨진 portraits 는 조용히 버려지고 나머지는 산다.
const partial = await page.evaluate(() => window.__queeningAi.validateManifest({
  version: 2,
  outfits: [{ id: 'casual', name: '사복', thumbSrc: '/x/t.png', fullSrc: '/x/f.png' }],
  portraits: { thumbBase: '/x' },
}))
log('D3 ★ 깨진 portraits 는 버리고 매니페스트는 유지:',
  ok(partial.manifest !== null && partial.manifest.portraits === undefined))

// ─────────────────────────────────────────────────────────────
log('')
log('=== E. 확대 모달 = 전신 원본 ===')
await setGame({ monarchGender: 'male', age: 14, currentOutfitId: 'casual' })
await page.waitForTimeout(200)
await page.getByRole('button', { name: /군주 초상/ }).click()
await page.waitForTimeout(300)
const modalImg = await page.evaluate(() => {
  const img = document.querySelector('[role="dialog"][aria-label="군주 초상"] img')
  return { src: img?.getAttribute('src') ?? '', w: img?.naturalWidth ?? 0 }
})
log('E1 ★ 모달은 전신 원본(크롭 아님):', modalImg.src.split('/').slice(-2).join('/'),
  ok(modalImg.src.includes('/monarch/male/monarch_m_casual_14.png') && !modalImg.src.includes('/portraits/')))
log('E2 ★ 원본 로드됨:', `${modalImg.w}px`, ok(modalImg.w > 0))
await page.screenshot({ path: `${OUT}/modal-fullbody.png` })
await page.keyboard.press('Escape')
await page.waitForTimeout(200)

// ─────────────────────────────────────────────────────────────
log('')
log('=== F. 반응형 375px ===')
const mp = await browser.newPage({ viewport: { width: 375, height: 812 } })
await mp.goto(APP_URL, { waitUntil: 'networkidle' })
await enterGame(mp)
await mp.waitForTimeout(300)
const of = await mp.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
log('F1 375px 오버플로 없음:', ok(of.sw <= of.iw))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
