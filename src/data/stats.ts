import type { ResourceKey, StatKey } from '../types/game'

export const STAT_KEYS: StatKey[] = [
  'statecraft',
  'finance',
  'rhetoric',
  'martial',
  'courtcraft',
]

export interface StatMeta {
  label: string
  description: string
  /** 바 색상 (Tailwind 클래스). */
  bar: string
}

export const STAT_META: Record<StatKey, StatMeta> = {
  statecraft: {
    label: '통치학',
    description: '통치의 원리와 선례. 어전 회의에서 스스로 판단할 힘.',
    bar: 'bg-gold-400',
  },
  finance: {
    label: '재정',
    description: '조세와 국고. 숫자를 읽지 못하는 {왕}은 속는다.',
    bar: 'bg-emerald-400',
  },
  rhetoric: {
    label: '변론',
    description: '말로 설득하고 반박하는 능력.',
    bar: 'bg-sky-400',
  },
  martial: {
    label: '무예',
    description: '몸을 지키는 기술이자 군을 대할 때의 권위.',
    bar: 'bg-rose-400',
  },
  courtcraft: {
    label: '궁정처세',
    description: '누가 누구의 사람인지 읽고 처신하는 감각.',
    bar: 'bg-violet-400',
  },
  // 라벨만 서양 궁정 톤으로 옮겼다. StatKey 와 수치는 그대로.
}

export const RESOURCE_META: Record<ResourceKey, { label: string; bar: string }> = {
  wellbeing: { label: '심신', bar: 'bg-teal-400' },
  tutorTrust: { label: '신뢰', bar: 'bg-gold-300' },
  courtInfluence: { label: '국정 영향도', bar: 'bg-yellow-500' },
  regentSuspicion: { label: '섭정 의심', bar: 'bg-red-500' },
  regentRapport: { label: '섭정 신망', bar: 'bg-indigo-400' },
  actionPoints: { label: '행동력', bar: 'bg-ink-600' },
}

/**
 * 선택지 미리보기에서 수치를 가리는 게이지.
 * "내 능력은 계산하되 섭정의 속마음은 나중에 안다" — 고른 뒤에는 결과로 공개된다.
 */
export const HIDDEN_GAUGES: ResourceKey[] = ['regentSuspicion', 'regentRapport']
