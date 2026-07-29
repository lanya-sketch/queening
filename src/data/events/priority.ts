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
  // ★ 조기 데드엔딩(월 단위 전환 2단계) — 위기·경고. 진실 회수(90+)보다는 아래(터미널이라도
  //   되돌릴 수 없는 진실이 먼저), 나머지 마일스톤보다는 위(굶으면 안 되는 것들이라).
  'strain-collapse': 89,
  'exposure-strike': 87,
  'strain-warning': 85,
  'exposure-warning': 83,
  // ★ [3] 반란 — 위기는 최상단(진실 회수와 같은 90: 친정 후 옥좌가 걸린 일). 경고는 마일스톤
  //   대역(75)으로 내려 다른 데드 경고와 동률을 피한다. 친정 후에만 조건이 열려 경쟁 자체가 드물다.
  'rebellion-strike': 90,
  // ★ [3] 암살 — 반란(90)과 같은 위기 대역, 반란보다 먼저 오지만(counter 9<15) 유일값으로 둔다.
  'assassination-attempt': 89.5,
  'rebellion-warning': 75,
  'regent-warning': 88,
  'adult-regent-rupture': 86,
  // ★ [3] 판세 충족 담판(명예 퇴장) — 애매한 동맹(accord 84)보다 위. 결렬(86)과는 배타(tide_turned).
  'adult-regent-accord-retire': 85.5,
  'adult-regent-accord': 84,
  'adult-coming-of-age': 82,
  // 튜터 해고 — 위기·경고(심신·의심 데드와 같은 대역). 굶으면 안 된다.
  'tutor-dismissal': 81,
  'tutor-warning': 79,
  // 외출 발각 — 잠행 그 턴의 직접 결과라 현안에 밀리면 안 된다(마일스톤 대역 아래끝).
  'outing-caught': 77,
  'debut-ball': 80,
  'hero-at-court': 78,
  'adult-inner-court': 76,
  // ★ [3] 연례 가을 연회(10월) — 나이대별 배타라 서로 안 겹치고, 10월은 한산해 어김없이 뜬다.
  'autumn-banquet-child': 73.5,
  'autumn-banquet-youth': 73.6,
  'autumn-banquet-court': 73.7,
  'teen-first-policy': 74,
  // ★ 혈서 확증은 처분보다 **먼저** 와야 한다 — 증거를 맞춘 뒤에 처분해야 "명분 있는 처분"
  //   선택지가 열린다. 둘째 반쪽을 19세에 얻으면 처분(72)과 같은 턴에 경쟁하는데, 예전엔
  //   확증이 59(미스터리 파생)라 처분에 밀려 "처분 뒤에 혈서가 완성"되는 역전이 났다.
  //   그래서 확증만 마일스톤 대역으로 올려 처분 바로 위에 둔다(진실 회수 90+ 보다는 아래).
  'blood-oath-complete': 73,
  // 엔딩 직전의 갈림길. 마일스톤 대역의 아래쪽 —
  // 진실 회수(90+)보다는 반드시 뒤에 와야 한다(증거를 얻은 뒤에 처분한다).
  'regent-disposal': 72,

  // ── 60–69 캐릭터: 결정적 씬(홀수) + 고유장치·등장(짝수)
  // ★ 결정적 씬은 로맨스 확정의 정점이라, 같은 계절에 고유장치와 겹치면
  //   확정(관계의 큰 매듭)이 장치 해금보다 먼저 표시되게 홀수 슬롯(위)에 둔다.
  'decisive-heir': 69,
  'hero-sacred-scroll': 68,
  'decisive-loyalist': 67,
  'commander-father-audience': 66,
  'decisive-prince': 65,
  'union-possible': 64,
  'decisive-commander': 63,
  'prince-departure': 62,
  'decisive-hero': 61,
  'prince-arrival': 60,

  // ── 60.x  13~15세 관계 이벤트 (teenBonds) — 로맨스 아님, 첫인상의 결이 바뀌는 구간.
  //   캐릭터 대역 안(현안보다 위)에 둬야 month 게이트가 걸린 그달에 어김없이 뜬다 —
  //   현안(30–49)에 밀려 다음 턴으로 넘어가면 달이 바뀌어 조건이 영영 안 맞는다.
  //   전부 once + met_<id> 게이트 + 서로 다른 달이라 실제 경쟁은 거의 없고,
  //   소수 슬롯은 정렬 순서만 정한다(값 자체엔 의미 없음). 등장(60)과 결정적 씬(61) 사이.
  'bond-loyalist-beside': 60.95,
  'bond-commander-outside': 60.9,
  'bond-heir-appraise': 60.8,
  'bond-loyalist-caution': 60.7,
  'bond-commander-threshold': 60.6,
  'bond-prince-revisit': 60.5,
  'bond-heir-shadow': 60.4,
  'bond-loyalist-father': 60.3,
  'bond-commander-restraint': 60.2,
  'bond-prince-spar': 60.1,

  // ── 60.0x  16~19세 관계 심화 (relations16) — 데뷔탕트~결정적 씬 사이, 로맨스로 기울되 확정 안 함.
  //   호감도+달 게이트라 실경쟁은 거의 없다. 캐릭터 대역 안(현안 위), teenBonds(60.1~) 아래.
  'relation-heir-1': 60.09,
  'relation-heir-2': 60.085,
  'relation-heir-3': 60.08,
  'relation-commander-1': 60.07,
  'relation-commander-2': 60.065,
  'relation-commander-3': 60.06,
  'relation-loyalist-1': 60.05,
  'relation-loyalist-2': 60.045,
  'relation-prince-1': 60.04,
  'relation-prince-2': 60.035,
  'relation-hero-1': 60.03,
  'relation-hero-2': 60.025,

  // ── 50–59 미스터리 파생(혈서). 진실 회수(90+)보다 반드시 아래 —
  //    확증은 앎의 뒤에 오는 것이지 앎을 앞지를 수 없다.
  // (blood-oath-complete 는 처분보다 먼저 와야 해서 마일스톤 대역 73 으로 올렸다 — 위 참조.)
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
  // ③ 정복은 능동 야망 — 미스터리 파생 대역 아래끝에 유일값으로.
  'prince-conquest': 50,

  // 모후의 약 중반 전개 — 침실 발각(chamber-caught 56) 하류. 전부 queen_poison_path
  //   게이트 + once + 나이라 실경쟁은 거의 없다(안 탄 플레이엔 아예 안 뜬다).
  //   결정적 씬(60+)에 밀리면 다음 턴으로 넘어가되, 20세 전에 위기(E3)까지 소화된다.
  'poison-resumes': 50.7,
  'poison-fog': 50.6,
  'poison-crisis': 50.5,

  // ── 30–49 정치 현안 + 청산(위쪽)
  // 청산은 19세+ 의 정치 행위라 이 대역 맨 위에 둔다 — 일상 현안보다 앞서되
  // 진실·마일스톤·처분보다는 뒤. heir 청산은 disposal(72) 이 regent_disposed 를
  // 세운 뒤라야 조건이 서므로, disposal 보다 낮은 것이 맞다(같은 턴 연쇄).
  'heir-reckoning': 49,
  'loyalist-reckoning': 48,
  'hero-reckoning': 47,
  'commander-reckoning': 45,
  'issue-house-of-commons': 46,
  'issue-frontier-raid': 44,
  // 후반 현안(17~19세) — 전반 현안과 같은 정치 대역, 서로 다른 달·나이라 실경쟁은 없다.
  'issue-empire-investiture': 43,
  'issue-empire-tribute': 42,
  'issue-lords-season': 41,
  'teen-noble-check': 40,
  'issue-late-king': 39,

  // ── 1–9 유년기 인물 (배경보다도 먼저 양보) ─────────────────
  // 위화감 씨앗(11~12세)과 첫 등장(13세). 전부 once 이고 서로 다른 달에 걸려 있어
  // 경쟁이 거의 없으므로 가장 낮게 둔다 — 무엇이 겹쳐도 그것에 자리를 내준다.
  // 13세 첫 등장은 그달의 유일한 서사라 낮은 값으로도 어김없이 뜬다.
  // ★ 1~6 만 비어 있어 8개가 안 들어가므로 소수 슬롯을 쓴다 — 값은 **정렬 순서만** 정하니
  //   무방하다. 전부 배경 대역 바닥(돌발·손편지 7~9)보다도 아래라 무엇에도 자리를 내준다.
  'child-uncle-evening': 6,
  'child-mother-room': 5,
  'child-uncle-corridor': 4,
  'child-mother-dinner': 3,
  'child-meet-heir': 2.4,
  'child-meet-loyalist': 2.3,
  'child-meet-commander': 2.2,
  'child-meet-prince': 2.1,

  // ── 10–29 배경·단서 + 청산 후일담
  // 후일담은 청산이 flag 를 세운 **다음 턴**에 온다("며칠 뒤"). 서로 배타적인
  // 호감도 구간이라 실제로 경쟁하지 않지만, 표 규칙상 값은 전부 유일하게 둔다.
  'commander-aftermath-high': 29,
  'adult-uncle-letters': 28,
  'commander-aftermath-mid': 27,
  'teen-missing-eunuch': 26,
  'commander-aftermath-low': 25,
  'teen-audit-ledger': 24,
  'heir-aftermath-high': 23,
  'youth-archive-night': 22,
  'loyalist-aftermath-high': 21,
  'youth-sealed-record': 20,
  'hero-aftermath-high': 19,
  // 측실 후일담 — 청산 후일담과 같은 대역, 서로 배타(같은 캐릭터에 하나만).
  'commander-concubine-high': 18,
  'commander-concubine-mid': 17,
  'youth-mother-tea': 16,
  'commander-concubine-low': 15,
  'heir-concubine-high': 14,
  'loyalist-concubine-high': 13,
  'first-audience': 12,
  // 깜짝(데드 아님) 플레이버 — 배경 대역, 확률 게이팅.
  'surprise-old-nurse': 11,
  'hero-concubine-high': 10,
  'surprise-stranger-letter': 9,

  // ★ 돌발 현안은 배경 대역의 **바닥**이다. 무엇에도 앞서지 않는다 —
  //   청산 후일담(감정 비트)까지 포함해 모든 이벤트보다 낮아야 한다.
  //   (측실 후일담이 늘면서 8/7 로 더 내렸다. 바닥 불변식 유지.)
  'ai-incident-choice': 8,
  'ai-incident-notice': 7,

  // ④ 변경 소문 — 입궁 전 인물화. 순수 플레이버라 배경 대역이되, 돌발(7/8)보다는
  //   위에 둔다(조용한 달에 걸려 경쟁이 없으나 표 규칙상 유일값). 바닥 불변식(7/8) 유지.
  'rumor-frontier-1': 9.3,
  'rumor-frontier-2': 9.2,
  'rumor-frontier-3': 9.1,
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
