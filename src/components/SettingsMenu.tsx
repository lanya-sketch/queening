import { useState } from 'react'
import { Rule } from './ui/Chrome'
import { SaveTransferPanel } from './SaveTransferPanel'
import { clearGallery } from '../systems/gallery'
import { clearReadlog } from '../systems/readlog'
import { clearAllSlots } from '../systems/save'
import { CHARACTERS } from '../data/characters'
import { CHARACTER_TERMS } from '../data/lexicon'
import { characterGender, characterName } from '../systems/text'
import { TEXT_SPEEDS, useOptions } from '../store/optionsStore'
import { useApp } from '../store/appStore'
import { useGame } from '../store/gameStore'
import { useAiEnabled } from '../store/aiStore'
import type { Gender } from '../types/game'

/**
 * 설정 메뉴 (D-1 → D-3 확장).
 *
 * 도움말 / 텍스트 속도 / AI 설정(게임 화면에서 이동) / 읽음 기록 초기화 / 사운드(자리).
 * 타이틀 '설정' 버튼과, (게임 중에도) 필요 시 여기로 모은다.
 */
export function SettingsMenu() {
  const close = useApp((s) => s.closeSettings)
  const openHelp = useApp((s) => s.openHelp)
  const openAiSettings = useApp((s) => s.openAiSettings)
  const textSpeed = useOptions((s) => s.textSpeed)
  const setTextSpeed = useOptions((s) => s.setTextSpeed)
  const aiEnabled = useAiEnabled()
  const inGame = useApp((s) => s.screen === 'game')
  const [readCleared, setReadCleared] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/70 p-6 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-ink-900/95 p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-title text-sm font-semibold tracking-wide text-gold-300">설정</h2>
          <button
            onClick={close}
            aria-label="설정 닫기"
            className="text-xs text-muted active:text-parchment"
          >
            닫기
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <button
            onClick={openHelp}
            className="min-h-[46px] w-full rounded-xl border border-line-gold/60 bg-ink-700/40 text-sm tracking-widest text-gold-300 active:bg-ink-700/50"
          >
            도움말
          </button>

          {/* 텍스트 속도 */}
          <div>
            <p className="mb-1.5 text-[11px] font-medium text-muted">텍스트 속도</p>
            <div className="grid grid-cols-4 gap-1.5">
              {TEXT_SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => setTextSpeed(s)}
                  aria-pressed={textSpeed === s}
                  className={`min-h-[40px] rounded-lg border text-xs transition-colors ${
                    textSpeed === s
                      ? 'border-line-gold/70 bg-ink-700/40 text-gold-300'
                      : 'border-line bg-ink-800/60 text-parchment active:bg-ink-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* AI 설정 — 게임 화면에서 이곳으로 이동 */}
          <button
            onClick={openAiSettings}
            className="min-h-[44px] w-full rounded-xl border border-line bg-ink-800/60 text-sm text-parchment active:bg-ink-700"
          >
            AI 설정 · {aiEnabled ? '켜짐' : '꺼짐'}
          </button>

          {/* 읽음 기록 초기화 — 스킵 대상 리셋 */}
          <button
            onClick={() => {
              clearReadlog()
              setReadCleared(true)
            }}
            className="min-h-[44px] w-full rounded-xl border border-line bg-ink-900/60 text-xs text-muted active:bg-ink-800"
          >
            {readCleared ? '읽음 기록을 지웠습니다' : '읽음 기록 초기화 (스킵 대상 리셋)'}
          </button>

          {/* ★ [6] 인연 성별 — 인트로에서만 고르던 것을 게임 중에도 바꿀 수 있게(원하면 허용). */}
          {inGame && <CharacterGenderPanel />}

          {/* 세이브 내보내기 / 가져오기 */}
          <SaveTransferPanel />

          {/* 사운드 — 자리만. 나중에 저작권 프리 음악 배선. */}
          <div className="flex items-center justify-between rounded-xl border border-line/60 bg-ink-900/30 px-3.5 py-3">
            <span className="text-xs text-muted">사운드</span>
            <span className="text-[11px] text-faint">준비 중</span>
          </div>

          {/* ★ 위험 영역 — 구분선으로 떼어 두고, 이중 확인 + 마찰(문구 입력)로 막는다. */}
          <Rule tone="peril" />
          <DangerZone />
        </div>
      </div>
    </div>
  )
}

/**
 * ★ [6] 인연 성별 변경 — 세이브의 characterGenders 를 그대로 바꾼다(구조 변경 없음).
 *   앞으로의 표기(그/그녀·호칭)만 바뀌고, 이미 지나간 이야기의 표기는 그대로다(경고 명시).
 *   ④ 평민 영웅은 입궁 전이면 존재가 스포일러라 실루엣(???)으로 두되 성별은 고를 수 있다.
 */
function CharacterGenderPanel() {
  const game = useGame((s) => s.game)
  const setCharacterGender = useGame((s) => s.setCharacterGender)
  return (
    <div className="rounded-xl border border-line/60 bg-ink-900/30 p-3.5">
      <p className="text-[11px] font-medium text-muted">인연 성별</p>
      <ul className="mt-2.5 space-y-1.5">
        {CHARACTERS.map((c) => {
          const g = characterGender(c.id, game)
          const hidden = c.id === 'hero' && game.flags.hero_at_court !== true
          return (
            <li key={c.id} data-setting-gender={c.id} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-xs text-parchment">
                {hidden ? '???' : characterName(c.id, game)}
                <span className="ml-1.5 text-[10px] text-faint">
                  {hidden ? '아직 만나지 않은 인연' : CHARACTER_TERMS[g].title}
                </span>
              </span>
              <div className="flex shrink-0 overflow-hidden rounded-lg border border-line">
                {(['male', 'female'] as Gender[]).map((opt) => (
                  <button
                    key={opt}
                    data-setting-gender-opt={opt}
                    aria-pressed={g === opt}
                    onClick={() => setCharacterGender(c.id, opt)}
                    className={`min-h-[32px] w-9 text-[11px] transition-colors ${
                      g === opt ? 'bg-ink-700/60 text-gold-300' : 'bg-ink-900/40 text-muted active:bg-ink-800'
                    }`}
                  >
                    {opt === 'male' ? '남' : '여'}
                  </button>
                ))}
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-2.5 text-[10px] leading-relaxed text-faint">
        이미 지나간 이야기의 표기는 바뀌지 않습니다. 앞으로의 대화·서술에만 반영됩니다.
      </p>
    </div>
  )
}

/**
 * 전체 초기화 — 슬롯 5개 + 엔딩 갤러리(+이름) + 읽음 기록을 모두 지운다.
 * ★ 옵션(텍스트 속도 등)은 남긴다 — 진행 기록이 아니라 취향이라서.
 * 함부로 못 누르게: 펼쳐서 무엇이 지워지는지 명시 → "초기화" 입력 → 영구 삭제.
 */
function DangerZone() {
  const reset = useGame((s) => s.reset)
  const goTitle = useApp((s) => s.goTitle)
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const CONFIRM_WORD = '초기화'

  const wipe = () => {
    clearAllSlots()
    clearGallery()
    clearReadlog()
    // ★ 옵션은 건드리지 않는다.
    reset() // 진행 중 게임도 새로 시작
    goTitle() // 지운 뒤 타이틀로 — 이어하기는 자동으로 비활성
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        data-danger-open
        className="min-h-[44px] w-full rounded-xl border border-peril/50 bg-peril/5 text-xs text-peril-soft active:bg-peril/15"
      >
        전체 초기화
      </button>
    )
  }

  return (
    <div data-danger-zone className="rounded-xl border border-peril/50 bg-peril/10 p-3.5">
      <p className="text-xs font-medium text-peril-soft">전체 초기화</p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-peril-soft/85">
        저장된 슬롯 5개 · 엔딩 갤러리 · 읽음 기록이 <b>모두 사라집니다.</b> 되돌릴 수 없습니다.
        <br />
        <span className="text-faint">(설정·텍스트 속도 등 옵션은 남습니다.)</span>
      </p>
      <p className="mt-2.5 text-[11px] text-peril-soft/85">
        확인하려면 <b>{CONFIRM_WORD}</b> 를 입력하세요.
      </p>
      <input
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder={CONFIRM_WORD}
        data-danger-input
        className="mt-1.5 w-full rounded-lg border border-peril/40 bg-black/30 px-3 py-2 text-xs text-parchment placeholder:text-faint"
      />
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <button
          onClick={wipe}
          disabled={confirmText.trim() !== CONFIRM_WORD}
          data-danger-confirm
          className="min-h-[40px] rounded-lg border border-peril/60 bg-peril/15 text-xs text-peril-soft disabled:border-line/40 disabled:bg-ink-900/40 disabled:text-faint active:bg-peril/25"
        >
          영구 삭제
        </button>
        <button
          onClick={() => {
            setOpen(false)
            setConfirmText('')
          }}
          className="min-h-[40px] rounded-lg border border-line bg-ink-800/60 text-xs text-parchment active:bg-ink-700"
        >
          취소
        </button>
      </div>
    </div>
  )
}
