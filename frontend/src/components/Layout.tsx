import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
  Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  List as TransactionsIcon,
  CalendarMonth as CalendarMonthIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
  navigationIcon?: React.ReactNode;
}

const SIDEBAR_WIDTH = 240;

const Layout: React.FC<LayoutProps> = ({ children, title, actions, navigationIcon }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const NAV_ITEMS = [
    { label: t('nav.dashboard'), icon: <DashboardIcon />, path: '/' },
    { label: t('nav.transactions'), icon: <TransactionsIcon />, path: '/transactions' },
    { label: t('nav.plan'), icon: <CalendarMonthIcon />, path: '/plan' },
    { label: t('nav.settings'), icon: <SettingsIcon />, path: '/settings' },
  ];

  const activeValue = NAV_ITEMS.find(
    (item) => item.path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.path)
  )?.path ?? '/';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {isDesktop && (
        <Drawer
          variant="permanent"
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: SIDEBAR_WIDTH,
              boxSizing: 'border-box',
              borderRight: `1px solid ${theme.palette.divider}`,
              bgcolor: 'background.paper',
            },
          }}
        >
          <Toolbar>
            <Typography variant="h6" fontWeight="bold" color="primary">
              Budget
            </Typography>
          </Toolbar>
          <Divider />
          <List>
            {NAV_ITEMS.map((item) => {
              const isActive = item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
              return (
                <ListItem key={item.path} disablePadding>
                  <ListItemButton
                    onClick={() => navigate(item.path)}
                    selected={isActive}
                    sx={{
                      mx: 1,
                      borderRadius: 2,
                      '&.Mui-selected': {
                        bgcolor: `${theme.palette.primary.main}15`,
                        color: 'primary.main',
                        '& .MuiListItemIcon-root': { color: 'primary.main' },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Drawer>
      )}

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Toolbar>
            {navigationIcon}
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
              {title}
            </Typography>
            {actions}
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            maxWidth: { md: 800 },
            width: '100%',
            mx: 'auto',
            pb: { xs: 8, md: 2 },
          }}
        >
          {children}
        </Box>
      </Box>

      {!isDesktop && (
        <Paper
          sx={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
          elevation={3}
        >
          <BottomNavigation
            showLabels
            value={activeValue}
            onChange={(_, newValue) => navigate(newValue)}
          >
            {NAV_ITEMS.map((item) => (
              <BottomNavigationAction
                key={item.path}
                label={item.label}
                icon={item.icon}
                value={item.path}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
};

export default Layout;
