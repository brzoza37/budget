import { createTheme, Theme } from '@mui/material/styles';
import type { CSSProperties } from 'react';
import type { ThemeName } from '../types/api';

const sharedTypography = {
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  h1: { fontSize: '2.5rem', fontWeight: 600 },
  h2: { fontSize: '2rem', fontWeight: 600 },
  h3: { fontSize: '1.75rem', fontWeight: 600 },
  h4: { fontSize: '1.5rem', fontWeight: 600 },
  h5: { fontSize: '1.25rem', fontWeight: 600 },
  h6: { fontSize: '1rem', fontWeight: 600 },
  titleMedium: { fontSize: '1.125rem', fontWeight: 700 },
  labelLarge: { fontSize: '0.875rem', fontWeight: 500 },
  labelMedium: { fontSize: '0.75rem', fontWeight: 500 },
  labelSmall: { fontSize: '0.625rem', fontWeight: 500 },
};

const sharedComponents = {
  MuiButton: {
    styleOverrides: { root: { textTransform: 'none' as const, borderRadius: 20 } },
  },
  MuiCard: {
    styleOverrides: { root: { borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' } },
  },
};

const forestTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#4CAF50', contrastText: '#ffffff' },
    secondary: { main: '#FF5722' },
    background: { default: '#f8f9fa', paper: '#ffffff' },
  },
  typography: sharedTypography,
  shape: { borderRadius: 12 },
  components: sharedComponents,
});

const oceanTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#1E88E5', contrastText: '#ffffff' },
    secondary: { main: '#00ACC1' },
    background: { default: '#0d1b2a', paper: '#1a2a3a' },
  },
  typography: sharedTypography,
  shape: { borderRadius: 12 },
  components: sharedComponents,
});

const aubergineTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#AB47BC', contrastText: '#ffffff' },
    secondary: { main: '#7B1FA2' },
    background: { default: '#1a0a1e', paper: '#2a1a35' },
  },
  typography: sharedTypography,
  shape: { borderRadius: 12 },
  components: sharedComponents,
});

const sunsetTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#FB8C00', contrastText: '#ffffff' },
    secondary: { main: '#E53935' },
    background: { default: '#fff8f0', paper: '#ffffff' },
  },
  typography: sharedTypography,
  shape: { borderRadius: 12 },
  components: sharedComponents,
});

const slateTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#78909C', contrastText: '#ffffff' },
    secondary: { main: '#546E7A' },
    background: { default: '#1a1f23', paper: '#242c32' },
  },
  typography: sharedTypography,
  shape: { borderRadius: 12 },
  components: sharedComponents,
});

const roseTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#E91E63', contrastText: '#ffffff' },
    secondary: { main: '#FF4081' },
    background: { default: '#fff0f5', paper: '#ffffff' },
  },
  typography: sharedTypography,
  shape: { borderRadius: 12 },
  components: sharedComponents,
});

export const THEMES: Record<ThemeName, Theme> = {
  forest: forestTheme,
  ocean: oceanTheme,
  aubergine: aubergineTheme,
  sunset: sunsetTheme,
  slate: slateTheme,
  rose: roseTheme,
};

export const THEME_META: { id: ThemeName; primary: string; labelKey: string }[] = [
  { id: 'forest',    primary: '#4CAF50', labelKey: 'settings.themes.forest' },
  { id: 'ocean',     primary: '#1E88E5', labelKey: 'settings.themes.ocean' },
  { id: 'aubergine', primary: '#AB47BC', labelKey: 'settings.themes.aubergine' },
  { id: 'sunset',    primary: '#FB8C00', labelKey: 'settings.themes.sunset' },
  { id: 'slate',     primary: '#78909C', labelKey: 'settings.themes.slate' },
  { id: 'rose',      primary: '#E91E63', labelKey: 'settings.themes.rose' },
];

declare module '@mui/material/styles' {
  interface TypographyVariants {
    titleMedium: CSSProperties;
    labelLarge: CSSProperties;
    labelMedium: CSSProperties;
    labelSmall: CSSProperties;
  }
  interface TypographyVariantsOptions {
    titleMedium?: CSSProperties;
    labelLarge?: CSSProperties;
    labelMedium?: CSSProperties;
    labelSmall?: CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    titleMedium: true;
    labelLarge: true;
    labelMedium: true;
    labelSmall: true;
  }
}
