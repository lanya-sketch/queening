// ★ 진짜 ablation — 얹은 것을 실제로 들어내고 로그를 대조한다.
//
// 왜 정적 대조로는 부족한가:
//   정적 대조는 "새 이벤트가 clue_*/truth_* 를 직접 참조하지 않는다"는 **의도**를 본다.
//   그러나 이벤트는 직접 참조 없이도 서로에게 영향을 준다 — 우선순위 경쟁,
//   그리고 턴당 이벤트 상한(MAX_EVENTS_PER_TURN=2)을 나눠 먹는 것.
//   혈서 이벤트가 예산을 먼저 쓰면 그 계절에 뜰 다른 이벤트가 다음 계절로 밀린다.
//   이 **간접 영향**은 실제로 들어내 봐야만 잡힌다.
//
// 변동폭 문제:
//   활동 효과에 ±variance 난수가 있어 같은 코드로 두 번 돌려도 로그가 갈린다.
//   그 상태로 비교하면 차이가 나와도 제거 때문인지 운 때문인지 못 가린다.
//   그래서 양쪽 다 **결정론 모드**(rng 상수 0.5 → variance 정확히 0)로 돌린다.
//
//   npm run verify:ablation
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { assertServer, log, ok, shotsDir } from './helpers.mjs'

const OUT = shotsDir('ablation')
const ABLATE = 'bloodoath,devices,topics'

await assertServer()

function runSimulate(env, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [join(import.meta.dirname, 'simulate.mjs')],
      { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] },
    )
    let out = ''
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { out += d })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`${label} 종료 코드 ${code}\n${out.slice(-800)}`))
      resolve(out)
    })
  })
}

/**
 * 실행 로그를 빌드별 구조로 쪼갠다.
 * 비교 대상은 **이벤트 줄과 결론 줄**이다 — 화면 장식이나 소요 시간이 아니라.
 */
function parse(text) {
  const builds = {}
  let current = null
  for (const line of text.split('\n')) {
    const head = line.match(/^([A-Z])\. (.+)$/)
    if (head) {
      current = head[1]
      builds[current] = { name: line.trim(), events: [], summary: {} }
      continue
    }
    if (!current) continue
    // "  즉위 4년 여름 (왕 15세)  덮인 밤  → 혼자 삼킨다  [의심 60 신망 53 영향도 23]"
    const ev = line.match(/^\s{2}(즉위 .+?)\s\((.+?)\)\s{2}(.+?)(?:\s{2}→ (.+?))?\s{2}\[(.+)\]$/)
    if (ev) {
      builds[current].events.push({
        date: ev[1].trim(), age: ev[2].trim(), title: ev[3].trim(),
        picked: (ev[4] ?? '').trim(), gauges: ev[5].trim(),
      })
      continue
    }
    for (const key of ['최종 자원', '단서', '얕은 진실', '깊은 진실', '섭정', '영향도 추이']) {
      if (line.trim().startsWith(key)) builds[current].summary[key] = line.trim()
    }
  }
  return builds
}

/**
 * ★ 미스터리 결론 — **모든 빌드에서** 일치해야 한다. 이게 이번 라운드의 명제다.
 *   영향도는 여기 넣지 않는다. 제거된 콘텐츠 중 두루마리는 설계상 영향도를 +18 하므로,
 *   그걸 받는 빌드에서 영향도가 달라지는 건 **ablation 이 작동했다는 증거**지
 *   미스터리 훼손이 아니다. 둘을 한 통에 넣으면 판정이 흐려진다.
 */
function mysteryOf(build) {
  const clueEvents = build.events.filter((e) =>
    ['덮인 밤', '어머니의 필적', '봉인된 기록', '문서고의 밤', '사라진 시종',
     '국고의 장부', '왕대비궁의 약재', '외가의 추도식', '왕대비의 초대'].includes(e.title))
  return {
    단서순서: clueEvents.map((e) => `${e.date} ${e.title}`),
    얕은진실: build.summary['얕은 진실'] ?? '(없음)',
    깊은진실: build.summary['깊은 진실'] ?? '(없음)',
    단서: build.summary['단서'] ?? '(없음)',
    섭정: build.summary['섭정'] ?? '(없음)',
  }
}

/** 영향도는 따로 본다 — 제거된 보상을 받는 빌드에서만 달라져야 한다. */
const influenceOf = (build) => build.summary['영향도 추이'] ?? '(없음)'

/**
 * 제거된 콘텐츠 중 **자원 보상이 있는 것**은 두루마리(영향도 +18) 하나뿐이다.
 * 그래서 영향도가 달라져도 되는 빌드는 두루마리를 받는 빌드뿐이다.
 */
const RECEIVES_ABLATED_REWARD = (build) =>
  build.events.some((e) => e.title === '두루마리')

/**
 * 재분석 모드. 시뮬 3회는 40분이 걸리므로, 판정 로직만 고쳤을 때
 * 저장된 로그로 다시 대조한다. 새 실행이 필요하면 이 변수를 빼면 된다.
 *   QUEENING_ABLATION_REPLAY=1 npm run verify:ablation
 */
const REPLAY = process.env.QUEENING_ABLATION_REPLAY === '1'

let normalOut, ablatedOut
if (REPLAY) {
  log('저장된 로그로 재분석합니다 (새 시뮬 실행 없음).')
  normalOut = readFileSync(join(OUT, 'normal.log'), 'utf8')
  ablatedOut = readFileSync(join(OUT, 'ablated.log'), 'utf8')
} else {
  log('결정론 모드로 두 번 돌립니다 — 정상 빌드 / 3c 제거 빌드.')
  log(`제거 대상: ${ABLATE}`)
  log('(각 ~13분, 총 40분 남짓)')
  log('')

  log('▶ 1/2 정상 빌드…')
  normalOut = await runSimulate({ QUEENING_DETERMINISTIC: '1' }, '정상')
  log('▶ 2/2 제거 빌드…')
  ablatedOut = await runSimulate(
    { QUEENING_DETERMINISTIC: '1', QUEENING_ABLATE: ABLATE }, '제거')

  writeFileSync(join(OUT, 'normal.log'), normalOut)
  writeFileSync(join(OUT, 'ablated.log'), ablatedOut)
}

const normal = parse(normalOut)
const ablated = parse(ablatedOut)

// 제거된 콘텐츠가 실제로 사라졌는지부터 — 안 사라졌으면 비교가 무의미하다
const ABLATED_TITLES = [
  '달이 없는 밤', '지나간 발소리', '먼저 한 거짓말', '들켰다', '가문 수색',
  '세 번째 궤', '맞춰진 반쪽', '길을 터 두었습니다',
  '두루마리', '문 앞에 선 가문', '두 개의 왕관',
]
const leftover = Object.values(ablated).flatMap((b) =>
  b.events.filter((e) => ABLATED_TITLES.includes(e.title)).map((e) => `${e.title}`))
const presentInNormal = Object.values(normal).flatMap((b) =>
  b.events.filter((e) => ABLATED_TITLES.includes(e.title)).map((e) => e.title))

log('')
log('=== A. 제거가 실제로 일어났는가 ===')
log('   정상 빌드에 등장한 3c 이벤트:', [...new Set(presentInNormal)].join(', ') || '(없음)')
log('A1 정상 빌드에는 3c 콘텐츠가 있음:', ok(presentInNormal.length > 0))
log('A2 ★ 제거 빌드에는 하나도 없음:', leftover.join(', ') || '없음', ok(leftover.length === 0))

log('')
log('=== B. ★★ 미스터리가 정말로 그대로인가 ===')
let allSame = true
const buildKeys = Object.keys(normal).filter((k) => ablated[k])

for (const key of buildKeys) {
  const a = mysteryOf(normal[key])
  const b = mysteryOf(ablated[key])
  const diffs = []
  for (const field of Object.keys(a)) {
    const av = JSON.stringify(a[field])
    const bv = JSON.stringify(b[field])
    if (av !== bv) diffs.push({ field, av, bv })
  }
  if (diffs.length) allSame = false
  log('')
  log(`   ${normal[key].name}`)
  if (!diffs.length) {
    log(`     단서 ${a.단서순서.length}건 · ${a.얕은진실} · ${a.깊은진실} · ${a.섭정}`)
    log(`     미스터리 완전 일치 ${ok(true)}`)
  } else {
    for (const d of diffs) {
      log(`     [${d.field}] *** 불일치 ***`)
      log(`       정상: ${d.av}`)
      log(`       제거: ${d.bv}`)
    }
  }
}

log('')
log('B1 ★★ 전 빌드 미스터리 결론 완전 일치:', ok(allSame))

// ─────────────────────────────────────────────────────────────
log('')
log('=== D. 영향도 — 제거된 보상을 받는 빌드에서만 달라지는가 ===')
let influenceOk = true
for (const key of buildKeys) {
  const same = influenceOf(normal[key]) === influenceOf(ablated[key])
  const expected = RECEIVES_ABLATED_REWARD(normal[key])
  if (same === expected) {
    // 보상을 받는데 같거나, 안 받는데 다르면 문제다
    influenceOk = false
    log('')
    log(`   ${normal[key].name}  *** 예상과 다름 ***`)
    log(`     두루마리 수령: ${expected} / 영향도 동일: ${same}`)
    log(`     정상: ${influenceOf(normal[key])}`)
    log(`     제거: ${influenceOf(ablated[key])}`)
  } else if (!same) {
    log('')
    log(`   ${normal[key].name}  — 두루마리(+18) 수령 빌드, 차이는 설계대로`)
    log(`     정상: ${influenceOf(normal[key])}`)
    log(`     제거: ${influenceOf(ablated[key])}`)
  }
}
log('')
log('D1 ★ 영향도 차이는 두루마리 수령 빌드에만 나타남:', ok(influenceOk))
log('   → 차이가 "제거된 보상만큼"이라는 것은 ablation 이 작동했다는 증거다.')

// 결정론 모드가 실제로 결정론적인지 — 이게 안 되면 위 비교가 성립하지 않는다
log('')
log('=== C. 비교의 전제 — 결정론 모드가 정말 결정론적인가 ===')
let repeatOut
if (REPLAY) {
  log('   저장된 재실행 로그로 대조합니다.')
  repeatOut = readFileSync(join(OUT, 'normal-repeat.log'), 'utf8')
} else {
  log('   정상 빌드를 한 번 더 돌려 자기 자신과 대조합니다…')
  repeatOut = await runSimulate({ QUEENING_DETERMINISTIC: '1' }, '정상(재실행)')
  writeFileSync(join(OUT, 'normal-repeat.log'), repeatOut)
}
const repeat = parse(repeatOut)
let selfSame = true
for (const key of buildKeys) {
  if (!repeat[key]) { selfSame = false; continue }
  if (JSON.stringify(mysteryOf(normal[key])) !== JSON.stringify(mysteryOf(repeat[key]))) {
    selfSame = false
    log(`   ${key} 빌드가 재실행에서 달라짐 *** 문제 ***`)
  }
}
log('C1 ★ 같은 설정 두 번 → 완전 동일 (변동폭 제거 확인):', ok(selfSame))
log('   → C1 이 통과해야 B1 의 "일치"가 의미를 갖는다.')

log('')
log(allSame && selfSame && influenceOk
  ? '★ 결론: 3c 장치를 실제로 들어내도 미스터리 로그가 동일하다.\n' +
    '  유일한 차이는 두루마리(+18)를 받는 빌드의 영향도이고, 그건 제거된 보상 그 자체다.\n' +
    '  무손상이 의도가 아니라 결과로 확정됐다.'
  : '★ 결론: 예상 밖의 차이가 있다. 위 불일치 항목을 확인할 것.')
log('로그:', OUT)
