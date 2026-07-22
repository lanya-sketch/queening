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

export async function launch() {
  await assertServer()
  return chromium.launch({ executablePath: findChrome(), headless: true })
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

/** 활동 카드 목록(ul.grid)으로 한정 — 상단 "계획" 칩(취소 버튼)과 구분하기 위함. */
export const card = (p, name) =>
  p.locator('ul.grid').getByRole('button', { name: new RegExp(name) })

export const portrait = (p) => p.getByRole('button', { name: /군주 초상/ })

export const dateText = (p) => p.locator('aside p.text-sm.font-semibold').first().innerText()

export const overflow = (p) =>
  p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))

/** 좌측 패널에서 지표 하나를 읽는다. 값 뒤에 "/ 상한" 이 붙을 수 있어 첫 숫자를 취한다. */
export const readGauge = (p, label) =>
  p.evaluate((want) => {
    for (const el of document.querySelectorAll('aside div.flex.items-baseline')) {
      if (el.children[0].textContent.trim() === want) {
        const m = el.children[1].textContent.match(/(\d+)/)
        return m ? parseInt(m[1], 10) : null
      }
    }
    return null
  }, label)

/** 패널 전체(스탯 + 지표)와 날짜·나이를 한 번에 읽는다. */
export const readPanel = (p) =>
  p.evaluate(() => {
    const out = {}
    document.querySelectorAll('aside div.flex.items-baseline').forEach((el) => {
      const label = el.children[0].textContent.trim()
      const m = el.children[1].textContent.match(/(\d+)/)
      if (m) out[label] = parseInt(m[1], 10)
    })
    const age = document.querySelector('aside p.text-xs')?.textContent ?? ''
    const date = document.querySelector('aside p.text-sm.font-semibold')?.textContent ?? ''
    return { stats: out, age: age.trim(), date: date.trim() }
  })

export async function phaseOf(p) {
  if (await p.getByText('활동 선택').isVisible().catch(() => false)) return 'schedule'
  if (await p.getByText('수행한 활동').isVisible().catch(() => false)) return 'result'
  // 이벤트 화면 라벨은 category 에 따라 '사건' 또는 '국정 현안'
  if (await p.getByText(/^(사건|국정 현안)$/).first().isVisible().catch(() => false)) return 'event'
  // 엔딩(M3-2): 먼저 조립 씬("아홉 해의 끝"), 씬을 넘기면 요약("결산"·"세가 되었다").
  if (await p.getByText('아홉 해의 끝').isVisible().catch(() => false)) return 'ended'
  if (await p.getByText(/세가 되었다/).isVisible().catch(() => false)) return 'ended'
  return 'unknown'
}

/** 이벤트 화면의 선택지 버튼들. 하단 고정 "다음 달로" 바와 구분된다. */
export const choiceButtons = (p) => p.locator('div.mt-4.space-y-2 > button')

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
