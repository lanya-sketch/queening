// 제공자 어댑터 동등성 검증.
//
// 핵심 질문: 어댑터가 응답 형식 차이를 흡수해서, 코드가 제공자와 무관하게
// 같은 형태의 델타를 받는가?
//
// 방법: 네트워크를 가로채 "의미는 같고 봉투만 다른" 응답을 두 제공자에 물린다.
//   Anthropic        → { content: [{type:'text', text: <JSON>}] }
//   OpenAI 호환      → { choices: [{message:{content: <JSON>}}] }
// 그리고 clamp 를 통과한 최종 결과가 완전히 일치하는지 비교한다.
// 실제 API 키도 네트워크도 필요 없다.
import { APP_URL, launch, log, ok, shotsDir } from './helpers.mjs'

const OUT = shotsDir('ai-providers')

// 일부러 규칙을 어긴 제안을 섞는다.
//   statecraft 99   → 상한 ±2 로 축소
//   courtInfluence  → 상한 0 (AI 금지) 이므로 제거
//   bogus           → 허용 목록 밖이므로 제거
//   wellbeing -3    → 그대로 통과
const MODEL_JSON = JSON.stringify({
  reply: '왕은 잠시 말이 없었다.',
  deltas: [
    { target: 'statecraft', amount: 99 },
    { target: 'courtInfluence', amount: 5 },
    { target: 'bogus', amount: 1 },
    { target: 'wellbeing', amount: -3 },
  ],
})

const browser = await launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

// --- 가짜 엔드포인트 두 개 ---
await page.route('**/v1/messages', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      model: 'claude-opus-4-8',
      stop_reason: 'end_turn',
      content: [
        // thinking 블록이 앞에 와도 어댑터가 건너뛰는지 함께 본다
        { type: 'thinking', thinking: '' },
        { type: 'text', text: MODEL_JSON },
      ],
      usage: { input_tokens: 11, output_tokens: 22 },
    }),
  }),
)

await page.route('**/chat/completions', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 'chatcmpl_test',
      model: 'some/other-model',
      choices: [
        {
          // 구조화 출력을 무시하고 코드펜스로 감싸 보내는 흔한 경우까지 재현
          message: { role: 'assistant', content: '```json\n' + MODEL_JSON + '\n```' },
        },
      ],
      usage: { prompt_tokens: 33, completion_tokens: 44 },
    }),
  }),
)

await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(300)

log('=== A. 개발 브리지 ===')
const providers = await page.evaluate(() => window.__queeningAi?.providers ?? null)
log('A1 브리지 노출:', ok(Array.isArray(providers)))
log('A2 등록된 제공자:', providers?.join(', '),
  ok(providers?.includes('anthropic') && providers?.includes('openai-compatible')))

async function runWith(providerId, key, model, baseUrl) {
  return page.evaluate(
    async ([id, k, m, b]) => {
      window.__queeningAi.configure(id, k, m, b)
      return window.__queeningAi.send('테스트')
    },
    [providerId, key, model, baseUrl],
  )
}

log('')
log('=== B. Anthropic 어댑터 ===')
const a = await runWith('anthropic', 'sk-ant-fake-key-for-route-interception', 'claude-opus-4-8')
log('B1 대사 수신:', JSON.stringify(a?.reply), ok(a?.reply === '왕은 잠시 말이 없었다.'))
log('B2 통과한 델타:', JSON.stringify(a?.deltas))
log('B3 잘라낸 내역:', a?.rejected?.length, '건')

log('')
log('=== C. OpenAI 호환 어댑터 (코드펜스로 감싼 응답) ===')
const b = await runWith('openai-compatible', 'or-fake-key', 'some/other-model', 'https://example.test/v1')
log('C1 대사 수신:', JSON.stringify(b?.reply), ok(b?.reply === '왕은 잠시 말이 없었다.'))
log('C2 통과한 델타:', JSON.stringify(b?.deltas))
log('C3 잘라낸 내역:', b?.rejected?.length, '건')

log('')
log('=== D. ★ 제공자 무관 동등성 ===')
const sameReply = a?.reply === b?.reply
const sameDeltas = JSON.stringify(a?.deltas) === JSON.stringify(b?.deltas)
const sameRejectCount = a?.rejected?.length === b?.rejected?.length
log('D1 대사 동일:', ok(sameReply))
log('D2 델타 동일:', ok(sameDeltas))
log('D3 거부 건수 동일:', ok(sameRejectCount))

log('')
log('=== E. 클램핑이 제공자와 무관하게 동일 적용 ===')
const deltas = a?.deltas ?? []
const byTarget = Object.fromEntries(deltas.map((d) => [d.target, d.amount]))
log('E1 statecraft 99 → 상한 ±2 로 축소:', byTarget.statecraft, ok(byTarget.statecraft === 2))
log('E2 wellbeing -3 그대로 통과:', byTarget.wellbeing, ok(byTarget.wellbeing === -3))
log('E3 courtInfluence 제거 (AI 금지):', ok(!('courtInfluence' in byTarget)))
log('E4 허용목록 밖 bogus 제거:', ok(!('bogus' in byTarget)))
log('E5 최종 델타 2건만 통과:', deltas.length, ok(deltas.length === 2))

log('')
log('=== F. 설정 UI 에서 제공자·모델 선택 ===')
await page.getByRole('button', { name: /AI 설정/ }).click()
await page.waitForTimeout(250)
const dialog = page.getByRole('dialog', { name: 'AI 설정' })
const options = await dialog.locator('select').first().locator('option').allInnerTexts()
log('F1 제공자 선택지:', options.join(' / '), ok(options.length === 2))
await dialog.locator('select').first().selectOption('openai-compatible')
await page.waitForTimeout(250)
log('F2 OpenAI 호환 선택 시 엔드포인트 입력 노출:',
  ok(await dialog.getByText('엔드포인트').isVisible()))
const modelInput = dialog.locator('input[list="ai-model-options"]')
log('F3 모델 입력이 기본값으로 채워짐:', await modelInput.inputValue(),
  ok((await modelInput.inputValue()).length > 0))
await modelInput.fill('custom/my-local-model')
await dialog.getByRole('button', { name: '설정 저장' }).click()
await page.waitForTimeout(250)
const savedModel = await page.evaluate(() =>
  localStorage.getItem('queening.ai.model.openai-compatible'))
log('F4 제공자별로 모델 저장:', savedModel, ok(savedModel === 'custom/my-local-model'))
await dialog.locator('select').first().selectOption('anthropic')
await page.waitForTimeout(250)
log('F5 제공자 전환 시 그 제공자의 설정으로 복귀:',
  await modelInput.inputValue(), ok((await modelInput.inputValue()).startsWith('claude-')))
log('F6 Anthropic 은 엔드포인트 입력 없음:',
  ok(!(await dialog.getByText('엔드포인트').isVisible().catch(() => false))))
await page.screenshot({ path: `${OUT}/01-provider-settings.png`, fullPage: false })

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
