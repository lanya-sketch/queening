import { useEffect, useState } from 'react'

/**
 * ★ [10] 배경 그림 층 — url 이 있으면 cover 로 깔고, 없거나 로드 실패(404·지연 실패)면
 *   아무것도 그리지 않아 **부르는 쪽의 그라데이션이 그대로** 보인다(폴백).
 *   지연 로딩(loading="lazy") + onError 폴백 → 로드 전·실패에도 화면이 안 깨진다.
 *
 * ★ 에셋은 ≈3:2 라 object-center 로 가장자리가 잘린다 — 핵심 요소는 중앙에 있다는 전제(배선 데이터).
 */
export function SceneBackground({ url, className = '' }: { url: string | null; className?: string }) {
  const [failed, setFailed] = useState(false)
  // url 이 바뀌면 실패 상태를 리셋한다(다음 배경은 다시 시도).
  useEffect(() => setFailed(false), [url])
  if (!url || failed) return null
  return (
    <img
      src={url}
      alt=""
      aria-hidden
      draggable={false}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-center ${className}`}
    />
  )
}
