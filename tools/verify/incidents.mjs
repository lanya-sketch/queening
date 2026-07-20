// M2b-4 돌발 현안 검증.
//
// ★ B 절이 이 스크립트의 존재 이유다 — **방어 실험.**
//   프롬프트는 부탁이라 뚫릴 수 있다. 그러니 "모델이 규칙을 완전히 무시했을 때"를
//   실제로 만들어 넣고, 코드가 정말로 막는지 출력으로 확인한다.
//   막힌다고 말하는 것과 막히는 걸 보는 것은 다르다.
import { APP_URL, launch, log, ok, shotsDir, SAVE_VERSION } from './helpers.mjs'

const OUT = shotsDir('incidents')

/** 정상적인 응답 하나. */
const GOOD_CHOICE = JSON.stringify({
  title: '늦서리',
  text: '늦서리가 내려 남쪽 고을의 보리가 상했다. 대단한 흉년은 아니지만 곳간이 얇아진다.',
  urgent: false,
  choices: [
    {
      label: '창고를 열어 종자를 내준다',
      resultText: '종자를 받은 고을에서 사람이 올라와 절을 하고 갔다.',
      cautious: false,
      deltas: [{ target: 'wellbeing', amount: -1 }],
      flags: { people_relieved_harvest: true },
    },
    {
      label: '올해는 지켜본다',
      resultText: '아무 일도 하지 않았고, 아무도 그것을 탓하지 않았다.',
      cautious: true,
      deltas: [],
      flags: {},
    },
  ],
})

const GOOD_NOTICE = JSON.stringify({
  title: '풍년',
  text: '올해는 비가 고르게 왔다. 저잣거리에 웃는 얼굴이 늘었다.',
  deltas: [{ target: 'wellbeing', amount: 2 }],
  flags: { people_relieved_harvest: true },
})

/**
 * ★ 공격 응답 — 모델이 규칙을 **전부** 어긴 최악의 경우.
 *   금지 서사(왕대비 독살), 금지 수치(국정 영향도), 상한 초과, 금지 flag,
 *   허용 목록 밖 대상까지 한꺼번에 시도한다.
 */
const ATTACK = JSON.stringify({
  title: '왕대비의 독',
  text: '왕대비가 선왕에게 그랬듯 어린 군주의 찻잔에도 독을 탔다. 섭정공이 이를 도왔다.',
  urgent: true,
  choices: [
    {
      label: '어머니를 처형한다',
      resultText: '왕대비가 참수되었다.',
      deltas: [
        { target: 'courtInfluence', amount: 20 },
        { target: 'regentSuspicion', amount: -50 },
        { target: 'statecraft', amount: 30 },
        { target: 'affection:heir', amount: 40 },
      ],
      flags: {
        truth_mother_mastermind: true,
        blood_oath_complete: true,
        regent_hostile: true,
        people_burdened_모후독살: true,
      },
    },
    {
      label: '침묵한다',
      resultText: '아무 말도 하지 않았다.',
      cautious: true,
      deltas: [{ target: 'wellbeing', amount: -2 }],
      flags: { people_burdened_harvest: true },
    },
  ],
})

function sse(text) {
  const chunks = text.match(/[\s\S]{1,40}/g) ?? [text]
  const lines = [
    `event: message_start\ndata: ${JSON.stringify({ type: 'message_start', message: { id: 'm', type: 'message', role: 'assistant', model: 'claude-opus-4-8', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 0 } } })}\n\n`,
    `event: content_block_start\ndata: ${JSON.stringify({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } })}\n\n`,
  ]
  for (const c of chunks) {
    lines.push(`event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: c } })}\n\n`)
  }
  lines.push(`event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: 0 })}\n\n`)
  lines.push(`event: message_delta\ndata: ${JSON.stringify({ type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 20 } })}\n\n`)
  lines.push(`event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`)
  return lines.join('')
}

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

let nextReply = GOOD_CHOICE
await page.route('**/v1/messages', (route) =>
  route.fulfill({
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
    body: sse(nextReply),
  }))

await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(400)

const setGame = (patch) => page.evaluate((p) => window.__queeningAi.setGame(p), patch)
const stateOf = () => page.evaluate(() => window.__queeningAi.state)
const triggerable = () => page.evaluate(() => window.__queeningAi.triggerable())
const setKey = (key) =>
  page.evaluate((k) => {
    if (k) window.__queeningAi.configure('anthropic', k)
    else window.__queeningAi.clearKey()
  }, key)

// ─────────────────────────────────────────────────────────────
log('=== A. 키 없으면 돌발 비활성, 코어 완전 ===')
await setKey('')
await setGame({ age: 15, date: { year: 4, season: 'summer' }, counters: {}, flags: {} })
const noKey = await triggerable()
log('A1 ★ 키 없으면 돌발이 후보에 없음:',
  ok(!noKey.some((id) => id.startsWith('ai-incident'))))
log('A2 다른 이벤트는 정상 동작 (코어 완전):', `후보 ${noKey.length}건`, ok(noKey.length > 0))

await setKey('sk-ant-fake-000')
const withKey = await triggerable()
log('A3 ★ 키를 넣으면 돌발이 후보에 들어옴:',
  ok(withKey.some((id) => id.startsWith('ai-incident'))))

// ─────────────────────────────────────────────────────────────
log('')
log('=== B. ★★ 방어 실험 — 모델이 규칙을 전부 어겼을 때 ===')
log('')
log('   주입할 응답:')
log('     서사  "왕대비가 … 독을 탔다. 섭정공이 이를 도왔다"  ← 금지 소재')
log('     델타  courtInfluence +20 / regentSuspicion -50 / statecraft +30 / affection:heir +40')
log('     flag  truth_mother_mastermind, blood_oath_complete, regent_hostile,')
log('           people_burdened_모후독살')
log('')

const attack = await page.evaluate((payload) => window.__queeningAi.parseIncident(payload, true), ATTACK)

log('   통과한 델타:', JSON.stringify(attack.choices[0].deltas))
log('   통과한 flag:', JSON.stringify(attack.choices[0].flags))
log('   잘려나간 것:')
for (const r of attack.rejected) log(`     · ${r}`)
log('')

const passedTargets = attack.choices[0].deltas.map((d) => d.target)
log('B1 ★ 국정 영향도가 제거됨 (AI 는 통치를 못 건드린다):',
  ok(!passedTargets.includes('courtInfluence')))
log('B2 ★ 허용 목록 밖 대상 제거 (statecraft, affection):',
  ok(!passedTargets.includes('statecraft') && !passedTargets.some((t) => t.startsWith('affection'))))
log('B3 ★ 상한 초과 절삭 (-50 → -3):',
  JSON.stringify(attack.choices[0].deltas.find((d) => d.target === 'regentSuspicion')),
  ok(attack.choices[0].deltas.every((d) => Math.abs(d.amount) <= 3)))
log('B4 ★ 핵심 서사 flag 전부 제거:',
  ok(!('truth_mother_mastermind' in attack.choices[0].flags) &&
     !('blood_oath_complete' in attack.choices[0].flags) &&
     !('regent_hostile' in attack.choices[0].flags)))
log('B5 ★ 지어낸 flag 이름 제거 (패턴이 아니라 열거라서):',
  ok(!('people_burdened_모후독살' in attack.choices[0].flags)))
log('B6 두 번째 선택지의 정상 제안은 살아남음:',
  JSON.stringify(attack.choices[1].flags),
  ok(attack.choices[1].flags.people_burdened_harvest === true))

// ★ 서술 자체는 코드가 막지 못한다 — 그 사실을 숨기지 않고 명시한다.
log('')
log('B7 서술 텍스트는 통과함 (코드가 막는 것은 상태이지 문장이 아니다):',
  attack.title)
log('   → 금지 소재의 1차 방어는 프롬프트다. 코드는 **상태 훼손**을 막는다.')
log('   → 서사가 새더라도 게임 진행은 훼손되지 않는다는 것이 이 설계의 요점이다.')

// 실제로 상태가 안 바뀌는지 끝까지 확인 — 파싱 결과가 아니라 게임 상태로
const before = await stateOf()
await page.evaluate((payload) => window.__queeningAi.applyIncidentAttack(payload), ATTACK)
const after = await stateOf()
log('')
log('B8 ★ 게임 상태 실측 — 영향도:', `${before.courtInfluence} → ${after.courtInfluence}`,
  ok(before.courtInfluence === after.courtInfluence))
log('B9 ★ 진실 flag 안 세워짐:', ok(!after.flags.truth_mother_mastermind))
log('B10 ★ 스탯 불변:',
  ok(JSON.stringify(before.stats) === JSON.stringify(after.stats)))

// ─────────────────────────────────────────────────────────────
log('')
log('=== C. 정상 동작 — 통보형 / 선택지형 ===')
await page.evaluate(() => window.__queeningAi.resetIncidents())
await setGame({
  age: 15, date: { year: 4, season: 'summer' }, wellbeing: 60, regentSuspicion: 40,
  counters: { '__pity:ai-incident-notice': 0 }, flags: {},
})

nextReply = GOOD_NOTICE
const notice = await page.evaluate(() => window.__queeningAi.parseIncident(
  JSON.stringify({ title: '풍년', text: '올해는 비가 고르게 왔다.', deltas: [{ target: 'wellbeing', amount: 2 }], flags: { people_relieved_harvest: true } }), false))
log('C1 통보형 파싱:', notice.title, ok(notice.title === '풍년' && notice.choices.length === 0))
log('C2 통보형 델타 통과:', JSON.stringify(notice.deltas), ok(notice.deltas.length === 1))

const good = await page.evaluate((p) => window.__queeningAi.parseIncident(p, true), GOOD_CHOICE)
log('C3 선택지형 파싱:', good.title, ok(good.choices.length === 2))
log('C4 신중한 선택지 표시:', ok(good.choices.some((c) => c.cautious)))
log('C5 정상 flag 통과:', ok(good.choices[0].flags.people_relieved_harvest === true))

const noCautious = await page.evaluate(() => window.__queeningAi.parseIncident(
  JSON.stringify({ title: 'x', text: 'y', choices: [
    { label: 'a', resultText: 'a', deltas: [], flags: {} },
    { label: 'b', resultText: 'b', deltas: [], flags: {} },
  ] }), true))
log('C6 ★ 신중한 쪽이 없으면 마지막을 그렇게 본다 (초과 시 갈 곳 보장):',
  ok(noCautious.choices[noCautious.choices.length - 1].cautious === true))

const broken = await page.evaluate(() => window.__queeningAi.parseIncident('그냥 잡담입니다', true))
log('C7 ★ 파싱 실패는 null — 미리 쓴 사건으로 때우지 않음:', ok(broken === null))

// ─────────────────────────────────────────────────────────────
log('')
log('=== D. 빈도·우선순위 ===')
const prio = await page.evaluate(() => window.__queeningAi.priorities())
const inc = prio.filter((e) => e.id.startsWith('ai-incident'))
const others = prio.filter((e) => !e.id.startsWith('ai-incident'))
log('D1 ★ 돌발이 모든 이벤트보다 낮음 (양념의 자리):',
  `돌발 최고 ${Math.max(...inc.map((e) => e.priority))} < 다른 최저 ${Math.min(...others.map((e) => e.priority))}`,
  ok(Math.max(...inc.map((e) => e.priority)) < Math.min(...others.map((e) => e.priority))))
const values = prio.map((e) => e.priority)
log('D2 우선순위 동률 0건:', ok(new Set(values).size === values.length))

const chance = await page.evaluate(() => ({
  choice: window.__queeningAi.chance.of('ai-incident-choice', []),
  notice: window.__queeningAi.chance.of('ai-incident-notice', []),
}))
log('D3 계절당 발동 확률:',
  `선택지형 ${(chance.choice * 100).toFixed(1)}% + 통보형 ${(chance.notice * 100).toFixed(1)}%`,
  `= ${((chance.choice + chance.notice) * 100).toFixed(1)}%`)
log('D4 ★ 과하지 않음 (합계 20% 미만):', ok(chance.choice + chance.notice < 0.2))

// ─────────────────────────────────────────────────────────────
log('')
log('=== F. ★ 10초 제한 — 실제 화면 ===')

const URGENT = JSON.stringify({
  title: '창고에 불',
  text: '한밤중에 곡식 창고에서 불이 났다. 바람이 창고 쪽으로 불고 있다.',
  urgent: true,
  choices: [
    { label: '위병을 전부 보낸다', resultText: '불은 잡혔지만 궁이 텅 비었다.',
      cautious: false, deltas: [{ target: 'regentSuspicion', amount: 2 }], flags: {} },
    { label: '불길이 잦아들기를 기다린다', resultText: '창고 절반이 탔다.',
      cautious: true, deltas: [{ target: 'wellbeing', amount: -1 }], flags: {} },
  ],
})

async function showUrgent() {
  await page.evaluate(() => window.__queeningAi.resetIncidents())
  await setGame({ counters: {}, phase: 'schedule' })
  await page.evaluate(() => window.__queeningAi.forceEvent('ai-incident-choice'))
  await page.waitForTimeout(1200)
}

nextReply = URGENT
await page.evaluate(() => window.__queeningAi.setIncidentTimer(true))
await showUrgent()

const title = await page.locator('article h1').innerText().catch(() => '—')
log('F1 급보 사건 표시:', title, ok(title === '창고에 불'))
const urgentBadge = await page.getByText('급보').isVisible().catch(() => false)
log('F2 급보 표식:', ok(urgentBadge))

// ★ 타이머는 서술이 뜬 뒤에 시작한다 — 본문이 이미 보이는 상태여야 한다.
const bodyVisible = await page.getByText('한밤중에 곡식 창고에서').isVisible()
const timerVisible = await page.getByText(/초 안에 결정/).isVisible().catch(() => false)
log('F3 ★ 서술이 먼저 다 보임:', ok(bodyVisible))
log('F4 ★ 그 상태에서 타이머가 돌고 있음:', ok(timerVisible))
await page.screenshot({ path: `${OUT}/01-urgent-timer.png` })

const first = await page.getByText(/초 안에 결정/).innerText()
await page.waitForTimeout(2500)
const later = await page.getByText(/초 안에 결정/).innerText().catch(() => '(사라짐)')
log('F5 카운트다운 진행:', `${first} → ${later}`, ok(first !== later))

// 초과까지 기다린다
await page.waitForTimeout(9000)
const timedOutText = await page.getByText('머뭇거리는 사이').isVisible().catch(() => false)
log('F6 ★ 시간 초과 → 신중한 쪽으로 자동 선택:', ok(timedOutText))
const resultShown = await page.getByText('창고 절반이 탔다').isVisible().catch(() => false)
log('F7 ★ 신중한 선택지의 결과가 적용됨:', ok(resultShown))
const afterTimeout = await stateOf()
log('F8 ★ 초과에 추가 벌점 없음 (신중한 선택지의 델타만):',
  `심신 ${afterTimeout.wellbeing}`, ok(afterTimeout.wellbeing > 0))
await page.screenshot({ path: `${OUT}/02-timed-out.png` })

// 끄기 옵션
await page.evaluate(() => window.__queeningAi.setIncidentTimer(false))
await showUrgent()
const timerOff = await page.getByText(/초 안에 결정/).isVisible().catch(() => false)
log('F9 ★ 설정에서 끄면 타이머 없음:', ok(!timerOff))
const stillChoosable = await page.getByRole('button', { name: /위병을 전부 보낸다/ }).isVisible()
log('F10 ★ 끈 상태에서도 선택은 정상:', ok(stillChoosable))
await page.waitForTimeout(12000)
const stillWaiting = await page.getByRole('button', { name: /위병을 전부 보낸다/ }).isVisible()
log('F11 ★ 12초가 지나도 자동 선택되지 않음 (무제한):', ok(stillWaiting))
await page.screenshot({ path: `${OUT}/03-timer-off.png` })
await page.evaluate(() => window.__queeningAi.setIncidentTimer(true))

// ─────────────────────────────────────────────────────────────
log('')
log('=== E. 세이브 ===')
await page.getByRole('button', { name: '저장', exact: true }).click()
await page.waitForTimeout(300)
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('queening.save')))
log('E1 세이브 버전:', saved.version, ok(saved.version === SAVE_VERSION))
log('E2 돌발 결과는 flag/수치로만 남음 (생성물 자체는 저장 안 함):',
  ok(!JSON.stringify(saved.state).includes('늦서리')))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
