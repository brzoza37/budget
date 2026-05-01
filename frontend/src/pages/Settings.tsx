import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, List, ListItem, ListItemText, ListItemIcon,
  Switch, Divider, Select, MenuItem, FormControl, InputLabel, Button,
  ToggleButtonGroup, ToggleButton, Snackbar, Alert,
} from '@mui/material';
import {
  Palette as PaletteIcon, Storage as StorageIcon,
  Info as InfoIcon, Person as PersonIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { useThemeMode } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/apiClient';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'PLN', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];

const Settings = () => {
  const { t } = useTranslation();
  const { isDark, toggleTheme } = useThemeMode();
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [currency, setCurrency] = React.useState(
    () => localStorage.getItem('display-currency') ?? 'USD'
  );
  const [locale, setLocale] = React.useState<string>(user?.locale ?? 'en');
  const [savingLocale, setSavingLocale] = React.useState(false);
  const [localeError, setLocaleError] = React.useState('');

  const handleCurrencyChange = (value: string) => {
    setCurrency(value);
    localStorage.setItem('display-currency', value);
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
          {t('settings.appearance')}
        </Typography>
        <SettingsCard>
          <List disablePadding>
            <ListItem>
              <ListItemIcon><PaletteIcon /></ListItemIcon>
              <ListItemText primary={t('settings.darkMode')} secondary={t('settings.darkModeDesc')} />
              <Switch checked={isDark} onChange={toggleTheme} />
            </ListItem>
          </List>
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
            <FormControl fullWidth size="small">
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

      <Snackbar
        open={!!localeError}
        autoHideDuration={4000}
        onClose={() => setLocaleError('')}
      >
        <Alert severity="error" onClose={() => setLocaleError('')}>{localeError}</Alert>
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
