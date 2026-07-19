import { GAME_CONFIG, courtInfluenceCap } from '../data/config'
import { STAT_KEYS, STAT_META } from '../data/stats'
import { useGame } from '../store/gameStore'
import { resolveText } from '../systems/text'
import { Button } from './ui/Button'

/** 도달한 진실의 깊이. 엔딩 분기는 M3 에서 이 flag 들을 읽는다. */
function truthLine(flags: Record<string, boolean>): { title: string; body: string } {
  if (flags.truth_mother_mastermind) {
    return {
      title: '진실 — 설계자까지',
      body:
        '{왕}은아버지를 죽인 손과, 그 손을 움직인 사람을 모두 알고 있다. ' +
        '알아서는 안 될 것까지 알아버린 채 스무 살이 되었다.',
    }
  }
  if (flags.truth_regent_involved) {
    return {
      title: '진실 — 덮은 손까지',
      body:
        '선왕이 병으로 죽지 않았다는 것, 그리고 그 뒤를 덮은 것이 섭정공과 귀족파라는 것까지. ' +
        '거기서 멈췄다. 그 위에 누가 있는지는 아직 모른다.',
    }
  }
  return {
    title: '진실 — 닿지 못함',
    body:
      '아버지의 죽음은 여전히 병사(病死)로 기록되어 있다. ' +
      '{왕}은통치를 배웠지만, 자신이 왜 이 자리에 앉았는지는 끝내 알지 못했다.',
  }
}

/** M3 의 엔딩 분기가 읽을 축. 여기서는 도달 상태만 서술한다. */
function influenceLine(influence: number): string {
  if (influence >= 70) {
    return (
      '정무는 {왕}의 손에 있다. 이제 누구의 서명도 필요하지 않다. ' +
      '제국의 사절이 이 궁을 얕보고 돌아간 것이 벌써 아홉 해 전이다.'
    )
  }
  if (influence >= 45) return '궁정의 절반은 {왕}을 본다. 나머지 절반은 아직 숙부를 본다.'
  if (influence >= 20) return '{왕}의 이름으로 나가는 문서가 늘었다. 아직 많지는 않다.'
  return '정무는 여전히 섭정공의 손에 있다. {왕}은 옥좌에 앉아 있을 뿐이다.'
}

function regentLine(flags: Record<string, boolean>): string {
  if (flags.regent_hostile) return '섭정공과는 끝내 갈라섰다. 남은 것은 힘겨루기뿐이다.'
  if (flags.regent_alliance) return '섭정공은 {왕}의 손을 잡았다. 그가 무엇을 했는지 알면서도.'
  if (flags.regent_won_over) return '섭정공은 {왕}을 인정했다. 다만 아직 손은 잡지 않았다.'
  return '섭정공과의 관계는 아직 어느 쪽으로도 기울지 않았다.'
}

export function EndedScreen() {
  const game = useGame((s) => s.game)
  const reset = useGame((s) => s.reset)
  const save = useGame((s) => s.save)

  const truth = truthLine(game.flags)
  const clueCount = Object.keys(game.flags).filter(
    (f) => f.startsWith('clue_') && game.flags[f],
  ).length

  return (
    <div className="pb-28 lg:pb-6">
      <header className="mb-4">
        <p className="text-xs text-slate-500">즉위 {game.date.year}년</p>
        <h1 className="text-xl font-semibold text-amber-100">
          {resolveText('{왕}', game)}은 {GAME_CONFIG.endAge}세가 되었다
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          9년이 지났다. 열한 살에 옥좌에 앉았던 아이는 이제 혼자 설 수 있다.
          가정교사가 할 수 있는 일은 여기까지다.
        </p>
      </header>

      <section className="mb-4 rounded-xl border border-amber-900/60 bg-amber-950/20 p-4">
        <h2 className="text-sm font-medium text-amber-200">{truth.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-amber-100/90">
          {resolveText(truth.body, game)}
        </p>
        <p className="mt-3 text-xs text-amber-200/70">모은 단서 {clueCount}개</p>
      </section>

      <section className="mb-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-sm font-medium text-slate-300">국정</h2>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-slate-300">국정 영향도</span>
          <span className="tabular-nums text-lg font-semibold text-yellow-500">
            {game.courtInfluence}
            <span className="ml-1 text-xs font-normal text-slate-500">
              / 상한 {courtInfluenceCap(game.age)}
            </span>
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {resolveText(influenceLine(game.courtInfluence), game)}
        </p>
      </section>

      <section className="mb-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-sm font-medium text-slate-300">섭정</h2>
        <p className="text-sm leading-relaxed text-slate-400">
          {resolveText(regentLine(game.flags), game)}
        </p>
      </section>

      <section className="mb-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-300">
          스무 살의 {resolveText('{왕}', game)}
        </h2>
        <ul className="space-y-1.5">
          {STAT_KEYS.map((key) => (
            <li key={key} className="flex items-center justify-between text-sm">
              <span className="text-slate-300">{STAT_META[key].label}</span>
              <span className="tabular-nums text-slate-100">{game.stats[key]}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mb-4 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs leading-relaxed text-slate-500">
        여기까지가 현재 구현된 범위입니다. 엔딩 분기는 다음 단계에서 이 기록
        — 진실 도달 깊이, 섭정과의 관계, 스탯 — 을 읽어 갈라집니다.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={save}>이 기록 저장</Button>
        <Button variant="danger" onClick={reset}>
          처음부터
        </Button>
      </div>
    </div>
  )
}
