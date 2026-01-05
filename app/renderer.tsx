import React from 'react'
import ReactDOM from 'react-dom/client'
import { WindowContextProvider, menuItems } from '@/app/components/window'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CanvasProvider } from './components/canvas'
import { initializeTheme } from './theme'
import App from './app'
import './styles/globals.css'
import './styles/window.css'

// Initialize theme before rendering to prevent flash
initializeTheme().then(() => {
  ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <CanvasProvider>
          <WindowContextProvider titlebar={{ title: 'Ledger', menuItems, titleCentered: true }}>
            <App />
          </WindowContextProvider>
        </CanvasProvider>
      </ErrorBoundary>
    </React.StrictMode>
  )
})
