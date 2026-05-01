import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, List, ListItem, ListItemText, ListItemIcon,
  Switch, Divider, Select, MenuItem, FormControl, InputLabel, Button,
} from '@mui/material';
import {
  Palette as PaletteIcon, Storage as StorageIcon,
  Info as InfoIcon, Person as PersonIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { useThemeMode } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'PLN', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];

const Settings = () => {
  const { isDark, toggleTheme } = useThemeMode();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currency, setCurrency] = React.useState(
    () => localStorage.getItem('display-currency') ?? 'USD'
  );

  const handleCurrencyChange = (value: string) => {
    setCurrency(value);
    localStorage.setItem('display-currency', value);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout title="Settings">
      <Box p={2}>
        <Typography variant="titleMedium" sx={{ mb: 2, display: 'block' }}>
          Account
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
                Sign out
              </Button>
            </ListItem>
          </List>
        </SettingsCard>

        <Typography variant="titleMedium" sx={{ mt: 4, mb: 2, display: 'block' }}>
          Appearance
        </Typography>
        <SettingsCard>
          <List disablePadding>
            <ListItem>
              <ListItemIcon><PaletteIcon /></ListItemIcon>
              <ListItemText primary="Dark Mode" secondary="Switch between light and dark theme" />
              <Switch checked={isDark} onChange={toggleTheme} />
            </ListItem>
          </List>
        </SettingsCard>

        <Typography variant="titleMedium" sx={{ mt: 4, mb: 2, display: 'block' }}>
          Currency
        </Typography>
        <SettingsCard>
          <Box p={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Display Currency</InputLabel>
              <Select
                value={currency}
                label="Display Currency"
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
          Data & Support
        </Typography>
        <SettingsCard>
          <List disablePadding>
            <ListItem>
              <ListItemIcon><StorageIcon /></ListItemIcon>
              <ListItemText primary="Export Data" secondary="Coming soon" />
            </ListItem>
            <Divider variant="inset" component="li" />
            <ListItem>
              <ListItemIcon><InfoIcon /></ListItemIcon>
              <ListItemText primary="About" secondary="Budget PWA v1.0.0 — Phase 1" />
            </ListItem>
          </List>
        </SettingsCard>
      </Box>
    </Layout>
  );
};

const SettingsCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ borderRadius: 4, overflow: 'hidden', bgcolor: 'background.paper' }}>
    {children}
  </Box>
);

export default Settings;
