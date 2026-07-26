import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { installDevBridge } from './ai/devBridge'
import { migrateLegacySave } from './systems/save'
import './index.css'

// 옛 단일 세이브(queening.save)를 slot0 으로 이관한다 — 어떤 슬롯 화면이 뜨기 전에.
// 지금 플레이 중인 세이브가 첫 슬롯으로 그대로 살아남는다.
migrateLegacySave()

// 개발 빌드에서만 테스트 시임을 노출한다.
installDevBridge()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
