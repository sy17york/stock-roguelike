import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/theme.css'
import { ToastProvider } from './components/Toast/ToastContext'
import { GameProvider } from './state/GameContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </GameProvider>
  </StrictMode>,
)