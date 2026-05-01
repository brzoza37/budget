import { createTheme, Theme } from '@mui/material/styles';

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

export const lightTheme: Theme = createTheme({
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

export const darkTheme: Theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#66BB6A', contrastText: '#000000' },
    secondary: { main: '#FF7043' },
    background: { default: '#121212', paper: '#1e1e1e' },
  },
  typography: sharedTypography,
  shape: { borderRadius: 12 },
  components: sharedComponents,
});

export const theme = lightTheme;

declare module '@mui/material/styles' {
  interface TypographyVariants {
    titleMedium: React.CSSProperties;
    labelLarge: React.CSSProperties;
    labelMedium: React.CSSProperties;
    labelSmall: React.CSSProperties;
  }
  interface TypographyVariantsOptions {
    titleMedium?: React.CSSProperties;
    labelLarge?: React.CSSProperties;
    labelMedium?: React.CSSProperties;
    labelSmall?: React.CSSProperties;
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
