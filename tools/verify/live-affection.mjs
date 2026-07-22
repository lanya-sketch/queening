// ★ 라이브 키 실측 — 호감도가 실제로 얼마나 빨리 오르는가.
//
// 이 프로젝트에서 자동 검증으로 확정할 수 없다고 여러 번 보고한 항목이 하나 있다:
// **회당 호감도 델타의 기대값.** 상한(±3)은 코드가 정하지만 실제 제안 빈도는
// 모델이 정하므로, 키 없이는 "상한 계산상 도달 가능"까지밖에 말할 수 없었다.
//
// 이 스크립트가 그 계산을 실측으로 바꾼다. 키를 넣고 한 줄 돌리면 된다:
//
//   QUEENING_LIVE_KEY=sk-ant-... npm run verify:live-affection
//
// 실제 API 를 호출하므로 **과금이 발생한다**(기본 12회).
import { APP_URL, launch, log, shotsDir } from './helpers.mjs'

const KEY = process.env.QUEENING_LIVE_KEY
const CHAR = process.env.QUEENING_LIVE_CHAR ?? 'prince'
const ROUNDS = Number(process.env.QUEENING_LIVE_ROUNDS ?? 12)
const MODEL = process.env.QUEENING_LIVE_MODEL

if (!KEY) {
  log('건너뜁니다 — 실제 키가 필요한 실측입니다.')
  log('')
  log('  QUEENING_LIVE_KEY=sk-ant-... npm run verify:live-affection')
  log('')
  log('무엇을 재는가: 호감도가 회당 실제로 얼마나 오르는지.')
  log('상한(±3)은 코드가 정하지만 제안 빈도는 모델이 정하므로, 키 없이는')
  log('"상한 계산상 도달 가능"까지밖에 말할 수 없다. 이 스크립트가 그걸 실측으로 바꾼다.')
  log('')
  log('환경변수: QUEENING_LIVE_CHAR(기본 prince) / QUEENING_LIVE_ROUNDS(기본 12) / QUEENING_LIVE_MODEL')
  log('★ 실제 호출이라 과금이 발생합니다.')
  process.exit(0)
}

const OUT = shotsDir('live-affection')

/**
 * 보낼 말들. 특정 캐릭터에만 통하는 대사가 아니라 **평범한 대화**여야 한다 —
 * 최적 플레이가 아니라 보통 플레이의 상승 속도를 재는 것이 목적이다.
 */
const LINES = [
  '오늘 사냥터에서 본 것 중에 가장 인상 깊었던 게 무엇이었습니까.',
  '그대는 이 궁이 답답하지 않습니까.',
  '나는 아직도 이 자리가 내 것 같지 않을 때가 있습니다.',
  '그대가 없는 계절에는 이 궁이 조금 조용합니다.',
  '어릴 적에는 무엇이 되고 싶었습니까.',
  '나는 그대에게 무엇을 해줄 수 있는 사람입니까.',
  '떠날 때 인사를 하지 않는 이유가 있습니까.',
  '다음에 올 때는 미리 알려주시겠습니까.',
  '그대는 나를 왕으로 봅니까, 아니면 사람으로 봅니까.',
  '이 나라에 관심이 없다는 말은 아직 사실입니까.',
  '그대가 돌아가고 나면 나는 늘 같은 것을 생각합니다.',
  '언젠가 그대의 나라를 보고 싶습니다.',
]

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(400)

// 로맨스가 열려 있고 ③ 이 체류 중인 상태로 만든다.
await page.evaluate(
  ([key, model, charId]) => {
    window.__queeningAi.configure('anthropic', key, model || undefined)
    window.__queeningAi.setGame({
      age: 17,
      date: { year: 6, month: 6 },
      flags: { romance_unlocked: true, prince_present: true, hero_at_court: true },
      counters: {},
      phase: 'schedule',
    })
    // ★ 돌발 현안이 끼어들면 재려는 것과 무관한 호출이 나가고 과금된다.
    window.__queeningAi.setIncidentRate(0)
    window.__queeningAi.openTalk(charId)
  },
  [KEY, MODEL ?? '', CHAR],
)
await page.waitForTimeout(500)

const affectionOf = () =>
  page.evaluate((id) => window.__queeningAi.state.affection[id], CHAR)

const start = await affectionOf()
log(`대상: ${CHAR} | 시작 호감도: ${start} | 라운드: ${ROUNDS}`)
log(`모델: ${MODEL ?? '(기본값)'}`)
log('')

const dialog = page.getByRole('dialog', { name: '대화' })
const input = dialog.locator('input')
const send = dialog.getByRole('button', { name: '보내기' })

const gains = []
for (let i = 0; i < ROUNDS; i++) {
  const before = await affectionOf()
  await input.fill(LINES[i % LINES.length])
  await send.click()
  // 스트리밍이 끝날 때까지 기다린다(입력창이 다시 활성화되는 시점).
  await input.waitFor({ state: 'attached' })
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[role="dialog"] input')
      return el && !el.disabled
    },
    { timeout: 120000 },
  ).catch(() => errors.push(`라운드 ${i + 1} 응답 시간 초과`))
  await page.waitForTimeout(300)

  const after = await affectionOf()
  const gain = after - before
  gains.push(gain)

  // 마지막 대사 일부도 남긴다 — 수치만 보면 왜 안 올랐는지 알 수 없다.
  const last = await dialog
    .locator('div.border-amber-900\\/50')
    .last()
    .innerText()
    .catch(() => '')
  log(`  ${String(i + 1).padStart(2)}. ${gain >= 0 ? '+' : ''}${gain}  (누적 ${after})`)
  log(`      ${last.split('\n')[0].slice(0, 70)}`)
}

await page.screenshot({ path: `${OUT}/01-conversation.png`, fullPage: true })

// ─────────────────────────────────────────────────────────────
const total = gains.reduce((a, b) => a + b, 0)
const mean = total / gains.length
const zero = gains.filter((g) => g === 0).length
const maxed = gains.filter((g) => g >= 3).length

log('')
log('=== 실측 결과 ===')
log(`회당 평균 상승   ${mean.toFixed(2)}`)
log(`0 인 회차        ${zero} / ${gains.length}`)
log(`상한(+3) 회차    ${maxed} / ${gains.length}`)
log('')

const NEED = 70 - start
if (mean <= 0) {
  log(`★ 평균이 0 이하다. 이 설정으로는 깊은 관계에 도달할 수 없다.`)
  log(`  페르소나의 델타 지침 또는 clamp 허용목록을 다시 볼 것.`)
} else {
  const needed = Math.ceil(NEED / mean)
  log(`★ 깊은 관계(70)까지 ${NEED}점 → 추정 ${needed}회 대화`)
  log(`  세션 호출 소프트 상한은 60 이다.`)
  if (needed > 60) {
    log(`  → ${needed}회는 상한을 넘는다. 조정이 필요하다:`)
    log(`     · MAX_AFFECTION(현재 3) 상향, 또는`)
    log(`     · 화제 해금의 결정론적 보상(현재 +8) 확대, 또는`)
    log(`     · ③ 체류 기간 연장 (다만 턴당 메시지 무제한이라 효과는 제한적)`)
  } else {
    log(`  → 상한 안에 들어온다. 현재 수치로 도달 가능하다.`)
  }
  // ③ 은 체류가 있어 접근 자체가 제한된다 — 방문 횟수까지 곱해 본다.
  if (CHAR === 'prince') {
    log('')
    log(`  ③ 은 상주하지 않는다. 데뷔탕트 이후 14계절 기준:`)
    log(`     방치 ~1.7회 방문 × 체류 2턴 = 약 3.4세션`)
    log(`     사냥 유도 ~2.5회 방문 × 체류 2턴 = 약 5세션`)
    log(`     → 세션당 ${Math.ceil(needed / 5)}회 이상 대화해야 유도 플레이로 도달한다.`)
  }
}

log('')
log('런타임 에러:', errors.length === 0 ? '없음' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
