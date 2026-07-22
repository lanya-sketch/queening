import { DEFAULT_OUTFIT_ID, FALLBACK_MANIFEST, OUTFIT_MANIFEST_URL } from '../data/outfits'
import type { Gender, GameState, Outfit, OutfitManifest, PortraitConfig } from '../types/game'
import { matchesCondition } from './eventEngine'

export interface ManifestLoadResult {
  manifest: OutfitManifest
  /** 유저 매니페스트를 썼는지, 내장 폴백으로 떨어졌는지. */
  source: 'manifest' | 'fallback'
  /** 유저에게 보여줄 검증 문제 목록. */
  problems: string[]
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * 유저가 손으로 고치는 파일이므로 방어적으로 검증한다.
 * 개별 착장이 잘못되면 그 항목만 버리고, 남은 게 없으면 폴백으로 넘긴다.
 */
export function validateManifest(raw: unknown): { manifest: OutfitManifest | null; problems: string[] } {
  const problems: string[] = []

  if (!raw || typeof raw !== 'object') {
    return { manifest: null, problems: ['매니페스트가 객체가 아닙니다.'] }
  }

  const candidate = raw as Partial<OutfitManifest>
  if (!Array.isArray(candidate.outfits)) {
    return { manifest: null, problems: ['outfits 배열이 없습니다.'] }
  }

  const seen = new Set<string>()
  const outfits: Outfit[] = []

  candidate.outfits.forEach((entry, index) => {
    const o = entry as Partial<Outfit>
    const where = isNonEmptyString(o?.id) ? `착장 "${o.id}"` : `${index + 1}번째 착장`

    if (!isNonEmptyString(o?.id)) return void problems.push(`${where}: id 가 없습니다.`)
    if (seen.has(o.id)) return void problems.push(`${where}: id 가 중복됩니다.`)
    if (!isNonEmptyString(o.name)) return void problems.push(`${where}: name 이 없습니다.`)
    if (!isNonEmptyString(o.thumbSrc)) return void problems.push(`${where}: thumbSrc 가 없습니다.`)
    if (!isNonEmptyString(o.fullSrc)) return void problems.push(`${where}: fullSrc 가 없습니다.`)

    seen.add(o.id)
    outfits.push({
      id: o.id,
      name: o.name,
      description: isNonEmptyString(o.description) ? o.description : '',
      thumbSrc: o.thumbSrc,
      fullSrc: o.fullSrc,
      // 조건은 데이터 그대로 통과시킨다. 형태가 이상하면 matchesCondition 이 무시한다.
      ...(o.unlockCondition ? { unlockCondition: o.unlockCondition } : {}),
    })
  })

  if (outfits.length === 0) {
    problems.push('쓸 수 있는 착장이 하나도 없습니다.')
    return { manifest: null, problems }
  }

  // ★ portraits 섹션(선택). 필수 키가 온전할 때만 싣고, 아니면 조용히 버린다
  //   → 그때는 각 outfit 의 단일 이미지로 폴백한다(하위호환).
  const portraits = validatePortraits(candidate.portraits, problems)

  return {
    manifest: {
      version: typeof candidate.version === 'number' ? candidate.version : 1,
      outfits,
      ...(portraits ? { portraits } : {}),
    },
    problems,
  }
}

function validatePortraits(raw: unknown, problems: string[]): PortraitConfig | null {
  if (raw === undefined) return null
  const p = raw as Partial<PortraitConfig>
  const okStr = (v: unknown) => isNonEmptyString(v)
  if (
    !okStr(p.thumbBase) || !okStr(p.fullBase) || !okStr(p.file) || !okStr(p.fallbackOutfit) ||
    !p.genderDir || !p.code || !Array.isArray(p.outfits) ||
    typeof p.ageMin !== 'number' || typeof p.ageMax !== 'number'
  ) {
    problems.push('portraits 섹션이 온전하지 않아 무시합니다(단일 이미지로 폴백).')
    return null
  }
  return {
    thumbBase: p.thumbBase!, fullBase: p.fullBase!, file: p.file!,
    genderDir: p.genderDir as Record<Gender, string>,
    code: p.code as Record<Gender, string>,
    ageMin: p.ageMin, ageMax: p.ageMax,
    outfits: p.outfits.filter((o): o is string => isNonEmptyString(o)),
    restrict: (p.restrict as Record<string, number[]> | undefined) ?? undefined,
    fallbackOutfit: p.fallbackOutfit!,
  }
}

/**
 * 성별×나이×착장 → 초상 경로 해석 (콘텐츠·에셋 배선 1).
 *
 * ★ 폴백 체인: 나이 clamp(min~max) → 착장이 목록에 없으면 fallbackOutfit →
 *   제한 착장(예: debut=16만)인데 나이가 안 맞으면 fallbackOutfit. 항상 존재하는 경로를 낸다.
 */
export function resolveMonarchPortrait(
  portraits: PortraitConfig,
  gender: Gender,
  age: number,
  outfitId: string,
): { thumbSrc: string; fullSrc: string } {
  const clampedAge = Math.max(portraits.ageMin, Math.min(portraits.ageMax, Math.round(age)))
  let outfit = portraits.outfits.includes(outfitId) ? outfitId : portraits.fallbackOutfit
  const allowedAges = portraits.restrict?.[outfit]
  if (allowedAges && !allowedAges.includes(clampedAge)) outfit = portraits.fallbackOutfit
  const dir = portraits.genderDir[gender] ?? portraits.genderDir.male
  const code = portraits.code[gender] ?? portraits.code.male
  const file = portraits.file
    .replace('{code}', code)
    .replace('{outfit}', outfit)
    .replace('{age}', String(clampedAge))
  return {
    thumbSrc: `${portraits.thumbBase}/${dir}/${file}`,
    fullSrc: `${portraits.fullBase}/${dir}/${file}`,
  }
}

export async function loadOutfitManifest(): Promise<ManifestLoadResult> {
  try {
    const response = await fetch(OUTFIT_MANIFEST_URL, { cache: 'no-cache' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const { manifest, problems } = validateManifest(await response.json())
    if (!manifest) {
      console.warn('[outfits] 매니페스트가 올바르지 않아 내장 기본값을 사용합니다.', problems)
      return { manifest: FALLBACK_MANIFEST, source: 'fallback', problems }
    }
    if (problems.length) console.warn('[outfits] 일부 착장을 건너뛰었습니다.', problems)
    return { manifest, source: 'manifest', problems }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.warn('[outfits] 매니페스트를 읽지 못해 내장 기본값을 사용합니다.', reason)
    return { manifest: FALLBACK_MANIFEST, source: 'fallback', problems: [reason] }
  }
}

export function isOutfitUnlocked(outfit: Outfit, state: GameState): boolean {
  if (!outfit.unlockCondition) return true
  return matchesCondition(state, outfit.unlockCondition)
}

/** 저장된 id 가 매니페스트에 없을 수도 있다(유저가 지웠거나 이름을 바꿈). */
export function resolveOutfit(manifest: OutfitManifest, outfitId: string): Outfit {
  return (
    manifest.outfits.find((o) => o.id === outfitId) ??
    manifest.outfits.find((o) => o.id === DEFAULT_OUTFIT_ID) ??
    manifest.outfits[0]
  )
}
