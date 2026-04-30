import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, TextField, Button, Typography, Alert, Link, Paper } from '@mui/material';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { AuthUser } from '../types/api';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
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
        '/auth/register',
        { email, password, displayName },
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
            required
            inputProps={{ minLength: 8 }}
            helperText="At least 8 characters"
            autoComplete="new-password"
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
