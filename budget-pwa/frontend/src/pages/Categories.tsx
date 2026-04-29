import React, { useState } from 'react';
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
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useCategories } from '../hooks/useApi';

const Categories = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const { data: categories, isLoading } = useCategories();

  const filteredCategories = categories?.filter(c => 
    tab === 0 ? c.type === 'EXPENSE' : c.type === 'INCOME'
  ) || [];

  if (isLoading) {
    return (
      <Layout title="Categories">
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Categories">
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab label="Expenses" />
          <Tab label="Income" />
        </Tabs>
      </Box>
      <Box p={2}>
        <Stack spacing={1.5}>
          {filteredCategories.map((category) => (
            <CategoryListItem 
              key={category.id} 
              category={category} 
              onClick={() => navigate(`/categories/edit/${category.id}`)}
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
        onClick={() => navigate('/categories/add')}
      >
        <AddIcon />
      </Fab>
    </Layout>
  );
};

const CategoryListItem = ({ category, onClick }) => {
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
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: '12px !important' }}>
        <Avatar 
          sx={{ 
            bgcolor: `${category.color}20`, 
            color: category.color,
            width: 44,
            height: 44
          }}
        >
          <CategoryIcon />
        </Avatar>
        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
          {category.name}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default Categories;
