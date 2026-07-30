import { useState } from 'react'
import { INTRO_GENDER, INTRO_LINES, INTRO_RELATIONS, INTRO_TEMPERAMENT } from '../data/intro'
import { CHARACTERS } from '../data/characters'
import { CHARACTER_TERMS, DEFAULT_MONARCH_NAME } from '../data/lexicon'
import {
  DEFAULT_TEMPERAMENT_ID, TEMPERAMENTS, TEMPERAMENT_BY_ID, type Temperament,
} from '../data/temperaments'
import { STAT_META } from '../data/stats'
import { SPEED_MS, useOptions } from '../store/optionsStore'
import { useApp } from '../store/appStore'
import { useGame } from '../store/gameStore'
import { resolveCharacterPortrait, resolveMonarchPortrait } from '../systems/outfits'
import { characterGender, characterName } from '../systems/text'
import type { Gender } from '../types/game'
import { Button } from './ui/Button'
import { useTypewriter } from './scene/useTypewriter'

/**
 * 인트로 시퀀스 (D-3).
 *
 * 선왕의 죽음 배경 서사(타이핑 연출) → 군주 성별 선택 → 온보딩. 스킵 가능(재플레이).
 * 게임 화면 위 오버레이. 빈 옥좌 배경톤을 이어받아 어둡게 깐다.
 */
export function IntroSequence() {
  const textSpeed = useOptions((s) => s.textSpeed)
  const dismissIntro = useApp((s) => s.dismissIntro)
  const gender = useGame((s) => s.game.monarchGender)
  const setGender = useGame((s) => s.setMonarchGender)
  const name = useGame((s) => s.game.monarchName)
  const setName = useGame((s) => s.setMonarchName)
  const setTemperament = useGame((s) => s.setTemperament)
  const setCharacterGender = useGame((s) => s.setCharacterGender)
  const game = useGame((s) => s.game)
  const manifest = useGame((s) => s.outfitManifest)

  // 11세 사복 초상(성별 선택용). portraits 섹션이 있어야 해석되고, 없으면 초상 없이 라벨만.
  const facePortrait = (g: Gender) =>
    manifest.portraits
      ? resolveMonarchPortrait(manifest.portraits, g, 11, 'casual').thumbSrc
      : null

  const [step, setStep] = useState(0)
  const [temp, setTemp] = useState(DEFAULT_TEMPERAMENT_ID)
  const [showRelations, setShowRelations] = useState(false)
  // 단계: 서사(INTRO_LINES) → 정체성(성별+이름) → 기질 → 인연 → 온보딩.
  const onGender = step >= INTRO_LINES.length
  const onTemperament = step >= INTRO_LINES.length + 1
  const onRelations = step >= INTRO_LINES.length + 2
  const cur = INTRO_LINES[step] ?? ''
  const tw = useTypewriter(cur, onGender ? 0 : SPEED_MS[textSpeed])

  const advance = () => {
    if (!onGender && !tw.done) {
      tw.complete()
      return
    }
    setStep((s) => s + 1)
  }
  // 스킵 → 성별 선택으로 바로. 성별은 여전히 고르게 한다(표기가 갈리므로).
  const skipToGender = () => setStep(INTRO_LINES.length)
  const pickTemp = (id: string) => { setTemp(id); setTemperament(id) }
  // 시작 — 기질(기본 균형이라도)을 확정 적용하고 온보딩으로.
  const begin = () => { setTemperament(temp); dismissIntro() }

  return (
    <div data-screen="intro" className="fixed inset-0 z-40 flex flex-col justify-center bg-ink-950/97 px-6 backdrop-blur">
      <div className="mx-auto w-full max-w-lg">
        {!onGender ? (
          <>
            <div className="min-h-[7rem]">
              {tw.shown.split('\n').map((part, i) => (
                <p key={i} className="text-base leading-relaxed text-parchment">
                  {part}
                </p>
              ))}
            </div>
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={skipToGender}
                className="text-[11px] text-muted active:text-parchment"
              >
                건너뛰기
              </button>
              <Button variant="primary" className="px-8" onClick={advance}>
                다음
              </Button>
            </div>
          </>
        ) : !onTemperament ? (
          <>
            <p className="text-sm text-muted">{INTRO_GENDER.prompt}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <GenderChoice
                label={INTRO_GENDER.male}
                face={facePortrait('male')}
                selected={gender === 'male'}
                onClick={() => setGender('male')}
              />
              <GenderChoice
                label={INTRO_GENDER.female}
                face={facePortrait('female')}
                selected={gender === 'female'}
                onClick={() => setGender('female')}
              />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">{INTRO_GENDER.note}</p>

            {/* 이름 — 빈칸이면 성별 기본 이름이 표시된다(placeholder 로 안내). */}
            <label className="mt-6 block">
              <span className="text-sm text-muted">{INTRO_GENDER.namePrompt}</span>
              <span className="ml-1.5 text-[11px] text-faint">{INTRO_GENDER.nameHint}</span>
              <input
                data-intro-name
                type="text"
                value={name}
                maxLength={12}
                onChange={(e) => setName(e.target.value)}
                placeholder={DEFAULT_MONARCH_NAME[gender]}
                className="mt-2 w-full rounded-xl border border-line bg-ink-900/60 px-3 py-2.5 text-parchment placeholder:text-muted/60 focus:border-line-gold/70 focus:outline-none"
              />
            </label>

            <Button variant="primary" className="mt-8 w-full" onClick={advance}>
              다음
            </Button>
          </>
        ) : !onRelations ? (
          <>
            {/* ★ 기질 — "어떤 아이였는가". 수치가 아니라 서사로 제시하고, ▲▼ 로 성향만 암시. */}
            <p className="text-sm text-muted">{INTRO_TEMPERAMENT.prompt}</p>
            <ul className="mt-4 space-y-2">
              {TEMPERAMENTS.map((t) => {
                const sel = t.id === temp
                return (
                  <li key={t.id}>
                    <button
                      data-temperament={t.id}
                      aria-pressed={sel}
                      onClick={() => pickTemp(t.id)}
                      className={`w-full rounded-xl border p-3 text-left transition-colors ${
                        sel ? 'border-line-gold/70 bg-ink-700/30' : 'border-line bg-ink-900/50 active:bg-ink-800/60'
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={`font-title text-sm font-bold ${sel ? 'text-gold-300' : 'text-parchment'}`}>
                          {t.name} <span className="text-[11px] font-normal text-muted">· {t.epithet}</span>
                        </span>
                        <TemperamentHints t={t} />
                      </div>
                      {sel && <p className="mt-1.5 text-[12.5px] leading-relaxed text-parchment/70">{t.line}</p>}
                    </button>
                  </li>
                )
              })}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">{INTRO_TEMPERAMENT.note}</p>

            {/* 정확값은 상세에만(표시 규칙). */}
            <details data-temperament-detail className="mt-3 rounded-lg border border-line/70 bg-black/25 p-2.5">
              <summary className="cursor-pointer select-none text-[11px] text-muted">상세 (시작 수치)</summary>
              <TemperamentDetail t={TEMPERAMENT_BY_ID[temp]} />
            </details>

            <Button variant="primary" className="mt-6 w-full" onClick={advance}>
              {INTRO_TEMPERAMENT.next}
            </Button>
          </>
        ) : (
          <>
            {/* ★ 인연 — 연애 대상 5인의 성별. 기본은 현행 배치라 원탭으로 지나갈 수 있고,
                원하는 사람만 '직접 고르기'를 펼친다(성별 개방 2차). */}
            <p className="text-sm text-muted">{INTRO_RELATIONS.prompt}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">{INTRO_RELATIONS.note}</p>

            {!showRelations ? (
              <>
                <button
                  data-relations-customize
                  onClick={() => setShowRelations(true)}
                  className="mt-5 min-h-[46px] w-full rounded-xl border border-line bg-ink-900/50 text-sm text-parchment active:bg-ink-800/60"
                >
                  {INTRO_RELATIONS.customize}
                </button>
                <Button variant="primary" className="mt-3 w-full" onClick={begin}>
                  {INTRO_RELATIONS.keep}
                </Button>
              </>
            ) : (
              <>
                <ul className="mt-4 space-y-2">
                  {CHARACTERS.map((c) => {
                    const g = characterGender(c.id, game)
                    // ★ [6] ④ 평민 영웅은 존재 자체가 스포일러라 성별 선택에서도 실루엣(???)으로 둔다.
                    //   성별은 고를 수 있게 두어(나중 등장에 반영), 얼굴·이름·소개만 가린다.
                    const hidden = c.id === 'hero'
                    const face = hidden || !manifest.characterPortraits
                      ? null
                      : resolveCharacterPortrait(manifest.characterPortraits, c.id, g, 16)?.thumbSrc ?? null
                    return (
                      <li
                        key={c.id}
                        data-relation-choice={c.id}
                        data-relation-hidden={hidden ? 'true' : undefined}
                        className="flex items-center gap-3 rounded-xl border border-line bg-ink-900/50 p-2.5"
                      >
                        {hidden ? (
                          <div
                            aria-hidden
                            className="flex h-14 w-11 shrink-0 items-center justify-center rounded bg-ink-950 text-lg text-faint"
                          >
                            ?
                          </div>
                        ) : face ? (
                          <img
                            src={face}
                            alt=""
                            draggable={false}
                            className="h-14 w-11 shrink-0 rounded object-cover object-top"
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] text-parchment">
                            {hidden ? '???' : characterName(c.id, game)}
                          </p>
                          <p className="truncate text-[11px] text-muted">
                            {hidden ? '아직 만나지 않은 인연' : CHARACTER_TERMS[g].title}
                          </p>
                        </div>
                        <div className="flex shrink-0 overflow-hidden rounded-lg border border-line">
                          {(['male', 'female'] as Gender[]).map((opt) => (
                            <button
                              key={opt}
                              data-relation-gender={opt}
                              aria-pressed={g === opt}
                              onClick={() => setCharacterGender(c.id, opt)}
                              className={`min-h-[36px] w-10 text-xs transition-colors ${
                                g === opt
                                  ? 'bg-ink-700/60 text-gold-300'
                                  : 'bg-ink-900/40 text-muted active:bg-ink-800'
                              }`}
                            >
                              {opt === 'male' ? INTRO_RELATIONS.male : INTRO_RELATIONS.female}
                            </button>
                          ))}
                        </div>
                      </li>
                    )
                  })}
                </ul>
                <Button variant="primary" className="mt-6 w-full" onClick={begin}>
                  {INTRO_RELATIONS.start}
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function GenderChoice({
  label,
  face,
  selected,
  onClick,
}: {
  label: string
  face: string | null
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      data-gender-choice
      className={`flex flex-col items-center overflow-hidden rounded-xl border transition-colors ${
        selected
          ? 'border-line-gold/70 bg-ink-700/40'
          : 'border-line bg-ink-900/50 active:bg-ink-800/60'
      }`}
    >
      {/* 11세 사복 초상 — 성별을 얼굴로 고른다. 초상이 없으면(폴백) 라벨만. */}
      {face && (
        <img
          src={face}
          alt=""
          className="aspect-[4/5] w-full object-cover object-top"
          style={{ opacity: selected ? 1 : 0.72 }}
        />
      )}
      <span
        className={`w-full px-2 py-2 text-center text-xs tracking-wide ${
          selected ? 'text-gold-300' : 'text-parchment'
        }`}
      >
        {label}
      </span>
    </button>
  )
}

/** 기질 성향 암시 — ▲(오름)·▼(내림)만. 수치는 없다(상세에만). */
function TemperamentHints({ t }: { t: Temperament }) {
  if (!t.up.length && !t.down.length && !t.trustUp) {
    return <span className="text-[11px] text-faint">고루</span>
  }
  return (
    <span className="flex shrink-0 flex-wrap items-center justify-end gap-x-1.5 gap-y-0.5 text-[11px]">
      {t.up.map((k) => (
        <span key={`u${k}`} className="text-gain">▲{STAT_META[k].label}</span>
      ))}
      {t.trustUp && <span className="text-gain">▲신뢰</span>}
      {t.down.map((k) => (
        <span key={`d${k}`} className="text-peril-soft">▼{STAT_META[k].label}</span>
      ))}
    </span>
  )
}

/** 정확 시작 수치 — 상세(접이식)에만. 표시 규칙: 화면은 질적, 정확값은 내부값 섹션. */
function TemperamentDetail({ t }: { t: Temperament }) {
  return (
    <div className="mt-2 space-y-1">
      {(Object.keys(t.stats) as (keyof typeof t.stats)[]).map((k) => (
        <div key={k} className="flex justify-between text-[11px]">
          <span className="text-muted">{STAT_META[k].label}</span>
          <span className="font-display tabular-nums text-parchment/80">{t.stats[k]}</span>
        </div>
      ))}
      <div className="flex justify-between border-t border-line pt-1 text-[11px]">
        <span className="text-muted">튜터 신뢰(시작)</span>
        <span className="font-display tabular-nums text-parchment/80">{t.tutorTrust}</span>
      </div>
    </div>
  )
}
