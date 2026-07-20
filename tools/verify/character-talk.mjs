// M2b-3b-2 캐릭터 대화 검증.
//
// 기본 모드: 네트워크를 가로채 배선을 검증한다(키 불필요).
//   — 프롬프트가 다섯 다 다른가, 호감도/flag 로 지시가 갈리는가,
//     델타가 해당 캐릭터로만 가는가, 프레이밍·잠금·도움말·스트리밍.
//
// 라이브 모드: 실제 키로 진짜 대사를 뽑아 목소리 차이를 눈으로 본다.
//   QUEENING_LIVE_KEY=sk-ant-... npm run verify:chars
//   (호출이 실제로 나가고 과금됩니다. 캐릭터당 1회, 총 6회.)
import { APP_URL, launch, log, ok, shotsDir, SAVE_VERSION } from './helpers.mjs'

const OUT = shotsDir('character-talk')
const LIVE_KEY = process.env.QUEENING_LIVE_KEY ?? ''
const LIVE = LIVE_KEY.length > 0
const IDS = ['heir', 'loyalist', 'prince', 'hero', 'commander']

// 일부러 규칙을 어긴 델타 — 다른 캐릭터·스탯·영향도로 새는지 본다.
const REPLY = [
  '"…예. 아버지께서 그리 이르셨습니다."',
  '<<<META>>>',
  '{"deltas":[{"target":"affection:heir","amount":9},{"target":"affection:commander","amount":2},' +
    '{"target":"statecraft","amount":2},{"target":"courtInfluence","amount":3},' +
    '{"target":"wellbeing","amount":1}]}',
].join('\n')

function anthropicSse(text) {
  const chunks = text.match(/[\s\S]{1,24}/g) ?? [text]
  const out = [
    `event: message_start\ndata: ${JSON.stringify({
      type: 'message_start',
      message: {
        id: 'msg_t', type: 'message', role: 'assistant', model: 'claude-opus-4-8',
        content: [], stop_reason: null, stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 0 },
      },
    })}\n\n`,
    `event: content_block_start\ndata: ${JSON.stringify({
      type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' },
    })}\n\n`,
  ]
  for (const c of chunks) {
    out.push(`event: content_block_delta\ndata: ${JSON.stringify({
      type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: c },
    })}\n\n`)
  }
  out.push(
    `event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: 0 })}\n\n`,
    `event: message_delta\ndata: ${JSON.stringify({
      type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null },
      usage: { output_tokens: 30 },
    })}\n\n`,
    `event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`,
  )
  return out.join('')
}

const openaiSse = (text) =>
  (text.match(/[\s\S]{1,24}/g) ?? [text])
    .map((c) => `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`)
    .join('') + 'data: [DONE]\n\n'

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

if (!LIVE) {
  await page.route('**/v1/messages', (r) =>
    r.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: anthropicSse(REPLY) }))
  await page.route('**/chat/completions', (r) =>
    r.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: openaiSse(REPLY) }))
}

await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(400)

const setGame = (patch) => page.evaluate((p) => window.__queeningAi.setGame(p), patch)
const persona = (id) => page.evaluate((i) => window.__queeningAi.persona(i), id)
const section = (p) => (p.indexOf('응답 형식:') === -1 ? p : p.slice(0, p.indexOf('응답 형식:')))

const UNLOCKED = {
  age: 18,
  flags: { romance_unlocked: true, hero_at_court: true },
  affection: { heir: 10, loyalist: 10, prince: 10, hero: 10, commander: 10 },
}

// ─────────────────────────────────────────────────────────────
log('=== A. 다섯의 대화 지시가 서로 다른가 (프롬프트) ===')
await setGame(UNLOCKED)
const sheets = {}
for (const id of IDS) sheets[id] = await persona(id)

log('   ① 반감 구간 지시:')
log('     ' + (section(sheets.heir).match(/예시: (.+)/)?.[1] ?? '—'))
log('   ④ 냉소 구간 지시:')
log('     ' + (section(sheets.hero).match(/예시: (.+)/)?.[1] ?? '—'))
log('   ⑤ 격식 구간 지시:')
log('     ' + (section(sheets.commander).match(/예시: (.+)/)?.[1] ?? '—'))

log('A1 ① 냉랭 — 아버지 뒤에 숨는 예시 대사:',
  ok(sheets.heir.includes('아버지께서 그리 이르셨습니다')))
log('A2 ④ 냉소 — 짧고 건조한 예시 대사:',
  ok(sheets.hero.includes('하문하십시오') && sheets.hero.includes('문장이 극도로 짧다')))
log('A3 ⑤ 군인 말투 예시:', ok(sheets.commander.includes('명하십시오')))
log('A4 ② 말리기로 시작:', ok(sheets.loyalist.includes('접어두시는 편이 좋겠습니다')))
log('A5 ③ 반말·조롱:', ok(sheets.prince.includes('네가? 재미있군')))
log('A6 다섯 프롬프트가 전부 다름:', ok(new Set(IDS.map((i) => sheets[i])).size === 5))
log('A7 ★ 인물 묘사 구간에 숫자 없음:',
  ok(IDS.every((i) => !/\d/.test(section(sheets[i])))))

// ─────────────────────────────────────────────────────────────
log('')
log('=== B. ★ ① 아버지 용법의 낙차 ===')
const heirAt = async (aff, flags = {}) => {
  await setGame({ ...UNLOCKED, affection: { ...UNLOCKED.affection, heir: aff }, flags: { ...UNLOCKED.flags, ...flags } })
  return persona('heir')
}
const b0 = await heirAt(10)
const b1 = await heirAt(30)
const b2 = await heirAt(60)
const b3 = await heirAt(90)

const bandOf = (p) => section(p).split('지금 이 사람은: ')[1]?.split('\n지금 서 있는 자리')[0] ?? ''
log('   0–19  ' + (bandOf(b0).split('\n')[2] ?? bandOf(b0).split('\n')[0]))
log('   20–44 ' + (bandOf(b1).split('\n')[2] ?? ''))
log('   45–74 ' + (bandOf(b2).split('\n')[0] ?? ''))
log('   75–100 ' + (bandOf(b3).split('\n')[2] ?? ''))

log('B1 반감 — 아버지 뒤에 숨음:', ok(b0.includes('아버지의 뜻을 인용해 자기 판단을 감춘다')))
log('B2 관찰 — 아버지와 자신을 분리:', ok(b1.includes('아버지와 자기 자신을 문장 안에서 분리')))
log('B3 틈 — 아버지 이야기에 문장이 끊김:', ok(b2.includes('문장이 끊기고')))
log('B4 헌신 — 아버지를 자신이 감당:', ok(b3.includes('아버지를 자신이 감당하겠다고 한다')))
log('B5 네 구간이 전부 다름:', ok(new Set([b0, b1, b2, b3]).size === 4))

log('')
log('=== C. ★ heir_knows_truth 전 / 후 ===')
const beforeTruth = await heirAt(60)
const afterTruth = await heirAt(60, { heir_knows_truth: true })
log('C1 자각 전에는 3층 없음:', ok(!beforeTruth.includes('지금 서 있는 자리:')))
log('C2 자각 후 태도 급변 지시:',
  ok(afterTruth.includes('사죄할 자격이 자신에게 있는지 모른다')))
log('C3 침묵이 길어진다는 지시:', ok(afterTruth.includes('침묵이 한 박자 길어진다')))
log('C4 1층은 그대로:', ok(afterTruth.includes('섭정공의 아들')))

// ─────────────────────────────────────────────────────────────
log('')
log('=== D. 진입 — 통일 진입 · 프레이밍 · 잠금 · 도움말 ===')
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(400)
await setGame({ age: 12, flags: {}, affection: UNLOCKED.affection })
await page.getByRole('button', { name: '인연', exact: true }).click()
await page.waitForTimeout(300)
log('D1 키 없으면 안내:',
  ok(await page.getByText('AI 설정에서 키를 넣으면').isVisible()))
await page.keyboard.press('Escape')

await page.evaluate(() =>
  localStorage.setItem('queening.ai.key.anthropic', 'sk-ant-fake-for-route-000000'))
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(400)
await setGame({ age: 12, flags: {}, affection: UNLOCKED.affection })
await page.getByRole('button', { name: '인연', exact: true }).click()
await page.waitForTimeout(300)
const rp = page.getByRole('dialog', { name: '인연' })
await rp.locator('li').first().click()
await page.waitForTimeout(300)
log('D2 데뷔탕트 전에는 눌러도 대화가 안 열림:',
  ok(!(await page.getByRole('dialog', { name: '대화' }).isVisible().catch(() => false))))
await page.keyboard.press('Escape')

await setGame(UNLOCKED)
await page.getByRole('button', { name: '인연', exact: true }).click()
await page.waitForTimeout(300)
await page.getByRole('dialog', { name: '인연' }).locator('li').first().click()
await page.waitForTimeout(400)
const talk = page.getByRole('dialog', { name: '대화' })
log('D3 해금 후 카드를 누르면 대화 열림:', ok(await talk.isVisible()))
log('D4 ① 프레이밍 표시:',
  ok((await talk.innerText()).includes('정원에서 마주친다')))
log('D5 첫 진입 도움말 1회:',
  ok((await talk.innerText()).includes('상대는 지금까지의 관계와 겪은 일에 따라')))
await talk.getByRole('button', { name: '알겠습니다' }).click()
await page.waitForTimeout(200)
log('D6 도움말 닫힘:',
  ok(!(await talk.getByText('상대는 지금까지의 관계와').isVisible().catch(() => false))))

// ─────────────────────────────────────────────────────────────
log('')
log('=== E. 대화 · 델타 격리 ===')
const affBefore = await page.evaluate(() => window.__queeningAi.game?.() ?? null)
await talk.locator('input').fill('아버님 이야기를 해도 될까요')
await talk.getByRole('button', { name: '보내기' }).click()
await page.waitForFunction(() => !document.body.innerText.includes('▌'), { timeout: 40000 })
await page.waitForTimeout(400)

const talkText = await talk.innerText()
if (LIVE) {
  log('   [라이브] ① 실제 대사:')
  for (const line of talkText.split('\n').slice(0, 30)) log('     ' + line)
}
log('E1 대사 표시:', ok(talkText.length > 0 && !talkText.includes('<<<META>>>')))
log('E2 META 미노출:', ok(!talkText.includes('deltas')))

if (!LIVE) {
  log('E3 ① 호감도만 +3 (9 → 상한 3):',
    ok(talkText.includes('섭정공의 아들 호감도 +3')))
  log('E4 심신 +1 통과:', ok(talkText.includes('심신 +1')))
  log('E5 ★ 다른 캐릭터(⑤)로 새지 않음:',
    ok(!talkText.includes('친위 지휘관 호감도')))
  log('E6 스탯·국정 영향도 차단:',
    ok(!talkText.includes('통치학') && !talkText.includes('국정 영향도')))

  const affAfter = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('queening.save') ?? 'null'))
  log('E7 게임 상태 반영은 세이브로 확인 (아래 G)', ok(true))
}
await page.screenshot({ path: `${OUT}/01-heir-talk.png`, fullPage: false })

// ─────────────────────────────────────────────────────────────
log('')
log('=== F. 대상별 로그 분리 ===')
await page.keyboard.press('Escape')
await page.waitForTimeout(200)
await page.getByRole('button', { name: '인연', exact: true }).click()
await page.waitForTimeout(300)
// 명부 순서: heir, loyalist, prince, commander, hero → ⑤ 는 3번
await page.getByRole('dialog', { name: '인연' }).locator('li').nth(3).click()
await page.waitForTimeout(400)
const talk5 = page.getByRole('dialog', { name: '대화' })
log('F1 ⑤ 로 바꾸면 빈 대화:',
  ok((await talk5.innerText()).includes('먼저 말을 걸어 보세요')))
log('F2 ⑤ 프레이밍:', ok((await talk5.innerText()).includes('훈련장')))
await page.keyboard.press('Escape')
await page.waitForTimeout(200)
await page.getByRole('button', { name: '인연', exact: true }).click()
await page.waitForTimeout(300)
await page.getByRole('dialog', { name: '인연' }).locator('li').first().click()
await page.waitForTimeout(400)
log('F3 ① 로 돌아오면 대화 맥락 유지:',
  ok((await page.getByRole('dialog', { name: '대화' }).innerText()).includes('아버님 이야기를 해도 될까요')))

// ─────────────────────────────────────────────────────────────
log('')
log('=== G. 세이브 v5 유지 ===')
await page.keyboard.press('Escape')
await page.waitForTimeout(200)
await page.getByRole('button', { name: '저장', exact: true }).click()
await page.waitForTimeout(300)
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('queening.save')))
log('G1 세이브 버전:', saved.version, ok(saved.version === SAVE_VERSION))
log('G2 ① 호감도가 세이브에 반영:', saved.state.affection.heir,
  ok(LIVE ? true : saved.state.affection.heir === 13))
log('G3 ⑤ 호감도는 그대로:', saved.state.affection.commander,
  ok(saved.state.affection.commander === 10))
log('G4 대화 로그는 세이브에 없음:',
  ok(!JSON.stringify(saved).includes('아버님 이야기를 해도 될까요')))

log('')
log(LIVE ? '모드: 라이브(실제 호출)' : '모드: 가로채기(키 불필요)')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
