/**
 * AI 가용 여부 게이트.
 *
 * 대원칙: **키가 없으면 코어는 완전하고, AI 콘텐츠는 아예 없다.**
 * 돌발 현안은 AI 가 만드는 것이라 키가 없으면 발동조차 하면 안 된다 —
 * "발동했는데 내용이 없다"는 상태를 만들지 않기 위해서다.
 *
 * systems/rng.ts 와 같은 패턴이다. 스토어(React)와 엔진(순수 함수)이 직접
 * 얽히지 않도록 불리언 하나만 사이에 둔다. 엔진은 aiStore 를 모르고,
 * aiStore 는 이벤트를 모른다.
 */
let available = false

export function setAiAvailable(value: boolean): void {
  available = value
}

export function isAiAvailable(): boolean {
  return available
}
