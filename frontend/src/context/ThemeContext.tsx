import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { THEMES } from '../theme/theme';
import { useAuth } from './AuthContext';

interface ThemeContextValue {
  themeName: string;
  setThemeName: (name: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeName: 'forest',
  setThemeName: () => {},
});

export const useThemeMode = () => useContext(ThemeContext);

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [themeName, setThemeNameState] = useState<string>(user?.theme ?? 'forest');

  useEffect(() => {
    setThemeNameState(user?.theme ?? 'forest');
  }, [user?.theme]);

  const setThemeName = useCallback((name: string) => {
    setThemeNameState(THEMES[name] ? name : 'forest');
  }, []);

  const value = useMemo(() => ({ themeName, setThemeName }), [themeName, setThemeName]);
  const activeTheme = THEMES[themeName] ?? THEMES.forest;

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={activeTheme}>
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
