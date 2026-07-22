/**
 * 읽음 기록 (D-3) — "읽은 것만 스킵".
 *
 * ★ 씬 단위(sceneId)로 기록한다. 한 번 끝까지 본 씬만 다음 회차에 스킵할 수 있고,
 *   처음 보는 씬(새 루트)은 스킵되지 않아 놓치지 않는다.
 *
 * ★ 게임 세이브·갤러리와 **분리된 별도 키**. 회차에 걸쳐 누적된다.
 */
const KEY = 'queening.readlog'

export function getRead(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    const arr = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

export function isRead(sceneId: string): boolean {
  return getRead().has(sceneId)
}

export function markRead(sceneId: string): void {
  const read = getRead()
  if (read.has(sceneId)) return
  read.add(sceneId)
  try {
    localStorage.setItem(KEY, JSON.stringify([...read]))
  } catch {
    /* 무시 — 스킵은 부가 기능이라 게임을 막지 않는다 */
  }
}

/** 설정에서 초기화. */
export function clearReadlog(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* 무시 */
  }
}
