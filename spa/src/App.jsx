import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import FileUpload from './components/FileUpload'
import EvidenceMap from './components/EvidenceMap'
import DossierManager from './components/DossierManager'
import LanguageToggle from './components/LanguageToggle'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('upload')
  const { t } = useTranslation()

  return (
    <div className="app-container">
      <LanguageToggle />
      
      {currentView === 'upload' && (
        <header>
          <h1>{t('app.title')}</h1>
          <p>{t('app.subtitle')}</p>
          
          <nav className="main-navigation">
            <button 
              className={`nav-button ${currentView === 'upload' ? 'active' : ''}`}
              onClick={() => setCurrentView('upload')}
            >
              📤 {t('nav.upload')}
            </button>
            <button 
              className={`nav-button ${currentView === 'map' ? 'active' : ''}`}
              onClick={() => setCurrentView('map')}
            >
              🗺️ {t('nav.map')}
            </button>
            <button 
              className={`nav-button ${currentView === 'dossier' ? 'active' : ''}`}
              onClick={() => setCurrentView('dossier')}
            >
              📋 {t('nav.dossier')}
            </button>
          </nav>
        </header>
      )}
      
      <main>
        {currentView === 'upload' && <FileUpload />}
        {currentView === 'map' && (
          <EvidenceMap onBack={() => setCurrentView('upload')} />
        )}
        {currentView === 'dossier' && (
          <DossierManager onBack={() => setCurrentView('upload')} />
        )}
      </main>
      
      {currentView === 'upload' && (
        <footer>
          <p>© {new Date().getFullYear()} {t('app.footer')}</p>
        </footer>
      )}
    </div>
  )
}

export default App
