import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, List, ListItem, ListItemText, ListItemIcon,
  Divider, Select, MenuItem, FormControl, InputLabel, Button,
  ToggleButtonGroup, ToggleButton, Snackbar, Alert,
} from '@mui/material';
import {
  Storage as StorageIcon, Info as InfoIcon, Person as PersonIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import apiClient from '../api/apiClient';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';
import { THEME_META } from '../theme/theme';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'PLN', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];

const Settings = () => {
  const { t } = useTranslation();
  const { user, logout, updateUser } = useAuth();
  const { themeName, setThemeName } = useThemeMode();
  const navigate = useNavigate();

  const [currency, setCurrency] = React.useState<string>(user?.currency ?? 'USD');
  const [savingCurrency, setSavingCurrency] = React.useState(false);
  const [currencyError, setCurrencyError] = React.useState('');
  const [locale, setLocale] = React.useState<string>(user?.locale ?? 'en');
  const [savingLocale, setSavingLocale] = React.useState(false);
  const [localeError, setLocaleError] = React.useState('');
  const [savingTheme, setSavingTheme] = React.useState(false);
  const [themeError, setThemeError] = React.useState('');

  const handleCurrencyChange = async (value: string) => {
    if (value === currency) return;
    const previous = currency;
    setCurrency(value);
    setSavingCurrency(true);
    try {
      await apiClient.patch('/auth/me', { currency: value }, {
        headers: { 'Content-Type': 'application/json' },
      });
      updateUser({ currency: value });
    } catch {
      setCurrency(previous);
      setCurrencyError(t('settings.currencyError'));
    } finally {
      setSavingCurrency(false);
    }
  };

  const handleLocaleChange = async (_: React.MouseEvent, newLocale: string | null) => {
    if (!newLocale || newLocale === locale) return;
    const previous = locale;
    setLocale(newLocale);
    i18next.changeLanguage(newLocale);
    setSavingLocale(true);
    try {
      await apiClient.patch('/auth/me', { locale: newLocale }, {
        headers: { 'Content-Type': 'application/json' },
      });
      updateUser({ locale: newLocale });
    } catch {
      setLocale(previous);
      i18next.changeLanguage(previous);
      setLocaleError(t('settings.languageError'));
    } finally {
      setSavingLocale(false);
    }
  };

  const handleThemeChange = async (id: typeof THEME_META[number]['id']) => {
    if (id === themeName) return;
    const previous = themeName;
    setThemeName(id);
    setSavingTheme(true);
    try {
      await apiClient.patch('/auth/me', { theme: id }, {
        headers: { 'Content-Type': 'application/json' },
      });
      updateUser({ theme: id });
    } catch {
      setThemeName(previous);
      setThemeError(t('settings.themeError'));
    } finally {
      setSavingTheme(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout title={t('settings.title')}>
      <Box p={2}>
        <Typography variant="titleMedium" sx={{ mb: 2, display: 'block' }}>
          {t('settings.accountSection')}
        </Typography>
        <SettingsCard>
          <List disablePadding>
            <ListItem>
              <ListItemIcon><PersonIcon /></ListItemIcon>
              <ListItemText
                primary={user?.displayName ?? 'Unknown'}
                secondary={user?.email ?? ''}
              />
              <Button variant="outlined" color="error" onClick={handleLogout} size="small">
                {t('settings.signOut')}
              </Button>
            </ListItem>
          </List>
        </SettingsCard>

        <Typography variant="titleMedium" sx={{ mt: 4, mb: 2, display: 'block' }}>
          {t('settings.themeSection')}
        </Typography>
        <SettingsCard>
          <Box p={2}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
              {THEME_META.map((meta) => (
                <Box
                  key={meta.id}
                  onClick={() => !savingTheme && handleThemeChange(meta.id)}
                  sx={{ cursor: savingTheme ? 'default' : 'pointer', textAlign: 'center', opacity: savingTheme ? 0.7 : 1 }}
                >
                  <Box sx={{
                    width: 48, height: 48, borderRadius: 3,
                    bgcolor: meta.primary,
                    border: '3px solid',
                    borderColor: themeName === meta.id ? 'text.primary' : 'transparent',
                    mx: 'auto', mb: 0.5,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {themeName === meta.id && <CheckIcon sx={{ color: 'white', fontSize: 20 }} />}
                  </Box>
                  <Typography variant="labelSmall">{t(meta.labelKey)}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </SettingsCard>

        <Typography variant="titleMedium" sx={{ mt: 4, mb: 2, display: 'block' }}>
          {t('settings.languageSection')}
        </Typography>
        <SettingsCard>
          <Box p={2}>
            <Typography variant="body2" color="text.secondary" mb={1.5}>
              {t('settings.languageDesc')}
            </Typography>
            <ToggleButtonGroup
              value={locale}
              exclusive
              onChange={handleLocaleChange}
              disabled={savingLocale}
              size="small"
            >
              <ToggleButton value="en">EN</ToggleButton>
              <ToggleButton value="pl">PL</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </SettingsCard>

        <Typography variant="titleMedium" sx={{ mt: 4, mb: 2, display: 'block' }}>
          {t('settings.currencySection')}
        </Typography>
        <SettingsCard>
          <Box p={2}>
            <FormControl fullWidth size="small" disabled={savingCurrency}>
              <InputLabel>{t('settings.displayCurrency')}</InputLabel>
              <Select
                value={currency}
                label={t('settings.displayCurrency')}
                onChange={(e) => handleCurrencyChange(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </SettingsCard>

        <Typography variant="titleMedium" sx={{ mt: 4, mb: 2, display: 'block' }}>
          {t('settings.dataSupport')}
        </Typography>
        <SettingsCard>
          <List disablePadding>
            <ListItem>
              <ListItemIcon><StorageIcon /></ListItemIcon>
              <ListItemText primary={t('settings.exportData')} secondary={t('settings.exportDataDesc')} />
            </ListItem>
            <Divider variant="inset" component="li" />
            <ListItem>
              <ListItemIcon><InfoIcon /></ListItemIcon>
              <ListItemText primary={t('settings.about')} secondary={t('settings.aboutDesc')} />
            </ListItem>
          </List>
        </SettingsCard>
      </Box>

      <Snackbar open={!!localeError} autoHideDuration={4000} onClose={() => setLocaleError('')}>
        <Alert severity="error" onClose={() => setLocaleError('')}>{localeError}</Alert>
      </Snackbar>
      <Snackbar open={!!themeError} autoHideDuration={4000} onClose={() => setThemeError('')}>
        <Alert severity="error" onClose={() => setThemeError('')}>{themeError}</Alert>
      </Snackbar>
      <Snackbar open={!!currencyError} autoHideDuration={4000} onClose={() => setCurrencyError('')}>
        <Alert severity="error" onClose={() => setCurrencyError('')}>{currencyError}</Alert>
      </Snackbar>
    </Layout>
  );
};

const SettingsCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ borderRadius: 4, overflow: 'hidden', bgcolor: 'background.paper' }}>
    {children}
  </Box>
);

export default Settings;
