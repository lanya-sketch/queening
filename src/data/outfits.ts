import type { OutfitManifest } from '../types/game'

/** 유저가 직접 고치는 매니페스트의 위치. public/ 아래라 재빌드 없이 반영된다. */
export const OUTFIT_MANIFEST_URL = '/assets/outfits/manifest.json'

export const DEFAULT_OUTFIT_ID = 'casual'

/**
 * 내장 폴백 매니페스트.
 * public 의 manifest.json 이 없거나, 깨졌거나, 필수 항목이 빠졌을 때 이걸로 대체한다.
 * 유저가 JSON 을 잘못 고쳐도 게임이 멈추지 않게 하기 위한 안전장치.
 */
const PORT = '/assets/characters/monarch/portraits/male'
const FULL = '/assets/characters/monarch/male'

export const FALLBACK_MANIFEST: OutfitManifest = {
  version: 2,
  outfits: [
    {
      id: 'casual',
      name: '사복',
      description: '사저에서 입던 소박한 옷. 아직은 이 옷이 제일 편하다.',
      thumbSrc: `${PORT}/monarch_m_casual_16.png`,
      fullSrc: `${FULL}/monarch_m_casual_16.png`,
    },
    {
      id: 'office',
      name: '정무복',
      description: '집무실과 어전에서 입는 실무용 옷. 소매가 좁아 펜을 들기 좋다.',
      thumbSrc: `${PORT}/monarch_m_office_16.png`,
      fullSrc: `${FULL}/monarch_m_office_16.png`,
    },
    {
      id: 'royal',
      name: '대례복',
      description: '대관식과 국가 의례에만 꺼내는 옷. 무겁고, 그만큼 눈에 띈다.',
      thumbSrc: `${PORT}/monarch_m_royal_16.png`,
      fullSrc: `${FULL}/monarch_m_royal_16.png`,
      unlockCondition: { stats: { courtcraft: { min: 25 } } },
    },
    {
      id: 'armor',
      name: '갑주',
      description: '선왕이 물려준 것을 치수만 고쳐 지었다. 아직은 조금 크다.',
      thumbSrc: `${PORT}/monarch_m_armor_16.png`,
      fullSrc: `${FULL}/monarch_m_armor_16.png`,
      unlockCondition: { stats: { martial: { min: 30 } } },
    },
    {
      id: 'ball',
      name: '연회복',
      description: '연회와 사교의 자리를 위한 옷. 처음으로 어른들 틈에 선다.',
      thumbSrc: `${PORT}/monarch_m_ball_16.png`,
      fullSrc: `${FULL}/monarch_m_ball_16.png`,
      unlockCondition: { minAge: 16 },
    },
  ],
  portraits: {
    thumbBase: '/assets/characters/monarch/portraits',
    fullBase: '/assets/characters/monarch',
    genderDir: { male: 'male', female: 'female' },
    code: { male: 'm', female: 'f' },
    file: 'monarch_{code}_{outfit}_{age}.png',
    ageMin: 11,
    ageMax: 20,
    outfits: ['casual', 'office', 'royal', 'armor', 'ball', 'debut'],
    restrict: { debut: [16] },
    fallbackOutfit: 'casual',
  },
  characterPortraits: {
    thumbBase: '/assets/characters/portraits',
    fullBase: '/assets/characters',
    code: { male: 'm', female: 'f' },
    ageMin: 13,
    ageMax: 20,
    chars: {
      heir: { path: 'heir/{gdir}/heir_{code}_{age}.png', aged: true },
      loyalist: { path: 'loyalist/{gdir}/loyalist_{code}_{age}.png', aged: true },
      prince: { path: 'prince/{gdir}/prince_{code}_{age}.png', aged: true },
      commander: { path: 'commander/{gdir}/commander_{code}_{age}.png', aged: true },
      hero: { path: 'hero/{gdir}/hero_{code}.png', aged: false },
      queen_mother: { path: 'others/queen_mother_f.png', aged: false, gender: 'female' },
      regent: { path: 'others/regent_m.png', aged: false, gender: 'male' },
    },
  },
}

/** 착장 커스텀 화면과 README 양쪽에 노출하는 문구. */
export const OUTFIT_SAFETY_NOTICE =
  '군주는 미성년 캐릭터입니다. 노출 등 부적절한 이미지로 교체하지 마세요.'
