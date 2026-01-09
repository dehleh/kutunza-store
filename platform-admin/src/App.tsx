import { useState, useEffect } from 'react'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import { refreshAccessToken } from './lib/api'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    const bootstrapSession = async () => {
      const token = localStorage.getItem('platformToken')
      if (token) {
        setIsAuthenticated(true)
        setCheckingSession(false)
        return
      }

      const refreshed = await refreshAccessToken()
      setIsAuthenticated(!!refreshed)
      setCheckingSession(false)
    }

    bootstrapSession()
  }, [])

  if (checkingSession) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading session...</div>
  }

  return isAuthenticated ? <Dashboard /> : <Login />
}

export default App
