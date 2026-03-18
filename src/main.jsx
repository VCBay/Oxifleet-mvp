import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { TranslationProvider } from './i18n/config.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TranslationProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </TranslationProvider>
  </StrictMode>,
)
