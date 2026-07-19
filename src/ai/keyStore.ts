import type { AiProviderId } from './types'

/**
 * BYOK 키 보관.
 *
 * 게임 세이브(queening.save)와 **분리**해서 저장한다:
 *   · 세이브를 남에게 주거나 백업해도 키가 따라가지 않는다.
 *   · 세이브 마이그레이션이 키를 건드리지 않는다.
 *   · "처음부터"로 게임을 지워도 키는 남는다.
 *
 * 키는 브라우저 localStorage 에 평문으로 남는다. 난독화는 보안이 아니므로
 * 하지 않고, 대신 설정 화면에서 공용 PC 경고와 삭제 버튼을 제공한다.
 */

const KEY_PREFIX = 'queening.ai.key.'
const MODEL_PREFIX = 'queening.ai.model.'
const BASE_URL_PREFIX = 'queening.ai.baseUrl.'
const PROVIDER_KEY = 'queening.ai.provider'

/** 모델·엔드포인트는 비밀이 아니지만, 제공자별로 따로 기억한다. */
function readSetting(prefix: string, provider: AiProviderId): string {
  try {
    return localStorage.getItem(prefix + provider) ?? ''
  } catch {
    return ''
  }
}

function writeSetting(prefix: string, provider: AiProviderId, value: string): void {
  try {
    const trimmed = value.trim()
    if (trimmed) localStorage.setItem(prefix + provider, trimmed)
    else localStorage.removeItem(prefix + provider)
  } catch {
    /* 무시 */
  }
}

export const loadModel = (p: AiProviderId) => readSetting(MODEL_PREFIX, p)
export const saveModel = (p: AiProviderId, v: string) => writeSetting(MODEL_PREFIX, p, v)
export const loadBaseUrl = (p: AiProviderId) => readSetting(BASE_URL_PREFIX, p)
export const saveBaseUrl = (p: AiProviderId, v: string) => writeSetting(BASE_URL_PREFIX, p, v)

export function loadKey(provider: AiProviderId): string {
  try {
    return localStorage.getItem(KEY_PREFIX + provider) ?? ''
  } catch {
    return ''
  }
}

export function saveKey(provider: AiProviderId, key: string): boolean {
  try {
    const trimmed = key.trim()
    if (trimmed) localStorage.setItem(KEY_PREFIX + provider, trimmed)
    else localStorage.removeItem(KEY_PREFIX + provider)
    return true
  } catch {
    return false
  }
}

export function clearKey(provider: AiProviderId): void {
  try {
    localStorage.removeItem(KEY_PREFIX + provider)
  } catch {
    /* 저장소를 못 쓰는 환경이면 애초에 남은 것도 없다 */
  }
}

export function loadProviderId(): AiProviderId | null {
  try {
    return (localStorage.getItem(PROVIDER_KEY) as AiProviderId) || null
  } catch {
    return null
  }
}

export function saveProviderId(provider: AiProviderId): void {
  try {
    localStorage.setItem(PROVIDER_KEY, provider)
  } catch {
    /* 무시 */
  }
}

/** 화면에 보여줄 마스킹 형태. 앞뒤만 남긴다. */
export function maskKey(key: string): string {
  const k = key.trim()
  if (k.length <= 12) return '•'.repeat(k.length)
  return `${k.slice(0, 8)}${'•'.repeat(10)}${k.slice(-4)}`
}
