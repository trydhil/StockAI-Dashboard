import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [pin, setPin] = useState(localStorage.getItem('stockai_pin') || null)

  const login = (p) => {
    setPin(p)
    localStorage.setItem('stockai_pin', p)
  }

  const logout = () => {
    setPin(null)
    localStorage.removeItem('stockai_pin')
  }

  return (
    <AuthContext.Provider value={{ pin, login, logout, isAuth: !!pin }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
