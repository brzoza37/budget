import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Fab,
  CircularProgress,
  Stack,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  AccountBalance as AccountIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { useAccounts } from '../hooks/useApi';

const Accounts = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: accounts, isLoading } = useAccounts();

  if (isLoading) {
    return (
      <Layout title={t('accounts.title')}>
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title={t('accounts.title')}>
      <Box p={2}>
        <Stack spacing={2}>
          {accounts?.map((account) => (
            <AccountListItem 
              key={account.id} 
              account={account} 
              onClick={() => navigate(`/accounts/edit/${account.id}`)}
            />
          ))}
        </Stack>
      </Box>

      <Fab
        color="primary"
        sx={{ 
          position: 'fixed', 
          bottom: { xs: 80, md: 16 }, 
          right: 16 
        }}
        onClick={() => navigate('/accounts/add')}
      >
        <AddIcon />
      </Fab>
    </Layout>
  );
};

const AccountListItem = ({ account, onClick }) => {
  return (
    <Card 
      onClick={onClick}
      variant="outlined"
      sx={{ 
        cursor: 'pointer',
        '&:active': { bgcolor: 'action.selected' },
        border: 'none',
        bgcolor: 'background.paper'
      }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: '16px !important' }}>
        <Avatar 
          sx={{ 
            bgcolor: `${account.color}20`, 
            color: account.color,
            width: 48,
            height: 48
          }}
        >
          <AccountIcon />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {account.name}
          </Typography>
          <Typography variant="labelSmall" color="text.secondary">
            {account.type.charAt(0).toUpperCase() + account.type.slice(1).toLowerCase()}
          </Typography>
        </Box>
        <Box textAlign="right">
          <Typography variant="body1" sx={{ fontWeight: 'bold', color: account.color }}>
            ${account.balance.toLocaleString()}
          </Typography>
          <Typography variant="labelSmall" color="text.secondary">
            {account.currency}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default Accounts;
