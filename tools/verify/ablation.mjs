// ★ 진짜 ablation — 얹은 것을 실제로 들어내고 로그를 대조한다.
//
// 왜 정적 대조로는 부족한가:
//   정적 대조는 "새 이벤트가 clue_*/truth_* 를 직접 참조하지 않는다"는 **의도**를 본다.
//   그러나 이벤트는 직접 참조 없이도 서로에게 영향을 준다 — 우선순위 경쟁,
//   그리고 턴당 이벤트 상한(MAX_EVENTS_PER_TURN=2)을 나눠 먹는 것.
//   혈서 이벤트가 예산을 먼저 쓰면 그 계절에 뜰 다른 이벤트가 다음 달로 밀린다.
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

/**
 * 세 가지 모드.
 *   기본          — M2b-3c 장치(혈서·실마리·정치장치)를 들어낸다
 *   incidents     — M2b-4 돌발 현안을 들어낸다(양쪽 팔 모두 돌발 켜고).
 *   hardexclusive — 결정적 씬·청산을 들어낸다. 시뮬에서 결정적 씬은 호감도가 없어
 *                   안 뜨지만 청산은 19세+ 에 뜨므로, 제거 전후 미스터리 불변을 본다.
 */
const MODE = process.env.QUEENING_ABLATION_MODE ?? 'devices'
const INCIDENT_MODE = MODE === 'incidents'
const HARDEX_MODE = MODE === 'hardexclusive'
const OUT = shotsDir(`ablation${MODE === 'devices' ? '' : '-' + MODE}`)
const ABLATE = INCIDENT_MODE ? 'incidents'
  : HARDEX_MODE ? 'hardexclusive'
  : 'bloodoath,devices,topics'
const BASE_ENV = INCIDENT_MODE
  ? { QUEENING_DETERMINISTIC: '1', QUEENING_INCIDENTS: '1' }
  : { QUEENING_DETERMINISTIC: '1' }

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
/** "단서: 6 개 | 민심 flag: a, b" → { count: 6, people: ['a','b'] } */
function cluesOf(build) {
  const line = build.summary['단서'] ?? ''
  const count = Number(line.match(/단서:\s*(\d+)/)?.[1] ?? -1)
  const people = (line.split('민심 flag:')[1] ?? '')
    .split(',').map((s) => s.trim()).filter(Boolean).sort()
  return { count, people }
}

const CLUE_TITLES = ['덮인 밤', '어머니의 필적', '봉인된 기록', '문서고의 밤', '사라진 시종',
  '국고의 장부', '왕대비궁의 약재', '외가의 추도식', '왕대비의 초대']
const clueEventsOf = (build) => build.events.filter((e) => CLUE_TITLES.includes(e.title))

function mysteryOf(build) {
  return {
    // ★ 미스터리 '구조' 는 클루의 **순서 + 나이관문**이다 — 절대 월이 아니다.
    //   돌발 현안은 설계상 턴을 점유하므로(양념), 10× 스트레스에서 근처 클루의 절대
    //   날짜를 같은 해 안에서 한 달 밀 수 있다. 그건 이벤트 예산 경쟁의 정상 산출물이지
    //   미스터리 훼손이 아니다(순서·개수·진실·섭정·엔딩 불변). 그래서 나이(왕 N세)로만
    //   묶어 비교한다 — 클루가 **다른 해/나이로** 미끄러지면 그건 여전히 구조 변화라 잡힌다.
    //   절대 월 이동은 아래 B 절에서 관측로그로 따로 남긴다(숨기지 않는다).
    단서순서: clueEventsOf(build).map((e) => `${e.age} ${e.title}`),
    얕은진실: build.summary['얕은 진실'] ?? '(없음)',
    깊은진실: build.summary['깊은 진실'] ?? '(없음)',
    // ★ 개수만 본다. 민심 flag 목록은 따로 검사한다 —
    //   돌발 현안은 설계상 민심 flag 를 **세우라고 만든 것**이라
    //   그게 사라지는 건 훼손이 아니라 제거가 작동한 증거다.
    단서수: cluesOf(build).count,
    섭정: build.summary['섭정'] ?? '(없음)',
  }
}

/** 관측용 — 클루의 절대 날짜 열(월 포함). 판정엔 안 쓰고 이동만 보고한다. */
const clueDatesOf = (build) =>
  clueEventsOf(build).map((e) => `${e.date} ${e.title}`)

/** 영향도는 따로 본다 — 제거된 보상을 받는 빌드에서만 달라져야 한다. */
const influenceOf = (build) => build.summary['영향도 추이'] ?? '(없음)'

/** 추이의 **마지막** 나이 값(최종 영향도). "…20세:97 | 최저 5" → 97. */
const finalInf = (build) => {
  const ms = [...influenceOf(build).matchAll(/(\d+)세:(\d+)/g)]
  return ms.length ? Number(ms[ms.length - 1][2]) : null
}

/**
 * 제거된 콘텐츠 중 **영향도를 건드리는 것**은 둘이다.
 *   1) 두루마리(④ 장치) — 영향도 +18 을 직접 준다.
 *   2) 혈서 적대 루트에서 **"명분을 들어 심판한다"를 실제로 고른 빌드** — 이 선택지가
 *      세우는 **명분 flag** 가 뒤이은 '포상이라는 족쇄' 사슬의 영향도 보상을 바꾼다.
 *      혈서를 들어내면 그 빌드는 "명분 없이 처분한다"로 떨어져 영향도 궤적이 갈린다 —
 *      미스터리·최종 영향도는 그대로이고(둘 다 20세:97, 결렬), 갈리는 것은 19세 중간
 *      스냅샷 하나뿐이다. 즉 제거된 콘텐츠의 산출물 그 자체이지 훼손이 아니다.
 *
 * ★ 예측 기준은 '가문 수색' **등장**이 아니라 '명분을 들어 심판한다' **선택**이다.
 *   가문 수색은 A·B·C·F·J 등 7개 빌드에 뜨지만(17세+·영향도45+ 조건), 그 이벤트 자체는
 *   영향도를 건드리지 않아 제거해도 그 빌드들의 궤적은 바이트 단위로 동일하다.
 *   영향도가 갈리는 건 명분 심판 사슬을 실제로 밟은 H 하나뿐 — 그래서 선택을 본다.
 *
 * ★ 이 갈래는 108턴 전환 전에도 존재했으나, 그때는 나이당 스냅샷이 대략 1개라 중간
 *   차이를 건너뛰어 안 잡혔다. 12턴/나이가 되며 나이당 ~2 스냅샷을 찍자 그 순간이
 *   드러난 것 — 새 결함이 아니라 표본이 촘촘해져 노출된 기존 갈래다.
 *
 * 그래서 영향도가 달라져도 되는 빌드 = 두루마리 수령 빌드 + 명분 심판을 고른 빌드.
 */
const JUDGED_WITH_CAUSE = (build) =>
  build.events.some((e) => e.picked === '명분을 들어 심판한다')
const RECEIVES_ABLATED_REWARD = (build) =>
  INCIDENT_MODE || HARDEX_MODE
    // 돌발·청산은 영향도에 손대지 못한다(청산은 flag 만 세운다).
    // 그래서 영향도 추이는 어느 빌드에서도 달라지면 안 된다.
    ? false
    : build.events.some((e) => e.title === '두루마리') || JUDGED_WITH_CAUSE(build)

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
  normalOut = await runSimulate(BASE_ENV, '정상')
  log('▶ 2/2 제거 빌드…')
  ablatedOut = await runSimulate({ ...BASE_ENV, QUEENING_ABLATE: ABLATE }, '제거')

  writeFileSync(join(OUT, 'normal.log'), normalOut)
  writeFileSync(join(OUT, 'ablated.log'), ablatedOut)
}

const normal = parse(normalOut)
const ablated = parse(ablatedOut)

// 제거된 콘텐츠가 실제로 사라졌는지부터 — 안 사라졌으면 비교가 무의미하다
const ABLATED_TITLES = INCIDENT_MODE
  ? ['늦서리']
  : HARDEX_MODE
    // 시뮬에서 실제로 뜨는 것 — 청산(결정적 씬은 호감도가 없어 안 뜬다).
    ? ['역적의 핏줄', '급진의 상징', '포상이라는 족쇄', '아홉 대의 자리', '무너진 자리', '남은 이름']
    : [
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
  // 관측: 구조(순서·나이)는 같아도 절대 월이 밀린 클루가 있으면 남긴다 —
  // 판정이 아니라 기록이다(돌발이 턴을 점유해 생기는 정상 이동을 숨기지 않기 위함).
  const dn = clueDatesOf(normal[key])
  const da = clueDatesOf(ablated[key])
  const shifted = dn
    .map((s, i) => (da[i] && s !== da[i] ? `${s}  ↔  ${da[i]}` : null))
    .filter(Boolean)
  if (shifted.length) {
    log(`     ⓘ 절대 월 이동(구조는 불변, 돌발 턴 점유의 산출물):`)
    for (const s of shifted) log(`        ${s}`)
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
  // 영향도를 건드리는 제거 콘텐츠가 어느 것인지 이름을 붙인다(진단을 정직하게).
  const reason = normal[key].events.some((e) => e.title === '두루마리')
    ? '두루마리(+18)'
    : JUDGED_WITH_CAUSE(normal[key])
      ? '혈서 명분 심판 사슬'
      : '없음'
  // ★ 돌발 모드의 예외: 늦서리는 영향도 효과가 **없다**(deltas 에 courtInfluence 없음).
  //   그런데도 궤적이 갈리는 건 돌발이 턴을 점유해 그 턴에 뜰 다른 영향도 이벤트를
  //   한 칸 밀기 때문이다 — 클루 월 이동과 **같은 현상**이고, 사용자가 "양념으로 수용"
  //   한 그 갈래다. 최종 영향도가 같으면(수렴하면) 훼손이 아니라 전이적 산출물이므로
  //   판정이 아니라 관측으로 남긴다. 최종이 갈리면(수렴 안 하면) 여전히 실패다.
  const converged = finalInf(normal[key]) === finalInf(ablated[key])
  const transientIncidentBlip = INCIDENT_MODE && !expected && !same && converged
  if (transientIncidentBlip) {
    log('')
    log(`   ${normal[key].name}  ⓘ 중간 영향도 전이차 (최종 ${finalInf(normal[key])} 로 수렴, 돌발 턴 점유)`)
    log(`     정상: ${influenceOf(normal[key])}`)
    log(`     제거: ${influenceOf(ablated[key])}`)
  } else if (same === expected) {
    // 보상을 받는데 같거나, 안 받는데 다르면 문제다
    influenceOk = false
    log('')
    log(`   ${normal[key].name}  *** 예상과 다름 ***`)
    log(`     제거 영향도원(${reason}) 수령: ${expected} / 영향도 동일: ${same}`)
    log(`     정상: ${influenceOf(normal[key])}`)
    log(`     제거: ${influenceOf(ablated[key])}`)
  } else if (!same) {
    log('')
    log(`   ${normal[key].name}  — ${reason} 수령 빌드, 차이는 설계대로`)
    log(`     정상: ${influenceOf(normal[key])}`)
    log(`     제거: ${influenceOf(ablated[key])}`)
  }
}
log('')
log('D1 ★ 영향도 차이는 제거된 영향도원(두루마리·혈서 적대)을 받는 빌드에만 나타남:', ok(influenceOk))
log('   → 차이가 "제거된 보상만큼"이라는 것은 ablation 이 작동했다는 증거다.')

// ─────────────────────────────────────────────────────────────
log('')
log('=== E. 민심 flag — 제거한 콘텐츠가 만들던 것만 사라지는가 ===')
// 돌발이 세울 수 있는 민심 flag(clamp 의 열거 목록 중 돌발 소재에 해당하는 것)
const INCIDENT_FLAGS = ['people_relieved_harvest', 'people_burdened_harvest']
let peopleOk = true
for (const key of buildKeys) {
  const a = cluesOf(normal[key]).people
  const b = cluesOf(ablated[key]).people
  const onlyInNormal = a.filter((f) => !b.includes(f))
  const onlyInAblated = b.filter((f) => !a.includes(f))

  // 제거 빌드에만 있는 flag 는 어느 모드에서도 있으면 안 된다
  if (onlyInAblated.length) {
    peopleOk = false
    log(`   ${normal[key].name}  *** 제거 빌드에만 있는 flag: ${onlyInAblated.join(', ')} ***`)
    continue
  }
  // 정상 빌드에만 있는 것은, 돌발 모드에서는 돌발이 만든 것이어야 한다
  const unexpected = onlyInNormal.filter(
    (f) => !(INCIDENT_MODE && INCIDENT_FLAGS.includes(f)),
  )
  if (unexpected.length) {
    peopleOk = false
    log(`   ${normal[key].name}  *** 설명되지 않는 차이: ${unexpected.join(', ')} ***`)
  } else if (onlyInNormal.length) {
    log(`   ${normal[key].name}  — 사라진 flag: ${onlyInNormal.join(', ')} (돌발이 만들던 것)`)
  }
}
log('')
log('E1 ★ 손으로 쓴 이벤트의 민심 flag 는 그대로:', ok(peopleOk))

// 결정론 모드가 실제로 결정론적인지 — 이게 안 되면 위 비교가 성립하지 않는다
log('')
log('=== C. 비교의 전제 — 결정론 모드가 정말 결정론적인가 ===')
let repeatOut
if (REPLAY) {
  log('   저장된 재실행 로그로 대조합니다.')
  repeatOut = readFileSync(join(OUT, 'normal-repeat.log'), 'utf8')
} else {
  log('   정상 빌드를 한 번 더 돌려 자기 자신과 대조합니다…')
  repeatOut = await runSimulate(BASE_ENV, '정상(재실행)')
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
const passed = allSame && selfSame && influenceOk && peopleOk
if (!passed) {
  log('★ 결론: 예상 밖의 차이가 있다. 위 불일치 항목을 확인할 것.')
} else if (INCIDENT_MODE) {
  log('★ 결론: 돌발 현안을 정상보다 10배 이상 자주 터뜨린 상태에서도,')
  log('  실제로 들어냈을 때 미스터리 로그가 동일하다.')
  log('  차이는 돌발이 만들던 민심 flag 하나뿐 — 제거한 콘텐츠의 산출물 그 자체다.')
  log('  "돌발은 양념"이 의도가 아니라 결과로 확정됐다.')
} else if (HARDEX_MODE) {
  log('★ 결론: 청산 이벤트를 실제로 들어내도 미스터리 로그가 동일하다.')
  log('  청산은 flag 만 세우고 미스터리·영향도·민심에 손대지 않는다 — 무손상이 결과로 확정됐다.')
} else {
  log('★ 결론: 3c 장치를 실제로 들어내도 미스터리 로그가 동일하다.')
  log('  유일한 차이는 두루마리(+18)를 받는 빌드의 영향도이고, 그건 제거된 보상 그 자체다.')
  log('  무손상이 의도가 아니라 결과로 확정됐다.')
}
log('로그:', OUT)
