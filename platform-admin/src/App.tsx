import { useState, useEffect } from 'react'
import Login from './components/Login'
import Dashboard from './components/Dashboard'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('platformToken')
    setIsAuthenticated(!!token)
  }, [])

  return isAuthenticated ? <Dashboard /> : <Login />
}

export default App
