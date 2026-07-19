# 어린 군주 육성 시뮬 (가제)

선황이 암살당해 11세에 즉위한 어린 군주를, 황제파가 심은 가정교사(=플레이어)가 몇 년에 걸쳐
유능한 통치자로 키우는 싱글플레이어 육성 시뮬 + 비주얼 노벨.

## 실행

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # 타입 검사
npm run build      # 프로덕션 빌드
```

## 구조

```
public/assets/outfits/   착장 이미지 + manifest.json (유저가 고치는 곳)
src/data/                스탯·활동·이벤트·착장 폴백 정의 (콘텐츠)
src/systems/             턴/이벤트/효과/세이브/착장 로직 (React 비의존 순수 함수)
src/store/               Zustand 스토어
src/components/          화면
```

콘텐츠 추가는 `src/data/` 만 건드리면 됩니다. 활동은 `activities.ts` 배열에 객체 하나,
이벤트는 `events/` 에 파일을 만들고 `events/index.ts` 에서 스프레드하면 엔진이 자동으로 검사합니다.

## 착장(의상) 커스터마이징

> **군주는 미성년 캐릭터입니다. 노출 등 부적절한 이미지로 교체하지 마세요.**
> 기본 제공 이미지는 전부 옷을 갖춰 입은 착장이며, 교체 이미지도 그래야 합니다.

착장 이미지는 코드에 박혀 있지 않습니다. `public/assets/outfits/manifest.json` 이 목록을 들고 있고,
게임은 실행 시 이 파일을 읽습니다. **재빌드가 필요 없습니다** — 파일을 고치고 새로고침하면 반영됩니다.

### 1. 이미지 넣기

`public/assets/outfits/` 에 이미지를 넣습니다. 착장 한 벌마다 두 장이 필요합니다.

| 종류 | 용도 | 권장 규격 |
| --- | --- | --- |
| `thumb` | 왼쪽 위에 상시 표시되는 작은 초상 | 세로 3:4 (예: 300×400), 반신·얼굴 위주 |
| `full` | 초상을 눌렀을 때 뜨는 확대 이미지 | 세로 9:16 (예: 720×1280), 착장이 보이는 전신 |

PNG·WebP·JPG·SVG 모두 됩니다. 기본 제공되는 것은 플레이스홀더 SVG이므로,
진짜 그림이 준비되면 같은 이름으로 덮어쓰거나 매니페스트의 경로만 바꾸면 됩니다.

### 2. manifest.json 고치기

```jsonc
{
  "version": 1,
  "outfits": [
    {
      "id": "casual",                    // 세이브에 기록되는 값. 바꾸지 않는 편이 안전
      "name": "평상복",
      "description": "사가에서 입던 옷.",
      "thumbSrc": "/assets/outfits/casual-thumb.svg",
      "fullSrc": "/assets/outfits/casual-full.svg"
    },
    {
      "id": "ceremonial",
      "name": "예복",
      "description": "국가 대례에만 꺼내는 옷.",
      "thumbSrc": "/assets/outfits/ceremonial-thumb.png",
      "fullSrc": "/assets/outfits/ceremonial-full.png",
      "unlockCondition": { "stats": { "courtcraft": { "min": 25 } } }
    }
  ]
}
```

`unlockCondition` 은 생략하면 처음부터 입을 수 있습니다. 지정하면 조건을 채우기 전까지
착장 목록에서 자물쇠와 함께 해금 조건이 표시됩니다. 이벤트에 쓰는 조건 형식과 같습니다:

```jsonc
{ "minYear": 2 }                                  // 즉위 2년 이후
{ "minAge": 15 }                                  // 15세 이상
{ "stats": { "martial": { "min": 30 } } }         // 무예 30 이상
{ "resources": { "tutorTrust": { "min": 50 } } }  // 신뢰 50 이상
{ "flags": { "hadFirstAudience": true } }         // 특정 사건 이후
```

### 안전장치

JSON 문법이 틀렸거나 파일이 없으면 게임은 **내장 기본 착장으로 폴백**하고 콘솔에 경고를 남깁니다.
개별 착장에 `id`/`name`/`thumbSrc`/`fullSrc` 중 하나라도 빠지면 그 착장만 건너뜁니다.
착장 선택 화면 아래에 폴백 상태인지 표시됩니다.

세이브에 저장된 착장 id가 매니페스트에서 사라진 경우에는 자동으로 기본 착장(`casual`)으로 돌아갑니다.

## 세이브

`localStorage` 의 `queening.save` 키에 버전 태그와 함께 저장됩니다.
콘텐츠가 추가되어 저장 구조가 바뀌면 `GAME_CONFIG.saveVersion` 을 올리고
`src/systems/save.ts` 의 `MIGRATIONS` 에 변환 함수를 한 줄 추가합니다.
그러면 이전 버전 세이브도 그대로 이어서 플레이할 수 있습니다.
