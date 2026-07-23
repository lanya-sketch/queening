import { monthLabel } from '../data/config'
import type { AiDelta, AiDeltaTarget } from './types'
import { AI_ALLOWED_FLAGS, clampFlags, clampReply, extractJson } from './clamp'
import { bandText } from './persona'
import type { GameState } from '../types/game'

/**
 * 돌발 현안 생성 (M2b-4).
 *
 * ★ 방어는 두 겹이고, **두 번째만 강제력이 있다.**
 *
 *   1층 프롬프트 — 소재 화이트리스트와 금지선. 이건 **부탁**이다. 뚫릴 수 있다.
 *   2층 코드     — 델타 허용목록 / 국정 영향도 0 / flag 열거 목록.
 *                  모델이 1층을 완전히 무시해도 여기서 잘린다.
 *
 * 그래서 1층은 "좋은 사건이 나오게" 하는 장치이고,
 * 2층은 "나쁜 사건이 게임을 망치지 못하게" 하는 장치다. 역할이 다르다.
 */

/** 돌발이 건드릴 수 있는 수치. 국정 영향도는 애초에 목록에 없다. */
const INCIDENT_ALLOW: AiDeltaTarget[] = ['regentSuspicion', 'wellbeing']

/** 돌발 상한은 대화보다 좁다 — 양념이 본식을 흔들면 안 된다. */
const INCIDENT_MAX_ABS: Partial<Record<AiDeltaTarget, number>> = {
  regentSuspicion: 3,
  wellbeing: 3,
}

export interface IncidentChoice {
  label: string
  resultText: string
  deltas: AiDelta[]
  flags: Record<string, boolean>
  /** 시간 초과 시 자동으로 선택될 신중한 쪽. */
  cautious?: boolean
}

export interface Incident {
  title: string
  text: string
  choices: IncidentChoice[]
  /** 급박한 사건인지. 코드가 최종 허가한다(모델이 매번 급하다고 해도 소용없다). */
  urgent: boolean
  /** 통보형은 선택지가 없고 델타만 있다. */
  deltas: AiDelta[]
  flags: Record<string, boolean>
  /** 잘려나간 제안들 — 검증과 콘솔 경고에 쓴다. */
  rejected: string[]
}

const FORBIDDEN_NOTE = `절대 만들지 않는 것 — 이것들은 전부 다른 곳에서 이미 다뤄지고 있다:
- 선왕의 죽음이나 그 진상
- 왕대비, 섭정공, 하원, 제국에 관한 일
- 마왕과 마족에 관한 일
- 궁의 특정 인물들(후계자·충신의 딸·이웃 왕족·영웅·지휘관)의 운명을 바꾸는 일
사람을 죽이지 말고, 전쟁을 일으키지 말고, 나라를 흔들지 마라.
다음 계절이면 잊힐 정도의 크기로 만들어라.`

const TOPICS = `만들 수 있는 것:
- 흉년, 풍년, 작황과 곳간
- 지방에서 올라온 자잘한 민원
- 귀족들 사이의 사소한 다툼이나 자리싸움
- 궁 안의 작은 소동(도난, 화재, 병, 소문)
- 계절 행사, 길조와 흉조`

/**
 * 정세는 **거친 질감으로만** 준다.
 *
 * ★ 핵심 서사 flag 를 프롬프트에 넣지 않는다.
 *   "왕대비 독살을 언급하지 마라"라고 말하려면 먼저 왕대비 독살을 알려줘야 하고,
 *   그러면 새어 나올 확률이 오히려 올라간다. 금지어는 알려주지 않는 것이 낫다.
 *   숫자도 넣지 않는다(인물 묘사 구간 무숫자 규칙과 같은 결).
 */
function situation(game: GameState): string {
  const lines = [
    `${game.age}세, ${monthLabel(game.date.month)}.`,
  ]

  const air = bandText(
    [
      { upTo: 30, text: '궁정은 조용하다.' },
      { upTo: 60, text: '궁정에 눈이 많다.' },
      { upTo: 100, text: '궁정의 공기가 무겁고, 누군가 늘 지켜보고 있다.' },
    ],
    game.regentSuspicion,
  )
  if (air) lines.push(air)

  const body = bandText(
    [
      { upTo: 30, text: '어린 군주는 지쳐 있다.' },
      { upTo: 70, text: '' },
      { upTo: 100, text: '어린 군주는 기운이 좋다.' },
    ],
    game.wellbeing,
  )
  if (body) lines.push(body)

  const people = Object.keys(game.flags).filter(
    (f) => f.startsWith('people_') && game.flags[f],
  )
  if (people.some((f) => f.startsWith('people_burdened')))
    lines.push('백성의 살림이 팍팍하다는 말이 돈다.')
  if (people.some((f) => f.startsWith('people_relieved')))
    lines.push('지난 조치로 한숨 돌린 고을이 있다.')

  return lines.filter(Boolean).join('\n')
}

/**
 * ★ 세계관 못박기 (실플레이 피드백 #11).
 *   한국어로 쓰다 보면 모델이 동양 궁정 소재(상궁·수라간·옷고름)를 자연스럽게 끌어온다.
 *   배경은 **서양 중세 왕국**이므로 프롬프트에서 못박는다(동양판은 최후 이식 라운드).
 */
const SETTING_NOTE = `배경은 **서양 중세 왕국**이다. 한국어로 쓰되 소재는 서양 궁정으로:
- 시녀·기사·집사·대신·성직자, 성과 회랑, 예복과 망토, 연회와 무도회
- 동양 궁정 소재(상궁·내관·수라간·옷고름·저고리 등)는 절대 쓰지 마라.`

export function buildIncidentPrompt(game: GameState, withChoices: boolean): string {
  return [
    '너는 어린 군주의 궁정에서 일어나는 **사소한 사건** 하나를 만든다.',
    '',
    SETTING_NOTE,
    '',
    TOPICS,
    '',
    FORBIDDEN_NOTE,
    '',
    '지금 상황:',
    situation(game),
    '',
    withChoices
      ? [
          '응답 형식 — 아래 JSON 하나만. 다른 말은 붙이지 마라.',
          '{',
          '  "title": "짧은 제목",',
          '  "text": "사건 서술. 두세 문장.",',
          '  "urgent": false,',
          '  "choices": [',
          '    { "label": "선택지 문구", "resultText": "고른 뒤의 후일담 한두 문장",',
          '      "cautious": true, "deltas": [{"target":"regentSuspicion","amount":-1}], "flags": {} }',
          '  ]',
          '}',
          '',
          '선택지는 둘 또는 셋. 그중 하나에 "cautious": true 를 붙여라 —',
          '가장 신중하고 소극적인 쪽이다.',
          '정말 급히 결단해야 하는 일이면 "urgent": true.',
        ].join('\n')
      : [
          '응답 형식 — 아래 JSON 하나만. 다른 말은 붙이지 마라.',
          '{',
          '  "title": "짧은 제목",',
          '  "text": "사건 서술. 두세 문장. 선택할 것 없이 벌어진 일이다.",',
          '  "deltas": [{"target":"wellbeing","amount":1}],',
          '  "flags": {}',
          '}',
        ].join('\n'),
    '',
    `deltas 의 target 은 ${INCIDENT_ALLOW.join(', ')} 만 쓸 수 있고, amount 는 -3~3 이다.`,
    `flags 는 다음 중에서만 고른다: ${AI_ALLOWED_FLAGS.join(', ')}`,
    '이 범위를 벗어난 제안은 코드가 버린다.',
  ].join('\n')
}

function clampDeltas(raw: unknown): { deltas: AiDelta[]; rejected: string[] } {
  const clamped = clampReply(
    { reply: '', deltas: Array.isArray(raw) ? (raw as AiDelta[]) : [] },
    { allow: INCIDENT_ALLOW, maxAbs: INCIDENT_MAX_ABS },
  )
  return {
    deltas: clamped.deltas,
    rejected: clamped.rejected.map((r) => `${r.target} ${r.amount} — ${r.reason}`),
  }
}

/**
 * 모델 응답을 게임이 받아들일 수 있는 Incident 로 좁힌다.
 * 파싱 실패는 null — 부르는 쪽이 그냥 건너뛴다(미리 쓴 사건으로 때우지 않는다).
 */
export function parseIncident(raw: string, withChoices: boolean): Incident | null {
  const json = extractJson(raw) as Record<string, unknown> | null
  if (!json) return null

  const title = String(json.title ?? '').trim().slice(0, 40)
  const text = String(json.text ?? '').trim().slice(0, 600)
  if (!title || !text) return null

  const rejected: string[] = []
  const top = clampDeltas(json.deltas)
  rejected.push(...top.rejected)
  const topFlags = clampFlags(json.flags)
  rejected.push(...topFlags.rejected)

  const choices: IncidentChoice[] = []
  if (withChoices && Array.isArray(json.choices)) {
    for (const c of (json.choices as Record<string, unknown>[]).slice(0, 3)) {
      const label = String(c?.label ?? '').trim().slice(0, 60)
      const resultText = String(c?.resultText ?? '').trim().slice(0, 400)
      if (!label || !resultText) continue
      const d = clampDeltas(c?.deltas)
      const f = clampFlags(c?.flags)
      rejected.push(...d.rejected, ...f.rejected)
      choices.push({
        label,
        resultText,
        deltas: d.deltas,
        flags: f.flags,
        cautious: c?.cautious === true,
      })
    }
    // 선택지형인데 선택지를 못 만들었으면 사건이 성립하지 않는다.
    if (choices.length < 2) return null
    // 신중한 쪽이 표시되지 않았으면 마지막을 그렇게 본다 — 초과 시 갈 곳이 있어야 한다.
    if (!choices.some((c) => c.cautious)) choices[choices.length - 1].cautious = true
  }

  return {
    title,
    text,
    choices,
    urgent: json.urgent === true,
    deltas: top.deltas,
    flags: topFlags.flags,
    rejected,
  }
}
