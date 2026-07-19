import { useAi } from '../store/aiStore'
import { useGame } from '../store/gameStore'
import { resolveText } from '../systems/text'
import { buildPersona } from './characterPersona'
import { buildMonarchPrompt } from './persona'
import { AI_PROVIDERS } from './providers'
import type { AiProviderId } from './types'

/**
 * 개발 전용 테스트 시임.
 *
 * 검증 스크립트가 "어느 제공자든 같은 형태의 델타가 나오는지"를 관측하려면
 * 브라우저 안에서 send() 를 직접 부를 수 있어야 한다. 프로덕션 번들에는
 * 포함되지 않는다(import.meta.env.DEV 가드 + main.tsx 에서만 호출).
 */
export function installDevBridge(): void {
  if (!import.meta.env.DEV) return

  // eslint 없는 프로젝트라 window 확장은 캐스팅으로 처리한다.
  ;(window as unknown as Record<string, unknown>).__queeningAi = {
    /** 제공자·모델·키를 한 번에 세팅한다(저장은 하지 않는다). */
    configure(providerId: AiProviderId, apiKey: string, model?: string, baseUrl?: string) {
      const provider = AI_PROVIDERS[providerId]
      useAi.setState({
        providerId,
        apiKey,
        model: model ?? provider?.defaultModel ?? '',
        baseUrl: baseUrl ?? provider?.defaultBaseUrl ?? '',
      })
    },
    /** 구조화 호출 → clamp 까지 통과한 결과를 그대로 돌려준다. */
    async send(prompt: string) {
      return useAi.getState().send({
        systemPrompt: '테스트',
        messages: [{ role: 'user', content: prompt }],
      })
    },
    providers: Object.keys(AI_PROVIDERS),

    /** 게임 상태를 갈아끼운다(검증에서 대조적인 두 군주를 만들 때). */
    setGame(patch: Record<string, unknown>) {
      useGame.setState({ game: { ...useGame.getState().game, ...patch } as never })
    },
    /** 지금 상태로 조립된 시스템 프롬프트. 숫자가 없는지 검증에서 확인한다. */
    prompt() {
      return buildMonarchPrompt(useGame.getState().game)
    },
    /** 토큰 치환 결과를 직접 확인한다(복합어가 안 깨지는지). */
    resolve(text: string) {
      return resolveText(text, useGame.getState().game)
    },
    /** 연애 대상의 조립된 시스템 프롬프트. */
    persona(charId: string) {
      return buildPersona(charId, useGame.getState().game)
    },
  }
}
