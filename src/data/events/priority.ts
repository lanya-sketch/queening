/**
 * 이벤트 우선순위 — 대역제.
 *
 * 같은 계절에 여러 이벤트가 조건을 만족하면 priority 가 큰 것부터 발동하고,
 * 턴당 상한(MAX_EVENTS_PER_TURN) 때문에 밀린 것은 다음 계절로 넘어간다.
 * 그래서 동률은 발동 순서를 배열 순서에 맡기는 숨은 부채였다 —
 * 확률 이벤트가 늘어나면 터질 부채라 여기서 갚는다.
 * **모든 이벤트는 유일한 priority 를 가지며, 값은 전부 이 표에서만 온다.**
 *
 * 대역:
 *   90–99  진실 회수 — 되돌릴 수 없는 것. 무엇에도 밀리면 안 된다.
 *   70–89  고정 서사 마일스톤 — 날짜가 정해진 것.
 *   60–69  캐릭터 등장/퇴장 — 체류 사이클. 현안에 밀려 굶으면 대화 기회 자체가 사라진다.
 *   50–59  미스터리 파생(혈서) — 진실의 하류. 앎을 앞지를 수 없다.
 *   30–49  정치 현안 — 몰려도 순서대로 소화되면 된다.
 *   10–29  배경·단서 — 가장 먼저 양보한다.
 *
 * ★ 대역 안의 값은 소급 적용 전의 상대 순서를 그대로 옮긴 것이다.
 *   단 하나 바뀐 게 있다: regent-warning 이 예전엔 100 으로 진실보다 위였는데,
 *   이제 진실 대역 아래로 내려왔다. "되돌릴 수 없는 것이 최우선"이라는
 *   대역 원칙을 지키기 위한 의도적 변경이며, 미스터리 타임라인 영향은 시뮬로 확인한다.
 */
export const PRIORITY: Record<string, number> = {
  // ── 90–99 진실 회수
  'truth-deep': 96,
  'truth-shallow-ledger': 94,
  'truth-shallow': 92,

  // ── 70–89 고정 서사 마일스톤
  'regent-warning': 88,
  'adult-regent-rupture': 86,
  'adult-regent-accord': 84,
  'adult-coming-of-age': 82,
  'debut-ball': 80,
  'hero-at-court': 78,
  'adult-inner-court': 76,
  'teen-first-policy': 74,
  // 엔딩 직전의 갈림길. 마일스톤 대역의 아래쪽 —
  // 진실 회수(90+)보다는 반드시 뒤에 와야 한다(증거를 얻은 뒤에 처분한다).
  'regent-disposal': 72,

  // ── 60–69 캐릭터 등장/퇴장
  // 퇴장이 등장보다 위: 체류가 끝난 계절에 퇴장이 먼저 처리돼야
  // "떠나기도 전에 또 온다"가 생기지 않는다.
  // 고유장치는 로맨스를 끝까지 끌고 가야만 열리는 희소한 순간이라,
  // 같은 계절에 겹쳐도 체류 사이클보다 먼저 표시한다.
  'hero-sacred-scroll': 68,
  'commander-father-audience': 66,
  'union-possible': 64,
  'prince-departure': 62,
  'prince-arrival': 60,

  // ── 50–59 미스터리 파생(혈서). 진실 회수(90+)보다 반드시 아래 —
  //    확증은 앎의 뒤에 오는 것이지 앎을 앞지를 수 없다.
  'blood-oath-complete': 59,
  // 탈출 성공 둘이 먼저 검사되고, 아무것도 안 걸리면 chamber-caught 가 받는다.
  // 이 세 줄의 순서가 곧 발각 판정이므로 값을 붙여 둔다.
  'chamber-escape-hide': 58,
  'chamber-escape-talk': 57,
  'chamber-caught': 56,
  'chamber-search': 55,
  'chamber-search-hinted': 54,
  // 로맨스 발설이 적대 수색보다 먼저 제시된다 — 되돌릴 수 없는 쪽을 뒤에 둔다.
  'half-heir-romance': 53,
  'half-heir-hostile': 52,
  'loyalist-chamber-hint': 51,

  // ── 30–49 정치 현안
  'issue-house-of-commons': 46,
  'issue-frontier-raid': 44,
  'issue-empire-tribute': 42,
  'teen-noble-check': 40,

  // ── 10–29 배경·단서
  'adult-uncle-letters': 28,
  'teen-missing-eunuch': 26,
  'teen-audit-ledger': 24,
  'youth-archive-night': 22,
  'youth-sealed-record': 20,
  'youth-mother-tea': 16,
  'first-audience': 12,

  // ★ 돌발 현안은 배경 대역의 **바닥**이다.
  //   양념이므로 무엇에도 앞서지 않는다. 바쁜 계절에 굶어도 되고,
  //   쿨다운이 있으니 다음 기회가 온다.
  'ai-incident-choice': 11,
  'ai-incident-notice': 10,
}

/**
 * 값을 손으로 채우는 표라서 중복은 반드시 생긴다고 보고 못 박아 둔다.
 * 개발 중에 즉시 콘솔로 알린다.
 */
if (import.meta.env?.DEV) {
  const values = Object.values(PRIORITY)
  const dupes = values.filter((v, i) => values.indexOf(v) !== i)
  if (dupes.length > 0) {
    console.error(`[priority] 우선순위 중복: ${[...new Set(dupes)].join(', ')}`)
  }
}
