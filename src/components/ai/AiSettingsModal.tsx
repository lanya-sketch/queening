import { useEffect, useState } from 'react'
import { AI_PROVIDERS } from '../../ai/providers'
import { maskKey } from '../../ai/keyStore'
import { useAi } from '../../store/aiStore'
import type { AiProviderId } from '../../ai/types'
import { Button } from '../ui/Button'

/** 숫자 하나짜리 설정 행. 고급 섹션에서만 쓴다. */
function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <label className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
      <span className="flex-1">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const next = Number(e.target.value)
          if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)))
        }}
        className="min-h-[44px] w-24 rounded-lg border border-slate-700 bg-slate-900 px-2 text-right font-mono text-sm text-slate-100"
      />
    </label>
  )
}

/**
 * BYOK 설정 화면 (M2b-1 · M2b-2 에서 생성 파라미터 추가).
 * 키가 없으면 AI 기능만 꺼지고, 게임 본편은 그대로 동작한다.
 */
export function AiSettingsModal({ onClose }: { onClose: () => void }) {
  const providerId = useAi((s) => s.providerId)
  const apiKey = useAi((s) => s.apiKey)
  const status = useAi((s) => s.status)
  const lastTestOk = useAi((s) => s.lastTestOk)
  const lastMessage = useAi((s) => s.lastMessage)
  const setProviderId = useAi((s) => s.setProviderId)
  const setApiKey = useAi((s) => s.setApiKey)
  const model = useAi((s) => s.model)
  const setModel = useAi((s) => s.setModel)
  const baseUrl = useAi((s) => s.baseUrl)
  const setBaseUrl = useAi((s) => s.setBaseUrl)
  const generation = useAi((s) => s.generation)
  const setGeneration = useAi((s) => s.setGeneration)
  const samplingOk = useAi((s) => s.samplingSupported())
  const persistSettings = useAi((s) => s.persistSettings)
  const forgetKey = useAi((s) => s.forgetKey)
  const testConnection = useAi((s) => s.testConnection)

  const [revealed, setRevealed] = useState(false)
  const provider = AI_PROVIDERS[providerId]
  const busy = status !== 'idle'
  const keyLooksOff = apiKey.trim().length > 0 && provider && !provider.looksLikeKey(apiKey)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="AI 설정"
    >
      <div
        className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-100">AI 설정</h1>
            <p className="mt-1 text-xs text-slate-400">
              키를 넣지 않아도 게임 본편은 전부 플레이할 수 있습니다.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-slate-300 active:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* 공용 PC 경고 */}
        <p className="mt-4 rounded-lg border border-amber-900/60 bg-amber-950/30 p-3 text-[11px] leading-relaxed text-amber-200">
          입력한 키는 <strong>이 브라우저에 그대로 저장</strong>되고, 요청도 이
          브라우저에서 직접 API로 나갑니다. 공용 PC나 남의 기기에서는 키를 넣지 마세요.
          자리를 뜨기 전에 아래 <strong>키 삭제</strong>를 누르면 지워집니다.
        </p>

        <label className="mt-4 block text-xs text-slate-400">
          제공자
          <select
            value={providerId}
            onChange={(e) => setProviderId(e.target.value as AiProviderId)}
            className="mt-1 block min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100"
          >
            {Object.entries(AI_PROVIDERS).map(([id, p]) => (
              <option key={id} value={id}>
                {p?.label}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block text-xs text-slate-400">
          API 키
          <input
            type={revealed ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            placeholder="sk-ant-..."
            className="mt-1 block min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-sm text-slate-100"
          />
        </label>

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-slate-500">
            {apiKey.trim() ? maskKey(apiKey) : '저장된 키 없음'}
          </span>
          <button
            onClick={() => setRevealed((v) => !v)}
            className="min-h-[44px] px-2 text-xs text-slate-400 active:text-slate-200"
          >
            {revealed ? '가리기' : '보기'}
          </button>
        </div>

        {keyLooksOff && (
          <p className="mt-1 text-[11px] text-amber-400">
            이 제공자의 키 형식과 다릅니다. 오타가 없는지 확인하세요.
          </p>
        )}

        {/* 모델 — 목록은 추천일 뿐이고 직접 입력해도 된다 */}
        <label className="mt-3 block text-xs text-slate-400">
          모델
          <input
            list="ai-model-options"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            placeholder={provider?.defaultModel}
            className="mt-1 block min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-sm text-slate-100"
          />
        </label>
        <datalist id="ai-model-options">
          {provider?.models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </datalist>
        <p className="mt-1 text-[11px] text-slate-500">
          목록에 없는 모델도 직접 적을 수 있습니다. 비용은 유저 키로 청구되니 저렴한 모델을
          골라도 됩니다.
        </p>

        {provider?.editableBaseUrl && (
          <label className="mt-3 block text-xs text-slate-400">
            엔드포인트
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              placeholder={provider.defaultBaseUrl}
              className="mt-1 block min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-sm text-slate-100"
            />
          </label>
        )}

        {provider?.note && (
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{provider.note}</p>
        )}

        {/* 고급 — 기본값으로 잘 돌아가므로 접어둔다 */}
        <details className="mt-4 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
          <summary className="min-h-[44px] cursor-pointer list-none py-2 text-xs font-medium text-slate-300">
            고급 설정 ▾
          </summary>

          <p className="mt-1 text-[11px] text-slate-500">
            비용에 직접 영향을 주는 값입니다.
          </p>
          <NumberField
            label="최대 응답 길이 (max_tokens)"
            value={generation.maxTokens}
            min={100}
            max={4000}
            step={50}
            onChange={(v) => setGeneration({ maxTokens: v })}
          />
          <NumberField
            label="함께 보낼 최근 대화 (턴)"
            value={generation.contextTurns}
            min={2}
            max={40}
            step={1}
            onChange={(v) => setGeneration({ contextTurns: v })}
          />

          <p className="mt-3 text-[11px] text-slate-500">
            응답의 다양성·성격을 바꿉니다. 비용과는 무관합니다.
          </p>
          {!samplingOk && (
            <p className="mt-1 rounded border border-amber-900/60 bg-amber-950/30 p-2 text-[11px] text-amber-300">
              지금 고른 모델은 이 값들을 받지 않습니다. 보내면 오류가 나므로 요청에서 자동으로
              제외됩니다.
            </p>
          )}
          <div className={samplingOk ? '' : 'pointer-events-none opacity-40'}>
            <NumberField
              label="temperature"
              value={generation.temperature}
              min={0}
              max={2}
              step={0.05}
              onChange={(v) => setGeneration({ temperature: v })}
            />
            <NumberField
              label="top_p"
              value={generation.topP}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => setGeneration({ topP: v })}
            />
            <NumberField
              label="top_k (0 = 사용 안 함)"
              value={generation.topK ?? 0}
              min={0}
              max={200}
              step={1}
              onChange={(v) => setGeneration({ topK: v === 0 ? null : v })}
            />
          </div>
        </details>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={persistSettings} disabled={busy}>
            설정 저장
          </Button>
          <Button variant="primary" onClick={testConnection} disabled={busy}>
            {status === 'testing' ? '확인 중…' : '연결 테스트'}
          </Button>
          <Button variant="danger" className="col-span-2" onClick={forgetKey} disabled={busy}>
            키 삭제
          </Button>
        </div>

        {lastMessage && (
          <p
            className={`mt-3 text-xs ${
              lastTestOk === false ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {lastMessage}
          </p>
        )}

        <p className="mt-4 border-t border-slate-800 pt-3 text-[11px] leading-relaxed text-slate-500">
          수치(스탯·게이지·flag)와 큰 분기는 전부 게임 코드가 정합니다. AI는 그 상태에
          놓인 인물의 말과 반응만 만들고, 상태 변화를 제안하더라도 코드가 상한선까지
          잘라낸 뒤에야 반영됩니다.
        </p>
      </div>
    </div>
  )
}
