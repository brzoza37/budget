import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, TextField, Button, Typography, Alert, Link, Paper } from '@mui/material';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { AuthUser } from '../types/api';

export default function Register() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const PASSWORD_RULES = [
    { key: 'length', test: (p: string) => p.length >= 12 },
    { key: 'uppercase', test: (p: string) => /[A-Z]/.test(p) },
    { key: 'number', test: (p: string) => /[0-9]/.test(p) },
    { key: 'special', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];

  const isPasswordValid = (p: string) => PASSWORD_RULES.every(r => r.test(p));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid(password)) {
      setError(t('auth.passwordRequirements'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const locale = navigator.language.startsWith('pl') ? 'pl' : 'en';
      const res = await apiClient.post<{ token: string; user: AuthUser }>(
        '/auth/register',
        { email, password, displayName, locale },
        { headers: { 'Content-Type': 'application/json' } }
      );
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setError(msg ?? t('auth.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const passwordError = passwordTouched && !isPasswordValid(password);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 400 }}>
        <Typography variant="h5" fontWeight="bold" mb={3}>{t('auth.register')}</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField
            label={t('auth.displayName')}
            fullWidth
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            required
            autoComplete="name"
            sx={{ mb: 2 }}
          />
          <TextField
            label={t('auth.email')}
            type="email"
            fullWidth
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            sx={{ mb: 2 }}
          />
          <TextField
            label={t('auth.password')}
            type="password"
            fullWidth
            value={password}
            onChange={e => setPassword(e.target.value)}
            onBlur={() => setPasswordTouched(true)}
            required
            error={passwordError}
            autoComplete="new-password"
            sx={{ mb: 1 }}
          />
          <Box sx={{ mb: 2, pl: 0.5 }}>
            {PASSWORD_RULES.map(rule => {
              const met = rule.test(password);
              const show = passwordTouched || password.length > 0;
              return (
                <Typography
                  key={rule.key}
                  variant="caption"
                  display="block"
                  sx={{ color: show ? (met ? 'success.main' : 'error.main') : 'text.secondary' }}
                >
                  {show ? (met ? '✓' : '✗') : '·'} {t(`auth.passwordRules.${rule.key}`)}
                </Typography>
              );
            })}
          </Box>
          <TextField
            label={t('auth.confirmPassword')}
            type="password"
            fullWidth
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            error={confirmPassword.length > 0 && password !== confirmPassword}
            helperText={confirmPassword.length > 0 && password !== confirmPassword ? t('auth.passwordMismatch') : ' '}
            sx={{ mb: 3 }}
          />
          <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
            {loading ? t('auth.creatingAccount') : t('auth.register')}
          </Button>
        </form>
        <Typography mt={3} textAlign="center" variant="body2">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link component={RouterLink} to="/login">{t('auth.signInLink')}</Link>
        </Typography>
      </Paper>
    </Box>
  );
}
