import { useState } from 'react'
import { GAME_CONFIG, SEASON_LABEL, courtInfluenceCap } from '../data/config'
import { RESOURCE_META, STAT_KEYS, STAT_META } from '../data/stats'
import { useAiEnabled } from '../store/aiStore'
import { useGame } from '../store/gameStore'
import { talkLocked, useTalk } from '../store/talkStore'
import { resolveText } from '../systems/text'
import { AiSettingsModal } from './ai/AiSettingsModal'
import { PortraitButton } from './portrait/PortraitButton'
import { RomancePanel } from './romance/RomancePanel'
import { Button } from './ui/Button'
import { StatBar } from './ui/StatBar'

export function StatusPanel() {
  const [open, setOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const aiEnabled = useAiEnabled()
  const openTalk = useTalk((s) => s.openTalk)
  const [romanceOpen, setRomanceOpen] = useState(false)
  const setMonarchGender = useGame((s) => s.setMonarchGender)
  const game = useGame((s) => s.game)
  const savedAt = useGame((s) => s.savedAt)
  const save = useGame((s) => s.save)
  const load = useGame((s) => s.load)
  const reset = useGame((s) => s.reset)

  const locked = talkLocked(game.phase)
  const lowWellbeing = game.wellbeing <= GAME_CONFIG.wellbeingWarning
  const highSuspicion = game.regentSuspicion >= GAME_CONFIG.regentSuspicionWarning

  return (
    <aside className="sticky top-0 z-20 lg:static lg:w-80 lg:shrink-0">
      <div className="border-b border-slate-800 bg-slate-900/95 backdrop-blur lg:rounded-2xl lg:border">
        {/* 항상 보이는 요약 줄. 폰=가로 한 줄, PC=초상이 위로 올라간 세로 배치 */}
        <div className="flex items-center gap-3 px-4 py-3 lg:flex-col lg:gap-3 lg:pt-4">
          <PortraitButton className="h-14 w-11 lg:h-40 lg:w-32" />

          <div className="flex min-w-0 flex-1 items-center gap-3 lg:w-full lg:flex-none">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-amber-200">
                즉위 {game.date.year}년 {SEASON_LABEL[game.date.season]}
              </p>
              {/* 20세를 넘겨 잠긴 상태에서는 본문과 어긋나지 않게 끝점 나이로 고정 */}
            <p className="text-xs text-slate-400">
              {resolveText('{왕}', game)}{' '}
              {game.phase === 'ended' ? GAME_CONFIG.endAge : game.age}세
            </p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="rounded-lg bg-slate-800 px-2.5 py-1 text-center">
                <p className="text-[10px] leading-none text-slate-400">행동력</p>
                <p className="text-sm font-semibold tabular-nums leading-tight text-slate-100">
                  {game.actionPoints}
                  <span className="text-slate-500">/{GAME_CONFIG.actionPointsPerTurn}</span>
                </p>
              </div>
              <Button
                className="px-3 lg:hidden"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
              >
                {open ? '닫기' : '상세'}
              </Button>
            </div>
          </div>
        </div>

        {/* 경고는 접혀 있어도 보여야 한다 */}
        {(lowWellbeing || highSuspicion) && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-3">
            {lowWellbeing && (
              <span className="rounded-full bg-amber-950 px-2.5 py-1 text-[11px] text-amber-300">
                심신이 바닥났습니다
              </span>
            )}
            {highSuspicion && (
              <span className="rounded-full bg-red-950 px-2.5 py-1 text-[11px] text-red-300">
                섭정의 의심이 높습니다
              </span>
            )}
          </div>
        )}

        {/* 상세: 폰에선 접힘, PC(lg)에선 항상 펼침 */}
        <div
          className={`${open ? 'block' : 'hidden'} max-h-[60vh] overflow-y-auto px-4 pb-4 lg:block lg:max-h-none`}
        >
          <div className="space-y-2.5">
            {STAT_KEYS.map((key) => (
              <StatBar
                key={key}
                label={STAT_META[key].label}
                value={game.stats[key]}
                bar={STAT_META[key].bar}
              />
            ))}
          </div>

          <div className="my-4 h-px bg-slate-800" />

          {/* 국정 — 계획에 쓰는 공개 지표 */}
          <p className="mb-2 text-[11px] font-medium text-slate-500">국정</p>
          <div className="space-y-2.5">
            <StatBar
              label={RESOURCE_META.courtInfluence.label}
              value={game.courtInfluence}
              bar={RESOURCE_META.courtInfluence.bar}
              emphasis
              suffix={`/ ${courtInfluenceCap(game.age)}`}
            />
            <StatBar
              label={RESOURCE_META.wellbeing.label}
              value={game.wellbeing}
              bar={RESOURCE_META.wellbeing.bar}
              warning={lowWellbeing ? '위험' : undefined}
            />
            <StatBar
              label={RESOURCE_META.tutorTrust.label}
              value={game.tutorTrust}
              bar={RESOURCE_META.tutorTrust.bar}
            />
          </div>

          <div className="my-4 h-px bg-slate-800" />

          {/* 섭정 — 값은 보이되 선택지에서 변화가 미리 표시되지 않는다 */}
          <p className="mb-2 text-[11px] font-medium text-slate-500">섭정</p>
          <div className="space-y-2.5">
            <StatBar
              label={RESOURCE_META.regentRapport.label}
              value={game.regentRapport}
              bar={RESOURCE_META.regentRapport.bar}
            />
            <StatBar
              label={RESOURCE_META.regentSuspicion.label}
              value={game.regentSuspicion}
              bar={RESOURCE_META.regentSuspicion.bar}
              warning={highSuspicion ? '주의' : undefined}
            />
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
            선택지에서 이 두 지표의 변화는 미리 표시되지 않습니다.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button onClick={save}>저장</Button>
            <Button onClick={load}>불러오기</Button>
            <Button variant="danger" className="col-span-2" onClick={reset}>
              처음부터
            </Button>
            <Button className="col-span-2" onClick={() => setAiOpen(true)}>
              AI 설정 {aiEnabled ? '· 켜짐' : '· 꺼짐'}
            </Button>
            <Button className="col-span-2" onClick={() => setRomanceOpen(true)}>
              인연
            </Button>
          </div>

          {/* 군주 성별 — 진행 중 바꾸면 표기만 바뀐다(정치 구조엔 영향 없음) */}
          <div className="mt-3">
            <p className="mb-1 text-[11px] font-medium text-slate-500">군주</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                aria-pressed={game.monarchGender === 'male'}
                className={game.monarchGender === 'male' ? 'border-amber-400 text-amber-200' : ''}
                onClick={() => setMonarchGender('male')}
              >
                왕
              </Button>
              <Button
                aria-pressed={game.monarchGender === 'female'}
                className={game.monarchGender === 'female' ? 'border-amber-400 text-amber-200' : ''}
                onClick={() => setMonarchGender('female')}
              >
                여왕
              </Button>
            </div>
          </div>

          {/* 군주와의 대화 — 키가 있고 이벤트 씬이 아닐 때만 */}
          {aiEnabled && (
            <>
              <Button
                variant="primary"
                className="mt-2 w-full"
                disabled={locked}
                onClick={openTalk}
              >
                {resolveText('{왕}', game)}과 대화하기
              </Button>
              {locked && (
                <p className="mt-1 text-[11px] text-slate-500">
                  지금은 다른 일이 벌어지는 중입니다.
                </p>
              )}
            </>
          )}
          <p className="mt-2 text-[11px] text-slate-500">
            {savedAt ? `마지막 저장: ${new Date(savedAt).toLocaleString('ko-KR')}` : '저장된 기록 없음'}
          </p>
        </div>
      </div>

      {aiOpen && <AiSettingsModal onClose={() => setAiOpen(false)} />}
      {romanceOpen && <RomancePanel onClose={() => setRomanceOpen(false)} />}
    </aside>
  )
}
