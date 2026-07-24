// 검증 스크립트 공통 유틸.
// 브라우저는 시스템에 이미 설치된 Chrome/Edge 를 쓴다 (playwright-core 는 브라우저를 내려받지 않는다).
import { chromium } from 'playwright-core'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

export const APP_URL = process.env.QUEENING_URL ?? 'http://localhost:5173/'

const CHROME_CANDIDATES = [
  process.env.QUEENING_CHROME,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  `${process.env.LOCALAPPDATA ?? ''}\\Google\\Chrome\\Application\\chrome.exe`,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)

export function findChrome() {
  const found = CHROME_CANDIDATES.find((p) => existsSync(p))
  if (!found) {
    throw new Error(
      '설치된 Chrome/Edge 를 찾지 못했습니다. QUEENING_CHROME 환경변수로 실행 파일 경로를 지정하세요.',
    )
  }
  return found
}

/** 개발 서버가 떠 있지 않으면 친절한 안내와 함께 중단한다. */
export async function assertServer() {
  try {
    const res = await fetch(APP_URL, { method: 'GET' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  } catch (e) {
    console.error(`개발 서버에 접속하지 못했습니다: ${APP_URL}`)
    console.error('다른 터미널에서 "npm run dev" 를 먼저 실행하세요.')
    console.error(`(원인: ${e instanceof Error ? e.message : e})`)
    process.exit(1)
  }
}

export function shotsDir(name) {
  const dir = join(HERE, 'screenshots', name)
  mkdirSync(dir, { recursive: true })
  return dir
}

/** 외부 서체 CDN. 검증은 여기에 매달릴 이유가 없다. */
const FONT_HOSTS = [
  '**://fonts.googleapis.com/**',
  '**://fonts.gstatic.com/**',
  '**://cdn.jsdelivr.net/**',
]

/**
 * ★ 검증 실행에서는 서체 CDN 을 끊는다 (UI 리디자인 후속).
 *
 *   index.html 이 Pretendard·Cinzel·Gowun Batang 을 CDN 에서 싣는데, Pretendard 는
 *   woff 폴백을 여럿 물어오고 그중 일부가 끝나지 않는다. 스위트 대부분이
 *   `waitUntil: 'networkidle'` 로 기다리므로, 26종을 몰아 돌리면 그 대기가 30초를 넘겨
 *   **크래시**한다(ai-talk B 절에서 실제로 터졌다).
 *
 *   폰트는 게임의 겉모습이지 검증 대상이 아니다 — 끊으면 대기가 결정론적으로 끝난다.
 *   ★ 단, 실제 화면을 눈으로 보는 스크린샷 도구는 서체가 살아야 하므로
 *     `QUEENING_KEEP_FONTS=1` 로 이 차단을 끈다(redesign-shots 가 그렇게 쓴다).
 */
export async function launch() {
  await assertServer()
  const browser = await chromium.launch({ executablePath: findChrome(), headless: true })
  if (process.env.QUEENING_KEEP_FONTS === '1') return browser

  /*
   * ★ abort 가 아니라 **빈 CSS 로 응답**한다.
   *   abort 하면 콘솔에 net::ERR_FAILED 가 남아, 콘솔 에러를 모으는 스위트(regression)가
   *   그걸 진짜 오류로 보고한다 — 잡음을 만들면서 신호를 가린다.
   *   빈 스타일시트를 주면 @font-face 자체가 없으니 폰트 파일 요청도 따라오지 않는다.
   */
  const blockFonts = async (target) => {
    for (const pattern of FONT_HOSTS) {
      await target
        .route(pattern, (route) =>
          route.fulfill({ status: 200, contentType: 'text/css; charset=utf-8', body: '' }))
        .catch(() => {})
    }
  }
  const newPage = browser.newPage.bind(browser)
  const newContext = browser.newContext.bind(browser)
  browser.newPage = async (...args) => {
    const page = await newPage(...args)
    await blockFonts(page)
    return page
  }
  browser.newContext = async (...args) => {
    const ctx = await newContext(...args)
    await blockFonts(ctx)
    return ctx
  }
  return browser
}

/**
 * 현재 세이브 버전. 콘텐츠 라운드마다 오르므로 각 스크립트에 숫자를 박지 말고
 * 여기서 가져다 쓴다 — 예전에 일괄 치환으로 "캐릭터 5인" 같은 무관한 단언까지
 * 함께 깨뜨린 적이 있어서, 버전만 한 곳에 모아 둔다.
 * (src/data/config.ts 의 GAME_CONFIG.saveVersion 과 맞춰야 한다)
 */
export const SAVE_VERSION = 7

/**
 * 실제 AI 엔드포인트로 나가는 요청을 전부 막는다.
 *
 * ★ 네트워크를 쓰지 않는 검증인데 키를 설정하는 스크립트가 여럿 있다.
 *   그런 스크립트에서 AI 기능이 하나라도 자동 실행되면 **진짜 호출이 나가고,
 *   실제 키가 설정된 환경이면 과금까지 된다.** 실제로 verify:devices 가
 *   돌발 현안 도입 후 401 을 내면서 이 구멍이 드러났다.
 *
 * 돌려주는 함수를 호출하면 그동안 차단된 요청 수를 알려준다 —
 * "나갈 뻔했다"는 사실 자체를 단언할 수 있도록.
 */
export async function blockAiNetwork(page) {
  const blocked = []
  for (const pattern of ['**/v1/messages', '**/chat/completions', '**/v1/chat/**']) {
    await page.route(pattern, (route) => {
      blocked.push(route.request().url())
      return route.abort('blockedbyclient')
    })
  }
  return () => blocked
}

/**
 * 타이틀 화면을 건너뛰고 게임으로 진입한다 (D-1 이후).
 *
 * 앱이 이제 타이틀에서 시작하므로, UI 를 직접 플레이하는 스위트는 이걸 호출해야
 * 게임 화면(활동 선택 등)에 닿는다. setGame 을 쓰는 스위트는 그게 자동 진입시키므로
 * 별도 호출이 필요 없다.
 */
export async function enterGame(page) {
  // sessionStorage 플래그를 심어, 이후 reload(localStorage.clear 동반)에도 타이틀에
  // 다시 막히지 않게 한다. 그리고 지금 화면도 즉시 게임으로 넘긴다.
  await page.evaluate(() => {
    try {
      sessionStorage.setItem('queening.enterGame', '1')
    } catch {
      /* 무시 */
    }
    window.__queeningAi?.enterGame()
    // ★ 월 단위 전환 2단계: 소소 채널은 기본 OFF 로 격리한다 — 다른 시스템을 검증하는
    //   스위트에 일상 소소가 끼어들지 않도록. 밀도/데드엔딩은 verify:stage2 가, 미스터리
    //   무손상(소소 켠 채)은 simulate/ablation 이 명시적으로 켜서 본다.
    window.__queeningAi?.setMinorEnabled?.(false)
    // ★ D-3: 씬 내용 검증 스위트는 타이핑 없이(즉시) 진행한다 — 클릭 한 번이 다음 줄로.
    //   타이핑 자체는 verify:options 가 속도를 명시해 따로 본다.
    window.__queeningAi?.setTextSpeed?.('즉시')
  })
  await page.waitForTimeout(120)
}

export const ok = (b) => (b ? 'PASS' : '*** FAIL ***')
export const log = (...a) => console.log(...a)

/**
 * AI 설정 접근 (D-3): 게임 화면의 AI 버튼이 설정 오버레이로 옮겨졌다.
 * 게임 중 ⚙(설정) → 'AI 설정' 을 눌러 모달을 연다.
 */
export async function openSettingsOverlay(page) {
  // 게임 중이면 ⚙, 타이틀이면 '설정' 버튼으로 설정 오버레이를 연다.
  const gear = page.locator('[data-settings-button]').first()
  if (await gear.isVisible().catch(() => false)) {
    await gear.click()
  } else {
    await page.getByRole('button', { name: '설정' }).first().click()
  }
  await page.waitForTimeout(150)
}

export async function openAiSettings(page) {
  await openSettingsOverlay(page)
  await page.getByRole('button', { name: /AI 설정/ }).click()
  await page.waitForTimeout(200)
  return page.getByRole('dialog', { name: 'AI 설정' })
}

/** 설정 오버레이의 'AI 설정 · 켜짐/꺼짐' 버튼 라벨을 읽는다(모달은 안 연다). 읽고 설정을 닫는다. */
export async function readAiSettingLabel(page) {
  await page.locator('[data-settings-button]').first().click()
  await page.waitForTimeout(150)
  const label = await page.getByRole('button', { name: /AI 설정/ }).innerText()
  await page.getByRole('button', { name: '닫기' }).first().click()
  await page.waitForTimeout(150)
  return label
}

/**
 * 인트로 시퀀스(D-3)를 통과해 온보딩까지 간다. '새 게임' 클릭 뒤에 호출한다.
 * 선왕 배경 narration 을 건너뛰고 성별을 고른 뒤 '시작한다'.
 */
export async function passIntro(page, gender = 'male') {
  const skip = page.getByRole('button', { name: '건너뛰기' })
  if (await skip.isVisible().catch(() => false)) await skip.click()
  await page.waitForTimeout(200)
  const label = gender === 'female' ? /여왕이 될 소녀/ : /왕이 될 소년/
  const pick = page.getByRole('button', { name: label })
  if (await pick.isVisible().catch(() => false)) await pick.click()
  await page.waitForTimeout(150)
  const start = page.getByRole('button', { name: '시작한다' })
  if (await start.isVisible().catch(() => false)) await start.click()
  await page.waitForTimeout(250)
}

// ---- 화면 조작 공통 ----

/**
 * ★ 하네스 훅 (UI 리디자인 1단계).
 *
 * 여태 검증이 화면 구조(`ul.grid`, `aside div.flex.items-baseline`, `article h1`)와
 * 화면 문구("활동 선택")를 셀렉터로 삼아, 디자인을 손댈 때마다 스위트가 통째로 막혔다
 * (D-1 타이틀 추가 때가 그랬다). 이제는 `data-*` 속성만 본다 —
 * 디자인이 바뀌어도 속성이 남아 있는 한 안 깨진다.
 *
 * 대응표
 *   data-screen="schedule|result|event|ended|dead"  화면 판별
 *   data-gauge=<key> data-value=<정확값> data-band=<라벨>  게이지
 *   data-activity=<id> data-tier=<등급> data-selected  활동 카드
 *   data-plan-chip=<id> / data-end-turn                계획 칩 · 턴 종료
 *   data-panel-date / data-panel-age                   사이드바 날짜·나이
 */

/** 활동 카드 — 이름으로 찾되 카드 영역(data-activity)으로 한정한다. */
export const card = (p, name) =>
  p.locator('[data-activity]').filter({ hasText: new RegExp(name) })

/**
 * ★ 활동 카드 클릭 — **확인하고 누르는 사이의 경쟁**을 견딘다.
 *
 *   `isEnabled()` 로 확인한 직후 앞선 클릭의 리렌더가 AP 를 소진시켜 카드가 비활성으로
 *   바뀌면, 이어지는 click 은 "visible, enabled and stable" 을 기다리다 30초 뒤에 죽는다.
 *   리디자인으로 카드에 트랜지션이 붙으면서 그 창이 넓어져 실제로 ablation 이 그렇게 죽었다.
 *
 *   계획은 어차피 최선 노력이라(못 고르면 건너뛴다), 짧은 시한을 주고 실패하면 넘어간다.
 *   30초를 기다리다 스위트를 죽이는 것보다 그 칸 하나를 빠뜨리는 편이 낫다.
 */
export async function clickCard(page, name) {
  const c = page.locator('[data-activity]').filter({ hasText: new RegExp(name) })
  if (!(await c.isEnabled().catch(() => false))) return false
  /*
   * ★ force:true — 안정성(actionability) 대기를 건너뛴다.
   *   카드에 transition-transform 이 걸려 있어 Playwright 의 "stable" 판정이 끝나지 않는다
   *   (막 리렌더된 카드는 늘 미세하게 움직이는 중이라 3초 시한도 못 채운다).
   *   우리는 방금 isEnabled 로 눌러도 되는지 확인했으니 안정성 대기는 불필요하다 —
   *   force 로 즉시 누른다. 이게 ablation 이 스윕에서만 죽던 진짜 원인이었다.
   */
  return c.click({ force: true, timeout: 3000 }).then(() => true).catch(() => false)
}

/** 활동 카드 — id 로 정확히 집는다(이름이 바뀌어도 안 깨진다). 새 검증은 이쪽을 쓸 것. */
export const cardById = (p, id) => p.locator(`[data-activity="${id}"]`)

/** 그 카드의 현재 수업 등급(초급/중급/고급). 등급이 없으면 ''. */
export const cardTier = (p, id) =>
  p.locator(`[data-activity="${id}"]`).getAttribute('data-tier')

export const portrait = (p) => p.getByRole('button', { name: /군주 초상/ })

export const dateText = (p) => p.locator('[data-panel-date]').first().innerText()

export const overflow = (p) =>
  p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))

/**
 * 좌측 패널에서 지표 하나를 읽는다(한글 라벨로).
 *
 * ★ 화면에는 이제 수치가 없다 — 질적 라벨("저울이 맞음")만 보인다. 정확한 값은
 *   data-value 에 있으므로 거기서 읽는다. **단언의 뜻은 그대로 두고 탐침만 옮긴 것**이다
 *   (durability A3·bloodoath 탐침 때와 같은 원칙).
 */
const GAUGE_KEY_BY_LABEL = {
  통치학: 'statecraft', 재정: 'finance', 변론: 'rhetoric', 무예: 'martial', 궁정처세: 'courtcraft',
  '국정 영향도': 'courtInfluence', 심신: 'wellbeing', 신뢰: 'tutorTrust',
  '섭정 신망': 'regentRapport', '섭정 의심': 'regentSuspicion', 행동력: 'actionPoints',
}

export const readGauge = (p, label) =>
  p.evaluate(([want, map]) => {
    const key = map[want] ?? want
    const el = document.querySelector(`[data-gauge="${key}"]`)
    if (!el) return null
    return Math.round(parseFloat(el.getAttribute('data-value')))
  }, [label, GAUGE_KEY_BY_LABEL])

/** 그 지표의 **질적 라벨**(구간 이름). 표시 방식 자체를 검증할 때 쓴다. */
export const readBand = (p, label) =>
  p.evaluate(([want, map]) => {
    const key = map[want] ?? want
    return document.querySelector(`[data-gauge="${key}"]`)?.getAttribute('data-band') ?? null
  }, [label, GAUGE_KEY_BY_LABEL])

/** 패널 전체(스탯 + 지표)와 날짜·나이를 한 번에 읽는다. 키는 예전처럼 한글 라벨. */
export const readPanel = (p) =>
  p.evaluate((map) => {
    const inv = Object.fromEntries(Object.entries(map).map(([ko, key]) => [key, ko]))
    const out = {}
    const bands = {}
    document.querySelectorAll('[data-gauge]').forEach((el) => {
      const key = el.getAttribute('data-gauge')
      const label = inv[key] ?? key
      const v = parseFloat(el.getAttribute('data-value'))
      if (!Number.isNaN(v)) out[label] = Math.round(v)
      bands[label] = el.getAttribute('data-band')
    })
    const age = document.querySelector('[data-panel-age]')?.textContent ?? ''
    const date = document.querySelector('[data-panel-date]')?.textContent ?? ''
    return { stats: out, bands, age: age.trim(), date: date.trim() }
  }, GAUGE_KEY_BY_LABEL)

/**
 * 현재 화면. 이제 문구가 아니라 data-screen 을 본다 —
 * 화면 글자를 고쳤다고 검증이 "unknown"에 빠지는 일이 없다.
 */
export async function phaseOf(p) {
  const el = p.locator('[data-screen]').first()
  if (await el.isVisible().catch(() => false)) {
    return (await el.getAttribute('data-screen')) ?? 'unknown'
  }
  return 'unknown'
}

/** 이벤트 화면의 선택지 버튼들. 하단 고정 "다음 달로" 바와 구분된다. */
export const choiceButtons = (p) => p.locator('[data-choice]')

/**
 * 대사 씬이 있는 이벤트는 대사를 다 넘겨야 선택지/진행 버튼이 나온다.
 * 씬이 없으면 아무 일도 하지 않는다.
 */
export async function advanceScene(p) {
  // ★ D-3 타이핑: 한 줄에 클릭 두 번(타이핑 중 클릭=줄 완성, 완성 후 클릭=다음 줄)이
  //   필요할 수 있다. 그래서 '다음'을 안 보일 때까지 넉넉히 누른다(각 줄 완성+진행).
  for (let i = 0; i < 50; i++) {
    const next = p.getByRole('button', { name: /^다음$/ })
    if (!(await next.isVisible().catch(() => false))) break
    await next.click()
    await p.waitForTimeout(45)
  }
  // 마지막 줄 버튼은 "계속" — 타이핑 완성 + 종료로 최대 두 번.
  // (이벤트 진행 버튼 "계속 (N건 더)" 와는 정확 매칭으로 구분된다.)
  for (let i = 0; i < 2; i++) {
    const end = p.getByRole('button', { name: /^계속$/ })
    if (!(await end.isVisible().catch(() => false))) break
    await end.click()
    await p.waitForTimeout(45)
  }
}

/** 선택지가 있으면 첫 번째 활성 선택지를 고르고, 계속 버튼을 누른다. */
export async function clearEvent(p) {
  await advanceScene(p)
  const choices = choiceButtons(p)
  const count = await choices.count()
  for (let i = 0; i < count; i++) {
    if (await choices.nth(i).isEnabled()) {
      await choices.nth(i).click()
      await p.waitForTimeout(120)
      break
    }
  }
  await p.getByRole('button', { name: /다음 달로|계속/ }).click()
  await p.waitForTimeout(120)
}
