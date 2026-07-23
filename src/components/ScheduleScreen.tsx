import { ACTIVITIES, ACTIVITY_BY_ID } from '../data/activities'
import { MONTH_SCALE } from '../data/config'
import { activityEffects, activityTierLabel } from '../systems/activityTier'
import { difficultyStars, effectView } from '../systems/display'
import { describeCondition, matchesCondition } from '../systems/eventEngine'
import { resolveText } from '../systems/text'
import { useGame } from '../store/gameStore'
import type { Activity, GameState } from '../types/game'
import { EffectPill, LockedNote, Lozenge, Stars } from './ui/Chrome'

/**
 * 일과 화면 (UI 리디자인 1단계).
 *
 * ★ 세 가지가 바뀌었다.
 *   1) 카테고리 묶음 — 12장이 평평하게 깔리면 무엇을 포기하는지가 안 보인다.
 *   2) 수치 대신 ▲▼ + 정도 — 정도는 수업 등급과 1:1이라 "소폭"이 곧 초급이다.
 *   3) 난이도 ◆ 는 등급에서 **계산**한다. 데이터에 따로 적지 않는다(적으면 어긋난다).
 */

/** 활동을 묶는 결. 표시용 분류라 데이터(tags)가 아니라 여기서 정한다. */
const GROUPS: { label: string; hint: string; ids: string[] }[] = [
  {
    label: '자기 수련',
    hint: '스스로의 그릇을 기른다',
    ids: ['lecture-statecraft', 'lecture-finance', 'debate-practice', 'sword-training'],
  },
  { label: '궁정 행사', hint: '사람들 사이에 세운다', ids: ['attend-banquet', 'royal-hunt'] },
  {
    label: '치세와 정무',
    hint: '권력의 소재를 건드린다',
    ids: ['attend-council', 'secret-correspondence', 'cede-affairs', 'direct-decree'],
  },
  { label: '쉼', hint: '아무것도 하지 않는다', ids: ['rest', 'play'] },
]

function ActivityCard({ activity, game }: { activity: Activity; game: GameState }) {
  const addActivity = useGame((s) => s.addActivity)
  const planned = useGame((s) => s.game.plannedActivityIds)

  const unlocked = !activity.requires || matchesCondition(game, activity.requires)
  const affordable = activity.apCost <= game.actionPoints
  const usable = unlocked && affordable
  const selected = planned.includes(activity.id)
  const tier = activityTierLabel(activity, game)
  const flagged = activity.tags?.includes('independence')

  return (
    <li className="shrink-0 snap-start basis-[19rem] lg:basis-auto">
      <button
        data-activity={activity.id}
        data-tier={tier ?? ''}
        data-selected={selected ? 'true' : 'false'}
        data-locked={unlocked ? 'false' : 'true'}
        disabled={!usable}
        onClick={() => addActivity(activity.id)}
        className="relative h-full w-full overflow-hidden rounded-panel border p-4 text-left transition-transform duration-200 active:translate-y-px"
        style={{
          opacity: usable ? 1 : 0.42,
          borderColor: selected
            ? 'rgba(212,176,106,.55)'
            : flagged
              ? 'rgba(228,123,123,.28)'
              : 'rgba(212,176,106,.18)',
          background: selected
            ? 'linear-gradient(180deg,#20201c,#16150f)'
            : flagged
              ? 'linear-gradient(180deg,#1e1720,#151016)'
              : 'linear-gradient(180deg,#181924,#141520)',
          boxShadow: selected ? '0 14px 32px rgba(0,0,0,.5)' : '0 8px 22px rgba(0,0,0,.35)',
        }}
      >
        {selected && (
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-1"
            style={{ background: 'linear-gradient(180deg,#F7D791,#B8842E)' }}
          />
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-title text-[17px] font-bold leading-tight text-parchment">
              {resolveText(activity.name, game)}
            </h3>
            {tier && (
              <span
                data-tier-badge
                className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px]"
                style={{ background: 'rgba(212,176,106,.12)', color: 'var(--color-gold-300)' }}
              >
                {tier}
              </span>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p
              className="font-display text-[9.5px] uppercase text-muted"
              style={{ letterSpacing: '.16em' }}
            >
              Action
            </p>
            <p
              className="font-display text-[15px] leading-tight"
              style={{ color: 'var(--color-gold-400)' }}
            >
              {activity.apCost}
            </p>
          </div>
        </div>

        <p className="mt-2.5 text-[12.5px] italic leading-relaxed text-parchment/60">
          {resolveText(activity.description, game)}
        </p>

        {unlocked ? (
          <>
            {/* ★ 수치 없음 — ▲▼ + 정도. 등급이 오르면 이 목록이 통째로 바뀐다. */}
            <div
              className="mt-3.5 flex flex-col gap-1.5 border-t pt-3"
              style={{ borderColor: 'rgba(212,176,106,.12)' }}
            >
              {activityEffects(activity, game).map((effect, i) => (
                <EffectPill key={i} {...effectView(effect, MONTH_SCALE)} />
              ))}
            </div>

            <div
              className="mt-3 flex items-center justify-between border-t pt-2.5"
              style={{ borderColor: 'rgba(212,176,106,.12)' }}
            >
              <span
                className="font-display text-[9.5px] uppercase text-muted"
                style={{ letterSpacing: '.16em' }}
              >
                난이도
              </span>
              <Stars filled={difficultyStars(tier, activity.apCost)} />
            </div>

            {flagged && (
              <p
                className="mt-3 flex items-center gap-2 text-[11.5px]"
                style={{ color: 'var(--color-peril-soft)' }}
              >
                <span
                  aria-hidden
                  className="kg-seal inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: 'radial-gradient(circle at 35% 30%,#d46a6a,#8f2e2e)' }}
                />
                섭정공의 눈에 띄는 일입니다
              </p>
            )}
          </>
        ) : (
          <LockedNote>{describeCondition(activity.requires).join(', ')} 필요</LockedNote>
        )}
      </button>
    </li>
  )
}

export function ScheduleScreen() {
  const game = useGame((s) => s.game)
  const removeActivityAt = useGame((s) => s.removeActivityAt)
  const clearPlan = useGame((s) => s.clearPlan)
  const endTurn = useGame((s) => s.endTurn)

  const planFlagged = game.plannedActivityIds.some((id) =>
    ACTIVITY_BY_ID[id]?.tags?.includes('independence'),
  )

  return (
    <div
      data-screen="schedule"
      className="pb-28 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:pb-0"
    >
      <header className="mb-5 lg:shrink-0">
        {/*
          ★ 날짜를 여기서 되풀이하지 않는다. 사이드바가 "언제·누가"를 항상 이고 있어서
            모바일에서는 「즉위 0년 1월」이 두 번 나왔다. 사이드바=상태, 본문=할 일.
        */}
        <h1 className="font-title text-[26px] font-bold leading-tight text-parchment lg:text-[32px]">
          이 달의 일과
        </h1>
        <div className="mt-2 flex items-center gap-3">
          <span
            className="font-display text-[12px] uppercase"
            style={{ letterSpacing: '.22em', color: 'var(--color-gold-400)' }}
          >
            The Month Ahead
          </span>
          <span
            aria-hidden
            className="h-px flex-1"
            style={{ background: 'linear-gradient(90deg,rgba(212,176,106,.4),transparent)' }}
          />
        </div>
        <p className="mt-3 text-[13.5px] text-muted">
          행동력만큼 활동을 고르고 이번 달을 넘기세요.
        </p>
      </header>

      {/* 이번 달의 계획 */}
      <section
        data-plan
        className="mb-6 rounded-panel border p-4 lg:shrink-0"
        style={{
          borderColor: 'rgba(212,176,106,.18)',
          background: 'linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.015))',
          boxShadow: '0 18px 50px rgba(0,0,0,.45)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Lozenge />
            <h2
              className="font-title text-[15px] font-bold"
              style={{ color: 'var(--color-gold-300)' }}
            >
              이번 달의 계획
            </h2>
          </div>
          {game.plannedActivityIds.length > 0 && (
            <button className="min-h-[44px] px-2 text-xs text-muted" onClick={clearPlan}>
              전부 비우기
            </button>
          )}
        </div>

        {game.plannedActivityIds.length === 0 ? (
          <p className="py-2 text-[13.5px] italic text-faint">아직 아무것도 정하지 않았습니다.</p>
        ) : (
          <>
            <ul className="mt-2 flex flex-wrap gap-2">
              {game.plannedActivityIds.map((id, index) => (
                <li key={`${id}-${index}`}>
                  <button
                    data-plan-chip={id}
                    className="flex min-h-[44px] items-center gap-2.5 rounded-panel border px-3"
                    style={{
                      borderColor: 'rgba(212,176,106,.3)',
                      background: 'rgba(212,176,106,.07)',
                    }}
                    onClick={() => removeActivityAt(index)}
                    aria-label={`${ACTIVITY_BY_ID[id]?.name} 취소`}
                  >
                    <span
                      className="font-display text-[11px]"
                      style={{ color: 'var(--color-gold-400)' }}
                    >
                      {ACTIVITY_BY_ID[id]?.apCost}AP
                    </span>
                    <span className="font-title text-[13.5px] text-parchment/90">
                      {ACTIVITY_BY_ID[id]?.name}
                    </span>
                    <span aria-hidden className="text-[14px] leading-none text-faint">
                      ×
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {planFlagged && (
              <p
                className="mt-3 flex items-center gap-2 pt-3 text-[12.5px]"
                style={{ borderTop: '1px dashed rgba(192,90,90,.25)', color: '#d17a7a' }}
              >
                <span
                  aria-hidden
                  className="kg-seal inline-block h-2 w-2 rounded-full"
                  style={{ background: 'var(--color-peril)' }}
                />
                섭정공의 이목이 이 달의 행보에 걸려 있습니다.
              </p>
            )}
          </>
        )}
      </section>

      {/* 활동 — 카테고리 묶음. 폰은 가로 스크롤, PC는 그리드로 12장이 한눈에. */}
      {/* ★ 데스크톱은 이 영역만 세로로 스크롤한다 — 가로 스크롤은 폰 전용. */}
      <div className="kg-scroll kg-fade-y flex flex-col gap-7 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
        {GROUPS.map((group) => {
          const items = group.ids
            .map((id) => ACTIVITIES.find((a) => a.id === id))
            .filter((a): a is Activity => Boolean(a))
          if (!items.length) return null
          return (
            <section key={group.label} data-activity-group={group.label}>
              <div className="mb-3.5 flex items-baseline gap-3">
                <h2
                  className="font-title text-[19px] font-bold"
                  style={{ color: '#E6C06E', letterSpacing: '.03em' }}
                >
                  {group.label}
                </h2>
                <span className="whitespace-nowrap text-[11.5px] italic text-faint">
                  {group.hint}
                </span>
                <span
                  aria-hidden
                  className="h-px flex-1"
                  style={{ background: 'linear-gradient(90deg,rgba(214,179,96,.5),transparent)' }}
                />
              </div>
              <ul className="kg-scroll flex snap-x snap-proximity gap-3 overflow-x-auto pb-3 lg:grid lg:grid-cols-2 lg:overflow-visible lg:pb-0">
                {items.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} game={game} />
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      {/* 턴 종료: 폰에선 하단 고정 */}
      <div
        data-onboard="endTurn"
        className="fixed inset-x-0 bottom-0 z-10 border-t bg-ink-950/95 p-3 backdrop-blur lg:static lg:mt-5 lg:shrink-0 lg:border-0 lg:bg-transparent lg:p-0"
        style={{ borderColor: 'rgba(212,176,106,.15)' }}
      >
        <div className="flex justify-center">
          <button
            data-end-turn
            /*
             * ★ 접근성 이름에 "턴 종료"를 함께 담는다. 보이는 글자("이번 달을 넘긴다")를
             *   그대로 포함하므로 WCAG 2.5.3(Label in Name)을 지키면서, 이 버튼을
             *   이름으로 찾던 검증 32곳이 살아 있는다.
             */
            aria-label="이번 달을 넘긴다 · 턴 종료"
            onClick={endTurn}
            className="w-full rounded-panel border px-10 py-3.5 font-title text-[16px] font-bold lg:w-auto"
            style={{
              borderColor: 'rgba(212,176,106,.55)',
              color: '#1a1208',
              letterSpacing: '.08em',
              background: 'linear-gradient(180deg,#F3DBA1,#D4B06A)',
              boxShadow: '0 14px 34px -12px rgba(212,176,106,.6)',
            }}
          >
            이번 달을 넘긴다 →
          </button>
        </div>
      </div>
    </div>
  )
}
