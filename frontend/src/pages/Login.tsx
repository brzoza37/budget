import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, TextField, Button, Typography, Alert, Link, Paper } from '@mui/material';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { AuthUser } from '../types/api';

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.post<{ token: string; user: AuthUser }>(
        '/auth/login',
        { email, password },
        { headers: { 'Content-Type': 'application/json' } }
      );
      login(res.data.token, res.data.user);
      navigate('/');
    } catch {
      setError(t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 400 }}>
        <Typography variant="h5" fontWeight="bold" mb={3}>{t('auth.signIn')}</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit}>
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
            required
            autoComplete="current-password"
            sx={{ mb: 3 }}
          />
          <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </Button>
        </form>
        <Typography mt={3} textAlign="center" variant="body2">
          {t('auth.noAccount')}{' '}
          <Link component={RouterLink} to="/register">{t('auth.createOne')}</Link>
        </Typography>
      </Paper>
    </Box>
  );
}
