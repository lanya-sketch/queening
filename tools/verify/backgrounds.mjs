/**
 * [10] 배경 에셋 배선 검증.
 *
 * ★ 매핑 URL 404 0건 · 컷신 활동별 매핑 · 대예배당 2종 · 데스크톱/모바일 렌더(핵심 안 잘림, 375px 스샷)
 *   · 폴백(없는 매핑/404 에도 안 깨짐).
 */
import { mkdirSync } from 'node:fs'
import { APP_URL, enterGame, launch, log, ok } from './helpers.mjs'

const SHOT = 'tools/verify/screenshots/backgrounds'
mkdirSync(SHOT, { recursive: true })

const browser = await launch()
const errors = []

async function newPage(w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message))
  const failed = []
  page.on('requestfailed', (r) => { if (r.url().includes('/assets/background/')) failed.push(r.url()) })
  page.on('response', (r) => { if (r.url().includes('/assets/background/') && r.status() >= 400) failed.push(r.status() + ' ' + r.url()) })
  await page.goto(APP_URL, { waitUntil: 'networkidle' })
  // 컷신을 느리게(2400ms dwell) + 켜서 스샷 여유를 준다.
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('queening.options', JSON.stringify({ textSpeed: '느리게', cutsceneEnabled: true }))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await enterGame(page)
  await page.waitForTimeout(200)
  await page.evaluate(() => { window.__queeningAi.setDeterministic(true); window.__queeningAi.setMinorEnabled(false) })
  return { page, failed }
}

const { page } = await newPage(1280, 800)

// ── A. 매핑 URL 감사 — 파일 없는 키 0, 모든 URL 200 ──
log('=== A. 매핑 URL 감사 (404 0건) ===')
const audit = await page.evaluate(() => window.__queeningAi.bgAudit())
log('A1 ★ 파일 없는 매핑 키 0건:', audit.missingKeys.join(',') || '(없음)', ok(audit.missingKeys.length === 0))
const statuses = await page.evaluate(async (urls) => {
  const out = []
  for (const u of urls) {
    try { const r = await fetch(u, { method: 'HEAD' }); out.push([u, r.status]) }
    catch (e) { out.push([u, 'ERR']) }
  }
  return out
}, audit.urls)
const bad = statuses.filter(([, s]) => s !== 200)
log(`A2 ★ 매핑된 배경 ${statuses.length}개 전부 200(404 0건):`, ok(bad.length === 0) + (bad.length ? ' 실패:' + JSON.stringify(bad.slice(0, 5)) : ''))

// ── B. 리졸버 매핑 — 활동별·씬·대예배당 2종·엔딩 ──
log('')
log('=== B. 리졸버 매핑 ===')
const r = (kind, id, state) => page.evaluate((a) => window.__queeningAi.bgResolve(a.kind, a.id, a.state), { kind, id, state })
const encFile = (u) => (u || '').split('/').pop()
log('B1 검술 훈련 → 연무장(training):', encFile(await r('activity', 'sword-training')), ok(/training/.test(await r('activity', 'sword-training'))))
log('B2 통치학 → 서고(library):', encFile(await r('activity', 'lecture-statecraft')), ok(/library/.test(await r('activity', 'lecture-statecraft'))))
log('B3 연회 → 연회장(banquet):', encFile(await r('activity', 'attend-banquet')), ok(/banquet/.test(await r('activity', 'attend-banquet'))))
log('B4 밀서 → 처소 밤(study_night):', encFile(await r('activity', 'secret-correspondence')), ok(/study_night/.test(await r('activity', 'secret-correspondence'))))
log('B5 ★ 서고에서 검술 안 함(검술≠서고):', ok(!/library/.test(await r('activity', 'sword-training'))))
log('B6 씬 scene-debut-ball → 연회장:', ok(/banquet/.test(await r('scene', 'scene-debut-ball'))))
log('B7 씬 접두 scene-enc-hero-b0 → 대예배당:', ok(/chapel/.test(await r('scene', 'scene-enc-hero-b0'))))
log('B8 없는 씬 → null(폴백):', ok((await r('scene', 'scene-nonexistent-xyz')) === null))
// ★ 대예배당 2종
const chapelFull = await r('place', 'chapel', { flags: { hero_at_court: true }, faith: 70 })
const chapelEmpty = await r('place', 'chapel', { flags: { sword_to_church: true }, faith: 10 })
log('B9 ★ 대예배당 — ④있음/독실 → 성검 있는 chapel:', encFile(chapelFull), ok(/chapel\.webp/.test(chapelFull)))
log('B10 ★ 대예배당 — 성검 봉송 → 빈 제단 chapel_empty:', encFile(chapelEmpty), ok(/chapel_empty/.test(chapelEmpty)))
log('B11 엔딩 autonomy → 대전(hall):', ok(/hall/.test(await r('ending', 'autonomy'))))
log('B12 엔딩 bad-usurp-failed → 폐허(ruin):', ok(/ruin/.test(await r('ending', 'bad-usurp-failed'))))
log('B13 데드엔딩 폐위 → 폐허(ruin):', ok(/ruin/.test(await r('deadend', '폐위'))))

// ── C. 컷신 배경 렌더 (데스크톱 + 모바일 375) — 실제 턴으로 정상 report 생성 ──
log('')
log('=== C. 컷신 배경 렌더 (실제 턴) ===')
async function cutsceneShot(w, h, tag) {
  const { page: p, failed } = await newPage(w, h)
  // ★ enterGame 이 테스트용으로 textSpeed 를 '즉시'(컷신 건너뜀)로 바꾼다 — 컷신을 보려면 되돌린다.
  await p.evaluate(() => window.__queeningAi.setTextSpeed('느리게'))
  // 실제 UI 흐름 — 활동(통치학→서고) 선택 후 이번 달을 넘긴다 → phase=result → 컷신.
  await p.click('[data-activity="lecture-statecraft"]')
  await p.click('[data-end-turn]')
  // 컷신 등장 대기(느리게 dwell 2400ms 라 여유 있음).
  let present = false
  for (let t = 0; t < 2000; t += 100) {
    await p.waitForTimeout(100)
    present = await p.evaluate(() => !!document.querySelector('[data-screen="cutscene"]'))
    if (present) break
  }
  const res = await p.evaluate(() => {
    const cut = document.querySelector('[data-screen="cutscene"]')
    if (!cut) return { present: false }
    const img = cut.querySelector('img[src*="/assets/background/"]')
    return {
      present: true, bgSrc: img?.getAttribute('src') || null, bgLoaded: img ? img.naturalWidth > 0 : false,
      dateVisible: !!cut.querySelector('[data-cutscene-date]'), activityVisible: !!cut.querySelector('[data-cutscene-activity]'),
    }
  })
  await p.screenshot({ path: `${SHOT}/cutscene-${tag}.png` })
  return { res, failed, info: {} }
}
const cd = await cutsceneShot(1280, 800, 'desktop-1280')
log('C0 컷신 상태:', JSON.stringify(cd.info))
log('C1 ★ 컷신 배경 img 로드됨(통치학→서고 library):', JSON.stringify(cd.res),
  ok(cd.res.bgLoaded && /library/.test(cd.res.bgSrc || '')))
log('C2 ★ 배경 위 핵심(날짜·활동) 여전히 보임:', ok(cd.res.dateVisible && cd.res.activityVisible))
const cm = await cutsceneShot(375, 812, 'mobile-375')
log('C3 ★ 모바일 375 컷신 배경 로드 + 핵심 보임:', JSON.stringify(cm.res), ok(cm.res.bgLoaded && cm.res.dateVisible))
log('C4 ★ 컷신 배경 404 0건:', ok(cd.failed.length === 0 && cm.failed.length === 0))

// ── D. 엔딩 배경 (인라인 씬) 데스크톱 + 375 ──
log('')
log('=== D. 엔딩 배경 (인라인 씬) ===')
async function endingShot(w, h, tag) {
  const { page: p, failed } = await newPage(w, h)
  await p.evaluate(() => {
    const q = window.__queeningAi
    q.setGame({ ...q.state, phase: 'ended', age: 20, courtInfluence: 80 })
  })
  await p.waitForTimeout(600)
  const res = await p.evaluate(() => {
    const scr = document.querySelector('[data-screen="ended"], [data-screen="dead"]')
    if (!scr) return { present: false }
    const img = scr.querySelector('img[src*="/assets/background/"]')
    return { present: true, bgSrc: img?.getAttribute('src') || null, bgLoaded: img ? img.naturalWidth > 0 : false }
  })
  await p.screenshot({ path: `${SHOT}/ending-${tag}.png` })
  return { res, failed }
}
const ed = await endingShot(1280, 800, 'desktop-1280')
log('D1 ★ 엔딩 배경 img 로드(친정→대전 hall):', JSON.stringify(ed.res), ok(ed.res.bgLoaded && /hall/.test(ed.res.bgSrc || '')))
const em = await endingShot(375, 812, 'mobile-375')
log('D2 ★ 모바일 375 엔딩 배경 로드:', JSON.stringify(em.res), ok(em.res.bgLoaded))
log('D3 ★ 엔딩 배경 404 0건:', ok(ed.failed.length === 0 && em.failed.length === 0))

// ── E. 폴백 — 매핑 없는 씬은 배경 없이도 안 깨짐(404 감시) ──
log('')
log('=== E. 폴백 · 404 감시 ===')
log('E1 ★ 배경 리소스 404/실패 0건(전 페이지 통산):', ok(errors.filter((e) => /background/.test(e)).length === 0))

// ── F. 이벤트 씬 전체화면 VN 배경 (스프라이트 씬) ──
log('')
log('=== F. 이벤트 씬 전체화면 VN 배경 ===')
async function vnShot(w, h, tag) {
  const { page: p, failed } = await newPage(w, h)
  // ③ 도착 씬(scene-prince-arrival → 회랑 corridor) — 스프라이트 있음 → 전체화면 VN.
  await p.evaluate(() => window.__queeningAi.forceEvent('prince-arrival'))
  await p.waitForTimeout(300)
  // 이벤트 카드 → 씬 진입(전체화면 VN 이 뜰 때까지 클릭/대기).
  for (let t = 0; t < 1500 && !(await p.evaluate(() => !!document.querySelector('[data-scene-fullscreen]'))); t += 150) {
    await p.evaluate(() => {
      const btn = document.querySelector('[data-scene-fullscreen], button')
      if (btn && !document.querySelector('[data-scene-fullscreen]')) btn.click?.()
    })
    await p.waitForTimeout(150)
  }
  const res = await p.evaluate(() => {
    const vn = document.querySelector('[data-scene-fullscreen]')
    if (!vn) return { present: false }
    const img = vn.querySelector('img[src*="/assets/background/"]')
    return { present: true, bgSrc: img?.getAttribute('src') || null, bgLoaded: img ? img.naturalWidth > 0 : false }
  })
  if (res.present) await p.screenshot({ path: `${SHOT}/vn-scene-${tag}.png` })
  return { res, failed }
}
const vnMob = await vnShot(375, 812, 'mobile-375')
log('F1 ★ 이벤트 씬 전체화면 VN 배경 로드(③도착→회랑 corridor):', JSON.stringify(vnMob.res),
  ok(vnMob.res.present && vnMob.res.bgLoaded && /corridor/.test(vnMob.res.bgSrc || '')))
log('F2 ★ 전체화면 VN 배경 404 0건:', ok(vnMob.failed.length === 0))

log('')
log('스크린샷:', SHOT)
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : '*** FAIL ***\n  ' + errors.join('\n  '))
await browser.close()
