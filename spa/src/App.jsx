import { useState } from 'react'
import FileUpload from './components/FileUpload'
import './App.css'

function App() {
  return (
    <div className="app-container">
      <header>
        <h1>Evidence MVP</h1>
        <p>Secure, tamper-evident evidence collection system</p>
      </header>
      
      <main>
        <FileUpload />
      </main>
      
      <footer>
        <p>© {new Date().getFullYear()} Evidence MVP Project</p>
      </footer>
    </div>
  )
}

export default App
