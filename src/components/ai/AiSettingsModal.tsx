import { useEffect, useState } from 'react'
import { AI_PROVIDERS } from '../../ai/providers'
import { maskKey } from '../../ai/keyStore'
import { useAi } from '../../store/aiStore'
import type { AiProviderId } from '../../ai/types'
import { Button } from '../ui/Button'

/**
 * BYOK 설정 화면 (M2b-1).
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
