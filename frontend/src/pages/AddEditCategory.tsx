import React, { useState, useEffect } from 'react';
import {
  Box, IconButton, Stack, TextField, Button,
  CircularProgress, ToggleButtonGroup, ToggleButton, Typography, Avatar,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Check as SaveIcon } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { useCategory, useCreateCategory, useUpdateCategory } from '../hooks/useApi';
import { ICON_MAP } from './Categories';

const COLORS = ['#9E9E9E', '#F44336', '#E91E63', '#9C27B0', '#2196F3', '#4CAF50', '#FF9800', '#795548'];
const ICONS = Object.keys(ICON_MAP);

const AddEditCategory = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const { data: category, isLoading } = useCategory(id);
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory(id || '');

  const [name, setName] = useState('');
  const [type, setType] = useState('EXPENSE');
  const [color, setColor] = useState('#9E9E9E');
  const [icon, setIcon] = useState('category');

  useEffect(() => {
    if (category) {
      setName(category.name);
      setType(category.type);
      setColor(category.color);
      setIcon(category.icon ?? 'category');
    }
  }, [category]);

  const handleSave = async () => {
    const payload = { name, type: type as 'INCOME' | 'EXPENSE', color, icon };
    if (isEdit) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
    navigate(-1);
  };

  if (isLoading) {
    return (
      <Layout title={isEdit ? t('categories.editCategory') : t('categories.addCategory')}>
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout
      title={isEdit ? t('categories.editCategory') : t('categories.addCategory')}
      navigationIcon={<IconButton onClick={() => navigate(-1)}><ArrowBackIcon /></IconButton>}
      actions={
        <IconButton onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
          <SaveIcon />
        </IconButton>
      }
    >
      <Box p={2}>
        <Stack spacing={3}>
          <ToggleButtonGroup
            value={type}
            exclusive
            onChange={(_, v) => v && setType(v)}
            fullWidth
            color="primary"
          >
            <ToggleButton value="EXPENSE">{t('categories.typeExpense')}</ToggleButton>
            <ToggleButton value="INCOME">{t('categories.typeIncome')}</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            label={t('categories.categoryName')}
            variant="outlined"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('categories.categoryNamePlaceholder')}
          />

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {t('categories.categoryColor')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
              {COLORS.map((c) => (
                <Box
                  key={c}
                  onClick={() => setColor(c)}
                  sx={{
                    width: 36, height: 36, bgcolor: c, borderRadius: 1, cursor: 'pointer',
                    border: color === c ? '3px solid white' : 'none',
                    boxShadow: color === c ? `0 0 0 2px ${c}` : 'none',
                  }}
                />
              ))}
            </Box>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {t('categories.categoryIcon')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
              {ICONS.map((iconName) => {
                const IconComponent = ICON_MAP[iconName];
                return (
                  <Avatar
                    key={iconName}
                    onClick={() => setIcon(iconName)}
                    sx={{
                      width: 40, height: 40, cursor: 'pointer',
                      bgcolor: icon === iconName ? `${color}30` : 'action.hover',
                      color: icon === iconName ? color : 'text.secondary',
                      border: icon === iconName ? `2px solid ${color}` : '2px solid transparent',
                    }}
                  >
                    <IconComponent fontSize="small" />
                  </Avatar>
                );
              })}
            </Box>
          </Box>

          <Button
            variant="contained"
            size="large"
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending || !name.trim()}
            sx={{ mt: 2, height: 56, borderRadius: 3 }}
          >
            {isEdit ? t('categories.updateCategory') : t('categories.saveCategory')}
          </Button>
        </Stack>
      </Box>
    </Layout>
  );
};

export default AddEditCategory;
