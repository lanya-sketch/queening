import type { Effect, GameEvent, GameState, ResourceKey } from '../../types/game'

/**
 * ★ [4] 처분 갈래 + 연판장 (B 라운드).
 *
 * [3]이 만든 재료 위에 "잡은 뒤 어떻게 할 것인가"를 얹는다.
 *   · 연판장(連判狀) — 귀족파의 반란 모의. 집단·현재. 혈서(개인·과거)와 별개 축.
 *   · 획득: 암살 회피 → 자객 자백 소문(궁정처세/변론이 받쳐야 먹힘) → 연쇄 배신 → 연판장.
 *           또는 섭정공 집무실 수색(places). ★ ① 없이 얻는 길이 둘.
 *   · 이름들 처리 4갈래: 전부(대숙청)/주모자만(분리)/공표(피 없이 무력화)/덮어둠.
 *   · 모후 처분 3갈래: 처형(여론이 대가를 가른다)/폐탑 유폐(제3의 길)/방치.
 */

const res = (key: ResourceKey, amount: number): Effect => ({ target: { kind: 'resource', key }, amount })

// ── 섭정공 집무실 수색 (왕대비궁 chamberSearch 미러) ──
/** office-search 자동발동 차단 게이트 — 방문(planOffice)이 세우고, 그 자리에서만 수색이 열린다. */
export const OFFICE_SEARCH_OPEN = 'office_search_open'
const OFFICE_SEARCH_COURTCRAFT = 40

/** ★ [4] 연판장 존재를 아는가 — 반란 경고·자객·섭정 적대 중 하나. 집무실 부재 확률·수색 자격을 가른다. */
export function knowsTreason(game: GameState): boolean {
  const f = game.flags
  return f.rebellion_warned === true || f.assassin_evidence === true || f.regent_hostile === true
}

/** ★ [4] 섭정공 집무실 수색 자격 — 자격이면 'office-search', 아니면 null(미달→lockedGate). */
export function officeSearchEligible(game: GameState): string | null {
  if ((game.age ?? 0) < 16) return null
  if (game.flags.collective_treason === true) return null
  if (!knowsTreason(game)) return null
  if ((game.stats.courtcraft ?? 0) >= OFFICE_SEARCH_COURTCRAFT) return 'office-search'
  return null
}

export const TREASON_EVENTS: GameEvent[] = [
  {
    // ★ 섭정공 집무실 수색 — 방문 resolver(planOffice)가 부재 시 게이트를 열고 enqueue 한다.
    //   자동발동은 office_search_open 게이트로 막힌다(그 턴에만). 연판장을 확보한다.
    id: 'office-search',
    title: '섭정공의 문갑',
    text:
      '{왕}은 새 자물쇠가 걸린 문갑을 열었다. 안에는 여러 이름이 연명된 종이 한 장, 연판장이었다.\n' +
      '선왕의 중앙집권에 반발한 귀족파의 반란 모의가, 이름과 서명으로 거기 있었다.',
    condition: { minAge: 16, flags: { [OFFICE_SEARCH_OPEN]: true, collective_treason: false } },
    once: false,
    category: 'story',
    insights: [
      {
        requires: { resources: { courtStanding: { min: 55 } } },
        text: '적힌 이름이 뜻밖에 적었다. 조정이 이미 왕에게 기운 탓에, 감히 이름을 올린 자가 많지 않았다.',
      },
      {
        requires: { resources: { courtStanding: { max: 54 } } },
        text: '적힌 이름이 적지 않았다. 조정의 무게중심이 아직 섭정공 쪽이라는 뜻이었다.',
      },
    ],
    choices: [
      {
        id: 'take',
        label: '연판장을 챙긴다',
        setFlags: { collective_treason: true },
        resultText: '{왕}은 연판장을 소매에 넣었다. 이제 이 종이가, 여러 사람의 목숨을 쥔다.',
      },
    ],
  },
  {
    // ★ 자객의 입 — 암살을 막아낸 뒤(assassin_evidence), 위기를 정치적 승리로.
    //   자객이 문서를 들고 오는 게 아니라, "자백했다"는 소문이 공포를 낳고 공포가 배신을 낳는다.
    //   실제 자백 여부는 애매하다 — 믿게 만드는 게 정치다. 궁정처세/변론이 그 설득력이다.
    id: 'assassin-confession',
    title: '자객의 입',
    text:
      '사로잡힌 자객은 입을 열지 않았다. 그러나 그가 무엇을 알고 있느냐는, 사실은 중요하지 않았다.\n' +
      '"저 자가 모든 것을 자백했다"는 말 한마디면, 연명에 이름을 올린 자들은 밤잠을 설칠 것이다.\n' +
      '공포는 배신을 낳는다. 먼저 자수하려는 자가 반드시 나온다. 판을 흔들 수만 있다면.',
    condition: { minAge: 17, flags: { assassin_evidence: true, collective_treason: false } },
    once: true,
    category: 'story',
    choices: [
      {
        id: 'spread-court',
        label: '조정에 소문을 흘려 흔든다',
        requires: { stats: { courtcraft: { min: 30 } } },
        setFlags: { collective_treason: true },
        hint: '누가 먼저 무너질지 지켜본다',
        resultText:
          '{왕}은 서두르지 않고, 다만 몇 사람의 귀에 조용히 흘렸다. 자객이 다 불었다고.\n' +
          '사흘이 지나기 전에 한 백작이 제 발로 찾아와 다른 이의 이름을 댔다. 그 이름이 또 다른 ' +
          '이름을 불렀다. 무너지는 데에는 첫 장 하나면 충분했다. 연판장이, 제 발로 걸어 나왔다.',
      },
      {
        id: 'spread-rhetoric',
        label: '어전에서 자백을 공언한다',
        requires: { stats: { rhetoric: { min: 30 } } },
        setFlags: { collective_treason: true },
        hint: '말 한마디로 판을 흔든다',
        resultText:
          '{왕}은 어전에서 또렷이 말했다. "역심을 품은 자들의 이름을, 과인은 이미 알고 있다."\n' +
          '증거가 있었는지는 누구도 확인할 수 없었다. 다만 그 말투에 확신이 있었고, 확신은 ' +
          '전염된다. 그날 밤 먼저 자수하려는 발길이 이어졌고, 연판장이 그 손에 들려 나왔다.',
      },
      {
        id: 'hold',
        label: '아직 이르다 · 증거를 더 모은다',
        hint: '섭정공 집무실이라면 무언가 있을지도',
        resultText:
          '{왕}은 소문을 흘리지 않았다. 확신 없는 말은 오히려 역풍이 된다는 것을 안다.\n' +
          '증거는 소문이 아니라 물건이어야 한다. 어디에 있을지는, 짐작이 갔다.',
      },
    ],
  },
  {
    // ★ 이름들 처리 — 연판장을 손에 쥔 뒤, 적힌 이름들을 어떻게 할까. 섭정공 처분과 이어지는 자리.
    //   "범위"의 축(폭군↔정당과 다른). 봉건 vs 중앙집권과 직결된다.
    id: 'treason-names',
    title: '연판장의 이름들',
    text:
      '연판장에는 섭정공만이 아니라 여러 이름이 연명돼 있었다. 오래된 가문, 변경의 영주, ' +
      '어전에서 웃던 얼굴들.\n' +
      '이 종이 한 장으로 무엇을 할 수 있는가, 그것이 왕의 그릇을 가른다.',
    condition: { minAge: 19, flags: { collective_treason: true, treason_handled: false } },
    once: true,
    category: 'story',
    choices: [
      {
        id: 'purge-all',
        label: '연명한 자를 모두 친다',
        setFlags: { treason_handled: true, nobles_purged_all: true, crown_centralized: true },
        effects: [res('courtInfluence', 6), res('regentSuspicion', 10)],
        hint: '철저하되, 귀족 대다수를 적으로 돌린다',
        resultText:
          '{왕}은 이름 하나도 남기지 않았다. 오래된 가문들이 하루아침에 무너졌고, 변경의 영주들은 ' +
          '왕관 앞에 무릎을 꿇었다.\n' +
          '나라는 하나의 손아래 모였다. 두려움으로. 대숙청의 이름은 오래 기억될 것이다.',
      },
      {
        id: 'purge-leader',
        label: '주모자만 치고 나머지는 사면한다',
        setFlags: { treason_handled: true, nobles_purged_leader: true },
        effects: [res('courtInfluence', 3)],
        hint: '섭정공만 치고, 겁먹은 나머지는 왕의 은혜에 묶는다',
        resultText:
          '{왕}은 주모자만을 겨눴다. 나머지에게는 연판장을 보이고, 다시 이름을 올리지 않는 조건으로 ' +
          '용서했다.\n' +
          '사면받은 자는 은혜를 잊지 못하고, 은혜는 두려움보다 오래간다. 판은 조용히 왕에게 넘어왔다.',
      },
      {
        id: 'denounce',
        // ★ 공표 — 피 없이 무력화. 사람들이 왕을 믿는 판(민심 or 권세)이라야 먹힌다.
        label: '암살 모의가 있었다고 공표한다',
        requires: { flags: { king_trusted: true } },
        setFlags: { treason_handled: true, treason_denounced: true, crown_centralized: true },
        effects: [res('courtInfluence', 8)],
        hint: '피 한 방울 없이, 판을 뒤집는다',
        resultText:
          '{왕}은 아무도 죽이지 않았다. 대신 온 나라에 알렸다. 왕을 해하려는 모의가 있었고, ' +
          '왕은 그 표적이었다고.\n' +
          '왕은 피해자이자 정당한 통치자가 되었고, 연루된 귀족들은 명분을 잃었다. 선왕의 중앙집권이 ' +
          '옳았다는 것을, 반역자들 스스로가 증명한 셈이었다. 피 없이, 판이 뒤집혔다.',
      },
      {
        id: 'conceal',
        label: '덮어둔다',
        setFlags: { treason_handled: true, treason_concealed: true },
        hint: '알고도 모른 척 · 이름들은 왕의 손에 쥐여 있다',
        resultText:
          '{왕}은 연판장을 태우지 않고, 다만 깊이 넣어 두었다.\n' +
          '적힌 자들은 왕이 무엇을 아는지 모른다. 그 모름이 그들을 얌전하게 만든다. 언제든 ' +
          '꺼낼 수 있는 패는, 꺼내지 않을 때 가장 강하다.',
      },
    ],
  },
  {
    // ★ 모후 처분 — 진실이 어머니를 가리킬 때(truth_mother_mastermind). 첫 모후 처분.
    //   여론이 변수다: 왕이 어머니를 죽였다는 건 백성에게 다르게 읽힌다. 유폐 = 제3의 길.
    id: 'queen-disposal',
    title: '어머니의 처분',
    text:
      '모든 실이 한 사람에게로 모였다. 선왕을 죽음으로 몬 손이, 왕을 낳은 손과 같았다.\n' +
      '이것만은 힘으로도, 명분으로도 간단하지 않다. 어머니를 어떻게 할 것인가.',
    condition: { minAge: 19, flags: { truth_mother_mastermind: true } },
    once: true,
    category: 'story',
    choices: [
      {
        // 여론 나빠도 처형은 가능하다 — 다만 대가는 엔딩이 여론으로 가른다(피 묻은 손).
        id: 'execute',
        label: '처형한다',
        setFlags: { queen_executed: true },
        hint: '어머니를 벤 왕을, 백성은 어떻게 읽을 것인가',
        resultText:
          '{왕}은 손을 떨지 않았다. 적어도 남들 앞에서는.\n' +
          '선왕을 죽인 자에게 내리는 벌에, 그 자가 어머니라는 사실은 법 앞에서 예외가 아니었다. ' +
          '그러나 법과 사람의 마음은 다른 저울로 잰다.',
      },
      {
        id: 'confine',
        label: '폐탑에 가둔다',
        setFlags: { queen_confined: true },
        hint: '죽이지도, 용서하지도 않는다',
        resultText:
          '{왕}은 어머니를 죽이지 않았다. 다만 다시는 나올 수 없는 탑에 들였다.\n' +
          '살려두었으나 완전히 격리한, 죽이지도 용서하지도 않은 제3의 길이었다. 가장 왕다운 ' +
          '선택일지도 모른다. 그 탑의 창에 불이 켜질 때마다, {왕}은 무엇을 떠올렸을까.',
      },
      {
        id: 'leave-queen',
        label: '어머니를 그대로 둔다',
        setFlags: { queen_left: true },
        hint: '진실을 알고도, 손대지 않는다',
        resultText:
          '{왕}은 아무것도 하지 않았다. 진실을 알고도, 그 손을 잡은 것이 자신을 낳은 손이라는 것을 ' +
          '알고도.\n' +
          '용서였는지, 두려움이었는지, 아니면 그저 지친 것인지, {왕} 자신도 끝내 답하지 못했다.',
      },
    ],
  },
]
