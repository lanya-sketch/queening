import type { OutfitManifest } from '../types/game'

/** 유저가 직접 고치는 매니페스트의 위치. public/ 아래라 재빌드 없이 반영된다. */
export const OUTFIT_MANIFEST_URL = '/assets/outfits/manifest.json'

export const DEFAULT_OUTFIT_ID = 'casual'

/**
 * 내장 폴백 매니페스트.
 * public 의 manifest.json 이 없거나, 깨졌거나, 필수 항목이 빠졌을 때 이걸로 대체한다.
 * 유저가 JSON 을 잘못 고쳐도 게임이 멈추지 않게 하기 위한 안전장치.
 */
export const FALLBACK_MANIFEST: OutfitManifest = {
  version: 1,
  outfits: [
    {
      id: 'casual',
      name: '평상복',
      description: '사가에서 입던 옷. 아직은 이 옷이 제일 편하다.',
      thumbSrc: '/assets/outfits/casual-thumb.svg',
      fullSrc: '/assets/outfits/casual-full.svg',
    },
    {
      id: 'office',
      name: '집무복',
      description: '서재와 편전에서 입는 실무용 옷. 소매가 좁아 붓을 들기 좋다.',
      thumbSrc: '/assets/outfits/office-thumb.svg',
      fullSrc: '/assets/outfits/office-full.svg',
    },
    {
      id: 'ceremonial',
      name: '예복',
      description: '국가 대례에만 꺼내는 옷. 무겁고, 그만큼 눈에 띈다.',
      thumbSrc: '/assets/outfits/ceremonial-thumb.svg',
      fullSrc: '/assets/outfits/ceremonial-full.svg',
      unlockCondition: { stats: { courtcraft: { min: 25 } } },
    },
    {
      id: 'military',
      name: '군복',
      description: '선황이 물려준 치수를 고쳐 지은 것. 아직은 조금 크다.',
      thumbSrc: '/assets/outfits/military-thumb.svg',
      fullSrc: '/assets/outfits/military-full.svg',
      unlockCondition: { stats: { martial: { min: 30 } } },
    },
  ],
}

/** 착장 커스텀 화면과 README 양쪽에 노출하는 문구. */
export const OUTFIT_SAFETY_NOTICE =
  '군주는 미성년 캐릭터입니다. 노출 등 부적절한 이미지로 교체하지 마세요.'
