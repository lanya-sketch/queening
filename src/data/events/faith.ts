import type { Effect, GameEvent } from '../../types/game'
import { FAITH } from '../config'

/**
 * ★ [9-A] 신앙·성물 + 제국 쇠락 서사.
 *
 * · 빈 제단 — 신앙이 얕아 ④·성검이 안 올 때, 그 사실을 알린다("고장"이 아니라 "내가 안 쌓아서").
 * · 대주교의 알현 — 신앙 깊은 왕을 교회가 알아본다(비-성물 쓰임).
 * · 두루마리(믿음 경로) — 사랑 경로(hero-sacred-scroll)와 **같은 물건**을, ④ 등장 후 신앙+대예배당
 *   누적으로 얻는 어려운 길. 둘 다 `legitimacy_sacred`(명분 성물)를 세운다 → [9-B/C]가 읽는다.
 * · 제국 쇠락 3비트 — 9년에 걸쳐 조금씩(소문→조공 급함→붕괴). 왜 신앙이 정치 자원인지의 배경.
 */
const res = (key: 'wellbeing' | 'courtInfluence' | 'courtcraft', amount: number): Effect =>
  key === 'courtcraft'
    ? { target: { kind: 'stat', key }, amount }
    : { target: { kind: 'resource', key }, amount }

export const FAITH_EVENTS: GameEvent[] = [
  {
    // ★★ ④-안-온 정상성 — 성검이 본산으로 갔음을 알려, 플레이어가 "여기 원래 성물이 있어야 하는
    //   자리인데 내가 신앙을 안 쌓아 놓쳤다"를 안다. 대예배당 조우 톤도 이 flag 로 바뀐다(visit.ts).
    id: 'empty-altar',
    title: '빈 제단',
    text:
      '대예배당에서 소식이 올라왔다. 교단이 성검을 제국의 본산으로 봉송하기로 했다는 것이다.\n' +
      '"신앙이 얕은 궁은 성물의 자리로 마땅치 않다"— 사제단의 말은 정중했으나 뜻은 분명했다.\n' +
      '마왕을 벤 검도, 그 검을 든 자도, 이제 이 나라에 오지 않는다. 있어야 할 자리가 비었다.',
    // 19세 가을(마지막 ④ 창)이 신앙 부족으로 지난 뒤. faith < heroAt · ④ 미입궁.
    condition: {
      minAge: 19, month: 11,
      flags: { hero_at_court: false, sword_to_church: false },
      resources: { faith: { max: FAITH.heroAt - 1 } },
    },
    once: true,
    priority: 47.1,
    setFlags: { sword_to_church: true },
  },

  {
    // 비-성물 쓰임 — 신앙 깊은 왕을 교회가 먼저 알아본다. church_favor 는 [9-B] 교권 루트가 읽는다.
    id: 'archbishop-audience',
    title: '대주교의 알현',
    text:
      '대주교가 몸소 왕을 찾았다. 독실한 군주에게 교회가 먼저 손을 내미는 일은 드물었다.\n' +
      '"전하께서 하늘을 공경하심을 온 교단이 압니다." 그 말은 축복이자, 훗날을 위한 포석이기도 했다.\n' +
      '{왕}은 그 인사가 무엇을 여는 문인지 아직 다 알지 못했으나, 나쁘지 않은 무게라는 것은 알았다.',
    condition: {
      minAge: 16,
      resources: { faith: { min: FAITH.scrollFaith } },
      flags: { archbishop_blessed: false },
    },
    once: true,
    priority: 46.1,
    effects: [res('wellbeing', 5)],
    setFlags: { archbishop_blessed: true, church_favor: true },
  },

  {
    // 두루마리 — 믿음 경로. 사랑 경로(hero-sacred-scroll)와 같은 legitimacy_sacred 를 세운다.
    //   ④ 등장(hero_at_court) 후 + 신앙 상위 + 대예배당 방문 누적(연쇄 발견의 근거). 어렵다.
    id: 'scroll-by-faith',
    title: '제단 아래',
    text:
      '성검이 이 궁에 있다는 것을 아는 왕은, 그 곁을 오래 살폈다. 대예배당을 드나든 밤이 쌓이고 쌓여,\n' +
      '어느 새벽 제단 아래 봉함된 것을 찾아냈다. 마왕의 자리에서 나온 오래된 두루마리 — ' +
      '그것을 가진 자를 하늘이 세운 왕으로 인정한다는, 그런 종류의 종이였다.\n' +
      '누가 바친 것이 아니라, 믿음으로 스스로 찾아낸 것이었다. 그 차이를 왕은 알았다.',
    condition: {
      minAge: 18,
      flags: { hero_at_court: true, legitimacy_sacred: false },
      resources: { faith: { min: FAITH.scrollFaith } },
      counters: { '__faith:chapel_visits': { min: FAITH.chapelVisitsForScroll } },
    },
    once: true,
    priority: 45.1,
    effects: [res('courtInfluence', 10)],
    // ★ [9-B] 성물은 하늘의 인정만(legitimacy_sacred). church_support 는 교권 경로 전용.
    setFlags: { legitimacy_sacred: true, scroll_by_faith: true },
  },

  // ── B. 제국 쇠락 서사 — 9년에 걸쳐 조금씩. 소문 → 조공 급함 → 붕괴. ──
  {
    id: 'empire-decline-1',
    title: '본국의 소문',
    text:
      '가을 조공 문서 틈에, 제국 사절의 낯빛이 예년 같지 않다는 전언이 끼어 있었다.\n' +
      '"본국이 시끄럽다더군. 교회와 황실이 서임을 두고 오래 다툰다던가." 확인할 길 없는 소문이었으나,\n' +
      '큰 나라의 안이 흔들린다는 말은, 작은 나라에는 언제나 흘려들을 수 없는 소식이었다.',
    condition: { minAge: 16, maxAge: 17, month: 11 },
    once: true,
    priority: 9.4,
    setFlags: { empire_decline_1: true },
  },
  {
    id: 'empire-decline-2',
    title: '잦아진 청구',
    text:
      '제국의 조공 요구가 잦아지고, 급해졌다. 3년에 한 번이던 사절이 해마다 왔고, 액수는 커졌다.\n' +
      '재정난의 신호였다. 안에서 다투는 나라가 밖에서 쥐어짜는 법이다.\n' +
      '{왕}은 셈했다 — 제국이 급하다는 것은, 언젠가 제국이 약하다는 뜻이 될 수도 있었다.',
    condition: { minAge: 18, month: 11, flags: { empire_decline_1: true } },
    once: true,
    priority: 9.5,
    setFlags: { empire_decline_2: true },
  },
  {
    id: 'empire-decline-3',
    title: '무너지는 상국',
    text:
      '이제 소문은 소문이 아니었다. 제국이 안팎으로 무너지고 있었다 — 교회는 황제를 파문하려 들고,\n' +
      '변경의 제후들이 등을 돌리고, 다른 전선에서는 패전이 이어졌다.\n' +
      '아홉 해 전 이 나라를 손바닥처럼 내려다보던 상국이, 이제는 제 몸을 가누지 못했다.\n' +
      '틈이 열리고 있었다. 그 틈을 볼 눈이 있는 왕에게는.',
    condition: { minAge: 19, month: 11, flags: { empire_decline_2: true } },
    once: true,
    priority: 9.6,
    setFlags: { empire_decline_3: true },
  },
]
