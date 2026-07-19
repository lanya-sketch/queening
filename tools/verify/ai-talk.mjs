// M2b-2 군주 자율 대화 검증.
//
// ★ 핵심: 대조적인 두 세이브가 실제로 다른 페르소나를 만드는가, 그리고
//   시스템 프롬프트의 인물 묘사에 숫자가 하나도 들어가지 않는가.
//   ("내가 키운 대로 군주가 반응한다" 가 진짜 되는지의 증명)
//
// 네트워크는 전부 가로챈다 — 실제 키도 과금도 없다.
import { APP_URL, launch, log, ok, overflow, shotsDir } from './helpers.mjs'

const OUT = shotsDir('ai-talk')

// 일부러 규칙을 어긴 델타를 섞는다.
//   tutorTrust 9    → 전역 상한 ±3 으로 축소
//   statecraft 3    → 이 화면 허용 목록 밖(대화는 신뢰·심신만)
//   courtInfluence 5 → 전역 금지(상한 0)
const REPLY_BODY = '숙부께서 듣고 계실지도 모릅니다.\n지금은 그 이야기를 하지 않는 편이 좋겠습니다.'
const REPLY_META =
  '<<<META>>>\n{"deltas":[{"target":"tutorTrust","amount":9},{"target":"statecraft","amount":3},{"target":"courtInfluence","amount":5}]}'
const FULL_REPLY = `${REPLY_BODY}\n${REPLY_META}`

/** Anthropic SSE 형식으로 조각내 보낸다. */
function anthropicSse(text) {
  const chunks = text.match(/[\s\S]{1,20}/g) ?? [text]
  const lines = [
    `event: message_start\ndata: ${JSON.stringify({
      type: 'message_start',
      message: {
        id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-opus-4-8',
        content: [], stop_reason: null, stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 0 },
      },
    })}\n\n`,
    `event: content_block_start\ndata: ${JSON.stringify({
      type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' },
    })}\n\n`,
  ]
  for (const c of chunks) {
    lines.push(
      `event: content_block_delta\ndata: ${JSON.stringify({
        type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: c },
      })}\n\n`,
    )
  }
  lines.push(
    `event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: 0 })}\n\n`,
    `event: message_delta\ndata: ${JSON.stringify({
      type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null },
      usage: { output_tokens: 30 },
    })}\n\n`,
    `event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`,
  )
  return lines.join('')
}

/** OpenAI 호환 SSE 형식. */
function openaiSse(text) {
  const chunks = text.match(/[\s\S]{1,20}/g) ?? [text]
  return (
    chunks
      .map((c) => `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`)
      .join('') + 'data: [DONE]\n\n'
  )
}

const browser = await launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

let failNext = null // 'auth' | 'network' | null

await page.route('**/v1/messages', (route) => {
  if (failNext === 'auth') {
    return route.fulfill({
      status: 401, contentType: 'application/json',
      body: JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }),
    })
  }
  if (failNext === 'network') return route.abort('failed')
  return route.fulfill({
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
    body: anthropicSse(FULL_REPLY),
  })
})

await page.route('**/chat/completions', (route) =>
  route.fulfill({
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
    body: openaiSse(FULL_REPLY),
  }),
)

await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(300)

// ─────────────────────────────────────────────────────────────
log('=== A. ★ 캐릭터 시트 — 대조적인 두 군주 ===')

const TIMID = {
  age: 12,
  stats: { statecraft: 18, finance: 8, rhetoric: 12, martial: 6, courtcraft: 9 },
  tutorTrust: 12, wellbeing: 20, regentSuspicion: 15, courtInfluence: 10, regentRapport: 20,
  flags: {},
}
const SOVEREIGN = {
  age: 18,
  stats: { statecraft: 66, finance: 85, rhetoric: 72, martial: 20, courtcraft: 61 },
  tutorTrust: 88, wellbeing: 80, regentSuspicion: 82, courtInfluence: 74, regentRapport: 30,
  flags: { truth_regent_involved: true, house_commons_defended: true, declared_rule: true },
}

const promptFor = (patch) =>
  page.evaluate((p) => {
    window.__queeningAi.setGame(p)
    return window.__queeningAi.prompt()
  }, patch)

const timidPrompt = await promptFor(TIMID)
const sovereignPrompt = await promptFor(SOVEREIGN)

/** 인물 묘사 구간만 잘라낸다(응답 형식 지시에는 "3~5문장" 같은 숫자가 정상적으로 있다). */
function personaSection(prompt) {
  const start = prompt.indexOf('지금 이 왕은:')
  const end = prompt.indexOf('응답 형식:')
  return prompt.slice(start, end === -1 ? undefined : end)
}

const timidPersona = personaSection(timidPrompt)
const sovereignPersona = personaSection(sovereignPrompt)

log('A1 겁먹은 12세 묘사:')
log('   ' + timidPersona.trim().replace(/\n+/g, '\n   '))
log('')
log('A2 실권 쥔 18세 묘사:')
log('   ' + sovereignPersona.trim().replace(/\n+/g, '\n   '))
log('')
log('A3 두 묘사가 실제로 다름:', ok(timidPersona !== sovereignPersona))
log('A4 ★ 인물 묘사에 숫자 없음 (겁먹은 군주):',
  ok(!/\d/.test(timidPersona)))
log('A5 ★ 인물 묘사에 숫자 없음 (실권 군주):',
  ok(!/\d/.test(sovereignPersona)))
log('A6 신뢰 낮음 → "경계" 서술:', ok(timidPersona.includes('경계한다')))
log('A7 신뢰 높음 → "아이로 돌아간다" 서술:',
  ok(sovereignPersona.includes('아이로 돌아간다')))
log('A8 재정 낮음/높음이 갈림:',
  ok(timidPersona.includes('셈에 어둡다') && sovereignPersona.includes('숫자와 실리에 밝다')))
log('A9 의심 높음만 감시 서술:',
  ok(!timidPersona.includes('문 쪽을') && sovereignPersona.includes('문 쪽을')))
log('A10 3층 flag 서술 반영:',
  ok(sovereignPersona.includes('숙부의 손이 닿아 있다') &&
     sovereignPersona.includes('하원을 지켜냈다')))
log('A11 중간값 지표는 묘사에서 빠짐 (무예 20 → 낮음만, 무예 20 서술 있음 확인):',
  ok(sovereignPersona.includes('몸 쓰는 일과 거리가 멀다')))

// ─────────────────────────────────────────────────────────────
log('')
log('=== B. 대화 잠금 ===')
await page.evaluate(() => {
  window.__queeningAi.setGame({ phase: 'schedule' })
  localStorage.setItem('queening.ai.key.anthropic', 'sk-ant-fake-for-route-interception-000')
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(400)
await page.evaluate((p) => window.__queeningAi.setGame(p), TIMID)

const talkButton = page.getByRole('button', { name: '왕과 대화하기' })
log('B1 키가 있으면 대화 버튼 노출:', ok(await talkButton.isVisible()))
log('B2 스케줄 중에는 활성:', ok(await talkButton.isEnabled()))
await page.evaluate(() => window.__queeningAi.setGame({ phase: 'event' }))
await page.waitForTimeout(200)
log('B3 이벤트 씬 중에는 잠김:', ok(await talkButton.isDisabled()))
log('B4 잠금 안내 노출:',
  ok(await page.getByText('지금은 다른 일이 벌어지는 중입니다').isVisible()))
await page.evaluate(() => window.__queeningAi.setGame({ phase: 'schedule' }))
await page.waitForTimeout(200)

// ─────────────────────────────────────────────────────────────
log('')
log('=== C. 스트리밍 · 델타 (Anthropic) ===')
await talkButton.click()
await page.waitForTimeout(300)
const dialog = page.getByRole('dialog', { name: '군주와의 대화' })
log('C1 대화 모달 열림:', ok(await dialog.isVisible()))

const trustBefore = await page.evaluate(() =>
  JSON.parse(JSON.stringify(window.__queeningAi ? 0 : 0)) ||
  Number(document.querySelector('aside')?.innerText.match(/신뢰\s*(\d+)/)?.[1] ?? 0))

await dialog.locator('input').fill('아버님 이야기를 해도 될까요')
await dialog.getByRole('button', { name: '보내기' }).click()

// 스트리밍 도중 스냅샷
await page.waitForTimeout(120)
const midStream = await dialog.innerText()
log('C2 스트리밍 중 화면에 META/JSON 누출 없음:',
  ok(!midStream.includes('<<<META>>>') && !midStream.includes('"deltas"')))

await page.waitForFunction(() => !document.body.innerText.includes('▌'), { timeout: 15000 })
await page.waitForTimeout(300)

const afterText = await dialog.innerText()
log('C3 대사 표시:', ok(afterText.includes('숙부께서 듣고 계실지도 모릅니다')))
log('C4 완료 후에도 META 미노출:',
  ok(!afterText.includes('<<<META>>>') && !afterText.includes('courtInfluence')))
log('C5 신뢰 +3 칩 표시 (9 → 상한 3 으로 축소):', ok(afterText.includes('신뢰 +3')))
log('C6 통치학 칩 없음 (이 화면 허용 목록 밖):', ok(!afterText.includes('통치학')))
log('C7 국정 영향도 칩 없음 (전역 금지):', ok(!afterText.includes('국정 영향도 +')))

const trustAfter = await page.evaluate(() =>
  Number(document.querySelector('aside')?.innerText.match(/신뢰\s*(\d+)/)?.[1] ?? 0))
log(`C8 실제 게임 상태에 반영: 신뢰 ${trustBefore} → ${trustAfter}`,
  ok(trustAfter === trustBefore + 3))
await page.screenshot({ path: `${OUT}/01-talk.png`, fullPage: false })

// ─────────────────────────────────────────────────────────────
log('')
log('=== D. 폴백 (raw 코드 노출 금지) ===')
failNext = 'auth'
await dialog.locator('input').fill('한 번 더')
await dialog.getByRole('button', { name: '보내기' }).click()
await page.waitForTimeout(1200)
const errText = await dialog.innerText()
log('D1 자연어 안내:', ok(errText.includes('API 키를 확인해 주세요')))
log('D2 raw 상태코드 미노출:', ok(!errText.includes('401') && !errText.includes('authentication_error')))
log('D3 재시도 버튼:', ok(await dialog.getByRole('button', { name: '다시 시도' }).isVisible()))
await dialog.getByRole('button', { name: '자세히' }).click()
await page.waitForTimeout(200)
log('D4 「자세히」에는 상세가 있음:', ok((await dialog.innerText()).includes('auth')))

failNext = 'network'
await dialog.getByRole('button', { name: '다시 시도' }).click()
await page.waitForTimeout(1500)
log('D5 네트워크 실패 안내:', ok((await dialog.innerText()).includes('연결을 확인해 주세요')))

failNext = null
await dialog.getByRole('button', { name: '다시 시도' }).click()
await page.waitForFunction(() => !document.body.innerText.includes('▌'), { timeout: 15000 })
await page.waitForTimeout(300)
log('D6 재시도 성공 시 대화 이어짐:',
  ok((await dialog.innerText()).includes('숙부께서 듣고 계실지도')))
await page.screenshot({ path: `${OUT}/02-fallback.png`, fullPage: false })
await page.keyboard.press('Escape')

// ─────────────────────────────────────────────────────────────
log('')
log('=== E. OpenAI 호환 제공자로도 동일 ===')
await page.evaluate(() => {
  localStorage.setItem('queening.ai.provider', 'openai-compatible')
  localStorage.setItem('queening.ai.key.openai-compatible', 'or-fake-key-000')
  localStorage.setItem('queening.ai.baseUrl.openai-compatible', 'https://example.test/v1')
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(400)
await page.evaluate((p) => window.__queeningAi.setGame(p), TIMID)
await page.getByRole('button', { name: '왕과 대화하기' }).click()
await page.waitForTimeout(300)
const d2 = page.getByRole('dialog', { name: '군주와의 대화' })
await d2.locator('input').fill('안녕하십니까')
await d2.getByRole('button', { name: '보내기' }).click()
await page.waitForFunction(() => !document.body.innerText.includes('▌'), { timeout: 15000 })
await page.waitForTimeout(300)
const oaText = await d2.innerText()
log('E1 대사 표시:', ok(oaText.includes('숙부께서 듣고 계실지도 모릅니다')))
log('E2 META 미노출:', ok(!oaText.includes('<<<META>>>')))
log('E3 동일한 클램핑 (신뢰 +3):', ok(oaText.includes('신뢰 +3')))

// ─────────────────────────────────────────────────────────────
log('')
log('=== F. 고급 설정 · 샘플링 안내 ===')
await page.keyboard.press('Escape')
await page.getByRole('button', { name: /AI 설정/ }).click()
await page.waitForTimeout(300)
const settings = page.getByRole('dialog', { name: 'AI 설정' })
await settings.getByText('고급 설정').click()
await page.waitForTimeout(200)
log('F1 비용 영향 항목 노출:',
  ok(await settings.getByText('최대 응답 길이 (max_tokens)').isVisible()))
log('F2 OpenAI 호환은 샘플링 경고 없음:',
  ok(!(await settings.getByText('이 값들을 받지 않습니다').isVisible().catch(() => false))))
await settings.locator('select').first().selectOption('anthropic')
await page.waitForTimeout(300)
log('F3 ★ Claude 최신 모델 선택 시 미지원 안내:',
  ok(await settings.getByText('이 값들을 받지 않습니다').isVisible()))
await settings.locator('input[list="ai-model-options"]').fill('claude-haiku-4-5')
await page.waitForTimeout(300)
log('F4 샘플링 지원 모델로 바꾸면 안내 사라짐:',
  ok(!(await settings.getByText('이 값들을 받지 않습니다').isVisible().catch(() => false))))
log('F5 가로 오버플로:', JSON.stringify(await overflow(page)))
await page.screenshot({ path: `${OUT}/03-advanced.png`, fullPage: false })

// ─────────────────────────────────────────────────────────────
log('')
log('=== G. 세이브 영향 없음 ===')
await page.keyboard.press('Escape')
await page.getByRole('button', { name: '저장', exact: true }).click()
await page.waitForTimeout(300)
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('queening.save')))
log('G1 세이브 버전 4 유지:', saved.version, ok(saved.version === 4))
log('G2 대화 로그가 세이브에 없음:',
  ok(!JSON.stringify(saved).includes('숙부께서 듣고')))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
