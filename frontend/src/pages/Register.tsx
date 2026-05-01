import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, TextField, Button, Typography, Alert, Link, Paper } from '@mui/material';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { AuthUser } from '../types/api';

const PASSWORD_RULES = [
  { label: 'At least 12 characters', test: (p: string) => p.length >= 12 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const isPasswordValid = (p: string) => PASSWORD_RULES.every(r => r.test(p));

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid(password)) {
      setError('Password does not meet all requirements');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
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
      setError(msg ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordError = passwordTouched && !isPasswordValid(password);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 400 }}>
        <Typography variant="h5" fontWeight="bold" mb={3}>Create account</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField
            label="Your name"
            fullWidth
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            required
            autoComplete="name"
            sx={{ mb: 2 }}
          />
          <TextField
            label="Email"
            type="email"
            fullWidth
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            sx={{ mb: 2 }}
          />
          <TextField
            label="Password"
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
                  key={rule.label}
                  variant="caption"
                  display="block"
                  sx={{ color: show ? (met ? 'success.main' : 'error.main') : 'text.secondary' }}
                >
                  {show ? (met ? '✓' : '✗') : '·'} {rule.label}
                </Typography>
              );
            })}
          </Box>
          <TextField
            label="Confirm password"
            type="password"
            fullWidth
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            error={confirmPassword.length > 0 && password !== confirmPassword}
            helperText={confirmPassword.length > 0 && password !== confirmPassword ? 'Passwords do not match' : ' '}
            sx={{ mb: 3 }}
          />
          <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
        <Typography mt={3} textAlign="center" variant="body2">
          Already have an account?{' '}
          <Link component={RouterLink} to="/login">Sign in</Link>
        </Typography>
      </Paper>
    </Box>
  );
}
