import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, IconButton,
  Fab, CircularProgress, Stack, Avatar, Tabs, Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Archive as ArchiveIcon,
  Restaurant as RestaurantIcon,
  Home as HomeIcon,
  DirectionsCar as DirectionsCarIcon,
  ShoppingCart as ShoppingCartIcon,
  LocalHospital as LocalHospitalIcon,
  School as SchoolIcon,
  FitnessCenter as FitnessCenterIcon,
  Flight as FlightIcon,
  Movie as MovieIcon,
  Category as CategoryIcon,
  Payments as PaymentsIcon,
  MoreHoriz as MoreHorizIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { useCategories, useArchiveCategory } from '../hooks/useApi';
import { Category } from '../types/api';

export const ICON_MAP: Record<string, React.ElementType> = {
  restaurant: RestaurantIcon,
  home: HomeIcon,
  directions_car: DirectionsCarIcon,
  shopping_cart: ShoppingCartIcon,
  local_hospital: LocalHospitalIcon,
  school: SchoolIcon,
  fitness_center: FitnessCenterIcon,
  flight: FlightIcon,
  movie: MovieIcon,
  category: CategoryIcon,
  payments: PaymentsIcon,
  more_horiz: MoreHorizIcon,
};

const Categories = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const { data: categories, isLoading } = useCategories();
  const archiveMutation = useArchiveCategory();

  const filteredCategories = categories?.filter(c =>
    !c.isArchived && (tab === 0 ? c.type === 'EXPENSE' : c.type === 'INCOME')
  ) || [];

  if (isLoading) {
    return (
      <Layout title={t('categories.title')}>
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title={t('categories.title')}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab label={t('categories.expenses')} />
          <Tab label={t('categories.income')} />
        </Tabs>
      </Box>
      <Box p={2}>
        {filteredCategories.length === 0 && (
          <Typography color="text.secondary" textAlign="center" mt={4}>
            {t('categories.noCategories')}
          </Typography>
        )}
        <Stack spacing={1.5}>
          {filteredCategories.map((category) => (
            <CategoryListItem
              key={category.id}
              category={category}
              onClick={() => navigate(`/categories/edit/${category.id}`)}
              onArchive={() => archiveMutation.mutate(String(category.id))}
            />
          ))}
        </Stack>
      </Box>

      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: { xs: 80, md: 16 }, right: 16 }}
        onClick={() => navigate('/categories/add')}
      >
        <AddIcon />
      </Fab>
    </Layout>
  );
};

const CategoryListItem = ({
  category,
  onClick,
  onArchive,
}: {
  category: Category;
  onClick: () => void;
  onArchive: () => void;
}) => {
  const { t } = useTranslation();
  const IconComponent = ICON_MAP[category.icon ?? 'category'] ?? CategoryIcon;

  return (
    <Card
      variant="outlined"
      sx={{ border: 'none', bgcolor: 'background.paper' }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: '12px !important' }}>
        <Avatar
          onClick={onClick}
          sx={{ bgcolor: `${category.color}20`, color: category.color, width: 44, height: 44, cursor: 'pointer' }}
        >
          <IconComponent />
        </Avatar>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, flex: 1, cursor: 'pointer' }}
          onClick={onClick}
        >
          {category.name}
        </Typography>
        <IconButton
          size="small"
          onClick={onArchive}
          aria-label={t('categories.archiveCategory')}
          sx={{ color: 'text.disabled' }}
        >
          <ArchiveIcon fontSize="small" />
        </IconButton>
      </CardContent>
    </Card>
  );
};

export default Categories;
