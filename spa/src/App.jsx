import { useState } from 'react'
import FileUpload from './components/FileUpload'
import EvidenceMap from './components/EvidenceMap'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('upload')

  return (
    <div className="app-container">
      <header>
        <h1>Evidence MVP</h1>
        <p>Secure, tamper-evident evidence collection system</p>
        
        <nav className="main-navigation">
          <button 
            className={`nav-button ${currentView === 'upload' ? 'active' : ''}`}
            onClick={() => setCurrentView('upload')}
          >
            📤 Upload Evidence
          </button>
          <button 
            className={`nav-button ${currentView === 'map' ? 'active' : ''}`}
            onClick={() => setCurrentView('map')}
          >
            🗺️ Evidence Map
          </button>
        </nav>
      </header>
      
      <main>
        {currentView === 'upload' && <FileUpload />}
        {currentView === 'map' && (
          <EvidenceMap onBack={() => setCurrentView('upload')} />
        )}
      </main>
      
      <footer>
        <p>© {new Date().getFullYear()} Evidence MVP Project</p>
      </footer>
    </div>
  )
}

export default App
