import { useEffect, useRef, useState } from 'react'

/**
 * 타이핑 연출 (D-3). text 를 speedMs 간격으로 한 글자씩 드러낸다.
 *
 * ★ speedMs === 0('즉시')이면 타이핑 없이 전체를 바로 보여준다.
 * ★ complete() 로 지금 줄을 즉시 완성한다(타이핑 중 클릭의 기본 상호작용).
 */
export function useTypewriter(text: string, speedMs: number): {
  shown: string
  done: boolean
  complete: () => void
} {
  const [count, setCount] = useState(() => (speedMs === 0 ? text.length : 0))
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (timer.current) clearInterval(timer.current)
    if (speedMs === 0) {
      setCount(text.length)
      return
    }
    setCount(0)
    let i = 0
    timer.current = setInterval(() => {
      i += 1
      setCount(i)
      if (i >= text.length && timer.current) {
        clearInterval(timer.current)
        timer.current = null
      }
    }, speedMs)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [text, speedMs])

  const done = count >= text.length
  const complete = () => {
    if (timer.current) {
      clearInterval(timer.current)
      timer.current = null
    }
    setCount(text.length)
  }

  return { shown: text.slice(0, count), done, complete }
}
