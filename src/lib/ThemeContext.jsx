import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext({ mode: 'light', toggle: () => {} })
export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('theme') || 'light')

  useEffect(() => { localStorage.setItem('theme', mode) }, [mode])

  const toggle = () => setMode(m => m === 'light' ? 'dark' : 'light')

  return (
    <ThemeContext.Provider value={{ mode, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}
