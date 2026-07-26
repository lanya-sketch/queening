/**
 * 세이브 다중 슬롯 + Export/Import 검증 (세이브 시스템 라운드).
 *
 * A. 슬롯 5칸 — 저장/로드 왕복, activeSlot 추적, 빈 칸 표시.
 * B. 요약 필드 — 이름·나이·즉위 N년 M월·저장시각·버전.
 * C. Export/Import — 텍스트 코드 왕복(QUEENING1:) + state 보존.
 * D. Import 거부(사유별) — 형식 아님 / 손상(변조) / 미래 버전.
 * E. 옛 단일 세이브 → slot0 자동 이관(부팅 1회, slot0 비었을 때만).
 * F. ★ 「처음부터」 — 슬롯 5개·갤러리·읽음기록이 남아 있는지.
 * G. ★ 「전체 초기화」 — 슬롯+갤러리+읽음기록은 지우고 옵션은 남기는지.
 * H. 슬롯 화면 UI — 저장(덮어쓰기 확인)·불러오기.
 */
import { APP_URL, enterGame, launch, log, ok, SAVE_VERSION } from './helpers.mjs'

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(200)

const setGame = (patch) => page.evaluate((p) => window.__queeningAi.setGame(p), patch)
const bridge = (fn, ...args) =>
  page.evaluate(({ f, a }) => window.__queeningAi.save[f](...a), { f: fn, a: args })
const gameState = () => page.evaluate(() => window.__queeningAi.state)

const SLOT_KEY = (i) => `queening.save.slot${i}`

// ── A. 슬롯 5칸 저장/로드 ──────────────────────────────────
log('=== A. 슬롯 5칸 저장/로드 ===')
await setGame({ monarchName: '카이로스', age: 15, date: { year: 4, month: 3 } })
await bridge('saveSlot', 0)
let slots = await bridge('slots')
log('A1 slot0 저장됨(비어 있지 않음):', ok(!slots[0].empty && slots.slice(1).every((s) => s.empty)))
log('A2 activeSlot === 0:', ok((await bridge('activeSlot')) === 0))

await setGame({ monarchName: '카이로스', age: 16, date: { year: 5, month: 7 } })
await bridge('saveSlot', 2)
slots = await bridge('slots')
log('A3 slot2 도 저장 · 서로 다른 나이:',
  `${slots[0].age}/${slots[2].age}`, ok(slots[0].age === 15 && slots[2].age === 16))
log('A4 빈 슬롯(1·3·4)은 empty:', ok([1, 3, 4].every((i) => slots[i].empty)))

// slot0 로드 → 15세로 되돌아간다.
await bridge('loadSlot', 0)
log('A5 slot0 로드 → 나이 복원(15):', (await gameState()).age, ok((await gameState()).age === 15))
log('A6 로드 후 activeSlot === 0:', ok((await bridge('activeSlot')) === 0))

// ── B. 요약 필드 ──────────────────────────────────────────
log('')
log('=== B. 요약 필드 ===')
const s0 = (await bridge('slots'))[0]
log('B1 이름:', s0.monarchName, ok(s0.monarchName === '카이로스'))
log('B2 나이:', s0.age, ok(s0.age === 15))
log('B3 즉위 N년 M월:', `${s0.reignYear}/${s0.reignMonth}`, ok(s0.reignYear === 4 && s0.reignMonth === 3))
log('B4 저장시각 존재:', ok(typeof s0.savedAt === 'string' && s0.savedAt.length > 0))
log('B5 버전:', s0.version, ok(s0.version === SAVE_VERSION))

// ── C. Export / Import 왕복 ───────────────────────────────
log('')
log('=== C. Export/Import 왕복 ===')
const code = await bridge('exportSlot', 0)
log('C1 코드가 QUEENING1: 헤더로 시작:', ok(typeof code === 'string' && code.startsWith('QUEENING1:')))
const imported = await bridge('importCode', code)
log('C2 가져오기 통과 · 나이 보존(15):', ok(imported.ok && imported.state.age === 15))
log('C3 가져온 버전:', imported.version, ok(imported.version === SAVE_VERSION))
log('C4 이름 보존:', ok(imported.state.monarchName === '카이로스'))

// ── D. Import 거부 (사유별) ───────────────────────────────
log('')
log('=== D. Import 거부 (사유별) ===')
const notFile = await bridge('importCode', '이건 그냥 텍스트')
log('D1 형식 아님 → "세이브 파일이 아닙니다":', notFile.reason,
  ok(!notFile.ok && notFile.reason.includes('세이브 파일이')))

// 손상 — base64 를 디코드해 state 를 변조하되 crc 는 그대로 두면 검증 불일치.
const tampered = await page.evaluate((c) => {
  const b64 = c.slice('QUEENING1:'.length)
  const json = new TextDecoder().decode(Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0)))
  const env = JSON.parse(json)
  env.state.age = 99 // crc 는 안 고침 → 불일치
  const bytes = new TextEncoder().encode(JSON.stringify(env))
  let bin = ''
  for (const byte of bytes) bin += String.fromCharCode(byte)
  return 'QUEENING1:' + btoa(bin)
}, code)
const corrupt = await bridge('importCode', tampered)
log('D2 변조 → "손상된 파일"(검증 불일치):', corrupt.reason,
  ok(!corrupt.ok && corrupt.reason.includes('손상')))

// 미래 버전 — v 만 올린다(crc 는 state 기준이라 그대로 유효). → 최신이라 못 읽음.
const future = await page.evaluate((c) => {
  const b64 = c.slice('QUEENING1:'.length)
  const json = new TextDecoder().decode(Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0)))
  const env = JSON.parse(json)
  env.v = 999
  const bytes = new TextEncoder().encode(JSON.stringify(env))
  let bin = ''
  for (const byte of bytes) bin += String.fromCharCode(byte)
  return 'QUEENING1:' + btoa(bin)
}, code)
const fut = await bridge('importCode', future)
log('D3 미래 버전 → "최신이라 못 읽음":', fut.reason,
  ok(!fut.ok && fut.reason.includes('최신')))

const badB64 = await bridge('importCode', 'QUEENING1:@@@не base64@@@')
log('D4 헤더는 맞지만 디코드 실패 → "손상":', badB64.reason,
  ok(!badB64.ok && badB64.reason.includes('손상')))

// ── E. 옛 단일 세이브 → slot0 이관 ────────────────────────
log('')
log('=== E. 옛 단일 세이브 → slot0 자동 이관 ===')
await page.evaluate(() => {
  localStorage.clear()
  // 옛 단일 키(v7) 를 심는다 — 지금 플레이 중인 세이브를 흉내.
  localStorage.setItem('queening.save', JSON.stringify({
    version: 7, savedAt: '2026-04-04T00:00:00.000Z',
    state: {
      date: { year: 2, month: 5 }, age: 13, monarchGender: 'female',
      stats: { statecraft: 20, finance: 10, rhetoric: 10, martial: 10, courtcraft: 10 },
      wellbeing: 60, tutorTrust: 30, regentSuspicion: 10, regentRapport: 20,
      courtInfluence: 10, durability: 12, actionPoints: 3, plannedActivityIds: [],
      flags: {}, phase: 'schedule', lastTurnReport: null, pendingEventIds: [],
      currentOutfitId: 'office', affection: {}, counters: {},
    },
  }))
})
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(200)
const migratedSlots = await bridge('slots')
const legacyGone = await page.evaluate(() => localStorage.getItem('queening.save') === null)
log('E1 옛 키가 slot0 으로 이관(13세):', migratedSlots[0].age, ok(migratedSlots[0].age === 13))
log('E2 옛 단일 키는 제거됨:', ok(legacyGone))
log('E3 slot0 로드 가능(마이그레이션 후 v8):', ok(!migratedSlots[0].empty && !migratedSlots[0].incompatible))
// slot0 이 이미 있으면 이관이 덮어쓰지 않는다.
await page.evaluate((k) => {
  localStorage.setItem('queening.save', JSON.stringify({ version: 8, savedAt: 'x', state: { age: 99 } }))
  // slot0 은 그대로 둔 채 이관 재실행
}, SLOT_KEY(0))
await bridge('migrateLegacy')
const afterReMigrate = await bridge('slots')
log('E4 slot0 이 차 있으면 재이관이 덮어쓰지 않음(13세 유지):',
  afterReMigrate[0].age, ok(afterReMigrate[0].age === 13))

// ── F. ★ 「처음부터」 — 슬롯·갤러리·읽음기록 보존 ─────────
log('')
log('=== F. ★ 「처음부터」 슬롯·갤러리·읽음기록 보존 ===')
await page.evaluate(() => {
  localStorage.clear()
  // 갤러리·읽음기록·옵션을 심는다(전역 키).
  localStorage.setItem('queening.gallery', JSON.stringify(['ending_wise', 'ending_iron']))
  localStorage.setItem('queening.gallery.names', JSON.stringify({ ending_wise: '카이로스' }))
  localStorage.setItem('queening.readlog', JSON.stringify(['scene-debut-ball', 'scene-x']))
  localStorage.setItem('queening.options', JSON.stringify({ textSpeed: '빠르게', cutsceneEnabled: false }))
})
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(150)
// 슬롯 2개 저장.
await setGame({ monarchName: '아일라', age: 14, date: { year: 3, month: 2 } })
await bridge('saveSlot', 0)
await setGame({ age: 17, date: { year: 6, month: 9 } })
await bridge('saveSlot', 3)
const beforeGlobals = await bridge('globals')
// 「처음부터」 = reset (슬롯 보존).
await bridge('reset')
const afterSlots = await bridge('slots')
const afterGlobals = await bridge('globals')
log('F1 ★ 처음부터 후에도 slot0·slot3 남아 있음:',
  ok(!afterSlots[0].empty && !afterSlots[3].empty))
log('F2 ★ 갤러리 유지:', `${afterGlobals.gallery.length}개`,
  ok(afterGlobals.gallery.length === beforeGlobals.gallery.length && afterGlobals.gallery.length === 2))
log('F3 ★ 읽음기록 유지:', `${afterGlobals.readlog.length}개`,
  ok(afterGlobals.readlog.length === 2))
// ★ enterGame 이 textSpeed 를 '즉시'로 덮으므로, enterGame 이 건드리지 않는
//   cutsceneEnabled:false(기본값 true 와 다른 값)로 "내가 심은 옵션이 살아남았는지"를 본다.
log('F4 ★ 옵션 유지(삭제 안 됨):', JSON.stringify(afterGlobals.options),
  ok(afterGlobals.options != null && afterGlobals.options.cutsceneEnabled === false))
log('F5 진행 중 게임은 새로 시작(activeSlot null):', ok((await bridge('activeSlot')) === null))

// ── G. ★ 「전체 초기화」 — 셋 삭제, 옵션 보존 ──────────────
log('')
log('=== G. ★ 「전체 초기화」 (UI 위험영역, 마찰 포함) ===')
// 설정 오버레이 열기.
await page.locator('[data-settings-button]').click()
await page.waitForTimeout(150)
await page.locator('[data-danger-open]').click()
await page.waitForTimeout(100)
// 마찰 — 정확한 문구 전에는 삭제 버튼이 비활성.
const disabledBefore = await page.locator('[data-danger-confirm]').isDisabled()
log('G1 문구 입력 전 「영구 삭제」 비활성:', ok(disabledBefore))
await page.locator('[data-danger-input]').fill('아무거나')
log('G2 틀린 문구면 여전히 비활성:', ok(await page.locator('[data-danger-confirm]').isDisabled()))
await page.locator('[data-danger-input]').fill('초기화')
log('G3 "초기화" 입력 → 삭제 버튼 활성:', ok(!(await page.locator('[data-danger-confirm]').isDisabled())))
await page.locator('[data-danger-confirm]').click()
await page.waitForTimeout(250)
const wiped = await page.evaluate(() => ({
  slots: [0, 1, 2, 3, 4].map((i) => localStorage.getItem(`queening.save.slot${i}`)),
  gallery: localStorage.getItem('queening.gallery'),
  galleryNames: localStorage.getItem('queening.gallery.names'),
  readlog: localStorage.getItem('queening.readlog'),
  options: localStorage.getItem('queening.options'),
}))
log('G4 ★ 슬롯 5개 전부 삭제:', ok(wiped.slots.every((v) => v === null)))
log('G5 ★ 갤러리(+이름) 삭제:', ok(wiped.gallery === null && wiped.galleryNames === null))
log('G6 ★ 읽음기록 삭제:', ok(wiped.readlog === null))
log('G7 ★ 옵션은 남음(삭제 안 됨):', wiped.options,
  ok(wiped.options !== null && JSON.parse(wiped.options).cutsceneEnabled === false))
log('G8 타이틀로 이동(전체 초기화 후):', ok(await page.locator('[data-screen="title"]').isVisible()))

// ── H. 슬롯 화면 UI (저장·덮어쓰기·불러오기) ──────────────
log('')
log('=== H. 슬롯 화면 UI ===')
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(150)
await setGame({ monarchName: '카이로스', age: 12, date: { year: 1, month: 4 } })
// 저장 → 슬롯 화면 → 빈 슬롯0 클릭(바로 저장).
await page.getByRole('button', { name: '저장', exact: true }).click()
await page.locator('[data-screen="slots"]').waitFor()
log('H1 「저장」이 슬롯 화면을 연다:', ok(await page.locator('[data-slot-mode="save"]').isVisible()))
log('H2 빈 슬롯은 "비어 있음":',
  ok((await page.locator('[data-slot="0"]').innerText()).includes('비어 있음')))
await page.locator('[data-slot="0"]').click()
await page.locator('[data-screen="slots"]').waitFor({ state: 'detached' })
log('H3 빈 슬롯 저장 후 화면 닫힘:', ok((await bridge('slots'))[0].age === 12))

// 나이 바꾸고 같은 슬롯에 저장 → 덮어쓰기 확인이 뜬다.
await setGame({ age: 18 })
await page.getByRole('button', { name: '저장', exact: true }).click()
await page.locator('[data-screen="slots"]').waitFor()
await page.locator('[data-slot="0"]').click()
await page.waitForTimeout(80)
log('H4 찬 슬롯 저장 → 덮어쓰기 확인 노출:', ok(await page.locator('[data-slot-overwrite]').isVisible()))
await page.locator('[data-slot-overwrite]').click()
await page.locator('[data-screen="slots"]').waitFor({ state: 'detached' })
log('H5 덮어쓰기 → 18세로 갱신:', (await bridge('slots'))[0].age, ok((await bridge('slots'))[0].age === 18))

// 불러오기 → 슬롯 화면 → slot0 → 로드.
await setGame({ age: 11 })
await page.getByRole('button', { name: '불러오기', exact: true }).click()
await page.locator('[data-screen="slots"]').waitFor()
log('H6 「불러오기」가 슬롯 화면을 연다:', ok(await page.locator('[data-slot-mode="load"]').isVisible()))
await page.locator('[data-slot="0"]').click()
await page.locator('[data-screen="slots"]').waitFor({ state: 'detached' })
log('H7 불러오기 → 18세 복원:', (await gameState()).age, ok((await gameState()).age === 18))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : '*** FAIL ***\n  ' + errors.join('\n  '))
await browser.close()
