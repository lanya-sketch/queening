// M2b-1 AI 인프라 검증.
//
// 핵심은 CORS/헤더 확인이다. 일부러 잘못된 키로 호출해서
//   "키가 거부되었습니다"(401 도달) → 브라우저 직접 호출 경로가 열려 있음
//   "연결에 실패했습니다"(CORS/네트워크) → 헤더 또는 설정 문제
// 를 구분한다. 유효한 키는 필요 없고, 어떤 비밀도 쓰지 않는다.
import {
  APP_URL, enterGame, launch, log, ok, openAiSettings, overflow, readAiSettingLabel, shotsDir,
} from './helpers.mjs'

const OUT = shotsDir('ai-infra')
const FAKE_KEY = 'sk-ant-api03-not-a-real-key-0000000000000000000000000000'

const browser = await launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(300)

log('=== A. 키 없이도 코어 게임이 완전한가 ===')
log('A1 스케줄 화면 정상:', ok(await page.getByText('활동 선택').isVisible()))
// D-3: AI 설정은 게임 화면 ⚙(설정) 오버레이 안으로 옮겨졌다.
log('A2 AI 설정 상태(설정 오버레이):', (await readAiSettingLabel(page)),
  ok((await readAiSettingLabel(page)).includes('꺼짐')))
await page.getByRole('button', { name: /턴 종료/ }).click()
await page.waitForTimeout(250)
log('A3 키 없이 턴 진행됨:', ok(await page.getByText('수행한 활동').isVisible()))
await page.getByRole('button', { name: /다음 달로|무슨 일이/ }).click()
await page.waitForTimeout(200)

log('')
log('=== B. 설정 화면 ===')
const dialog = await openAiSettings(page)
log('B1 모달 열림:', ok(await dialog.isVisible()))
log('B2 공용 PC 경고 노출:',
  ok(await dialog.getByText('공용 PC나 남의 기기에서는 키를 넣지 마세요').isVisible()))
log('B3 역할 경계 안내 노출:',
  ok(await dialog.getByText(/코드가 상한선까지/).isVisible()))
log('B4 키 입력이 기본 마스킹:',
  ok((await dialog.locator('input').first().getAttribute('type')) === 'password'))
log('B5 가로 오버플로:', JSON.stringify(await overflow(page)))
await page.screenshot({ path: `${OUT}/01-settings.png`, fullPage: false })

log('')
log('=== C. 키 형식 경고 · 저장 · 삭제 ===')
await dialog.locator('input').first().fill('완전히-엉뚱한-값')
await page.waitForTimeout(200)
log('C1 형식이 다르면 경고:',
  ok(await dialog.getByText('이 제공자의 키 형식과 다릅니다').isVisible()))

await dialog.locator('input').first().fill(FAKE_KEY)
await page.waitForTimeout(200)
log('C2 올바른 형식이면 경고 사라짐:',
  ok(!(await dialog.getByText('이 제공자의 키 형식과 다릅니다').isVisible().catch(() => false))))

await dialog.getByRole('button', { name: '설정 저장' }).click()
await page.waitForTimeout(250)
const storedKey = await page.evaluate(() => localStorage.getItem('queening.ai.key.anthropic'))
log('C3 localStorage 에 저장:', ok(storedKey === FAKE_KEY))
const gameSave = await page.evaluate(() => localStorage.getItem('queening.save'))
log('C4 게임 세이브와 분리 (세이브에 키 없음):',
  ok(gameSave === null || !gameSave.includes('sk-ant')))

await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(400)
log('C5 새로고침 후에도 유지:', ok((await readAiSettingLabel(page)).includes('켜짐')))

log('')
log('=== D. ★ 브라우저 직접 호출 (CORS/헤더) ===')
const d2 = await openAiSettings(page)
await d2.getByRole('button', { name: /연결 테스트/ }).click()
// 실제 네트워크 왕복이 있으므로 넉넉히 기다린다
await page.waitForFunction(
  () => !document.body.innerText.includes('확인 중…'),
  { timeout: 30000 },
).catch(() => {})
await page.waitForTimeout(500)

const resultText = await d2.innerText()
const reachedApi = resultText.includes('키가 거부되었습니다')
const corsFailed = resultText.includes('연결에 실패했습니다')
log('D1 응답 메시지:', resultText.split('\n').filter((l) => /거부|실패|연결됨|한도|오류/.test(l)).join(' | '))
log('D2 API 까지 도달 (401 = CORS·헤더 정상):', ok(reachedApi))
if (corsFailed) log('    ※ CORS 또는 헤더 문제로 보인다 — dangerouslyAllowBrowser / 직접호출 헤더 확인 필요')
await page.screenshot({ path: `${OUT}/02-connection-test.png`, fullPage: false })

log('')
log('=== E. 키 삭제 ===')
await d2.getByRole('button', { name: '키 삭제' }).click()
await page.waitForTimeout(300)
const afterClear = await page.evaluate(() => localStorage.getItem('queening.ai.key.anthropic'))
log('E1 localStorage 에서 제거:', ok(afterClear === null))
await page.keyboard.press('Escape')
await page.waitForTimeout(250)
log('E2 Esc 로 닫힘:',
  ok(!(await page.getByRole('dialog', { name: 'AI 설정' }).isVisible().catch(() => false))))
log('E3 삭제 후 AI 꺼짐 표시:', ok((await readAiSettingLabel(page)).includes('꺼짐')))

log('')
log('=== F. 모바일 375px ===')
const mctx = await browser.newContext({ viewport: { width: 375, height: 812 } })
const mpage = await mctx.newPage()
await mpage.goto(APP_URL, { waitUntil: 'networkidle' })
await enterGame(mpage)
await mpage.waitForTimeout(300)
await openAiSettings(mpage)
log('F1 모달 열림:', ok(await mpage.getByRole('dialog', { name: 'AI 설정' }).isVisible()))
log('F2 375px 오버플로:', JSON.stringify(await overflow(mpage)))
const btn = await mpage.getByRole('button', { name: '연결 테스트' }).boundingBox()
log('F3 버튼 터치 타깃 ≥44px:', Math.round(btn.height), ok(btn.height >= 44))
await mpage.screenshot({ path: `${OUT}/03-settings-mobile.png`, fullPage: false })

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
