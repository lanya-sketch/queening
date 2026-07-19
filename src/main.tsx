import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { installDevBridge } from './ai/devBridge'
import './index.css'

// 개발 빌드에서만 테스트 시임을 노출한다.
installDevBridge()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
