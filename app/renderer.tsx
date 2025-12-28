import React from 'react'
import ReactDOM from 'react-dom/client'
import { WindowContextProvider, menuItems } from '@/app/components/window'
import { ErrorBoundary } from './components/ErrorBoundary'
import { initializeTheme } from './theme'
import App from './app'
import './styles/globals.css'
import './styles/window.css'

// Initialize theme before rendering to prevent flash
initializeTheme().then(() => {
  ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <WindowContextProvider titlebar={{ title: 'Ledger', menuItems, titleCentered: true }}>
          <App />
        </WindowContextProvider>
      </ErrorBoundary>
    </React.StrictMode>
  )
})
