import React, { useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  Stack,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Check as SaveIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useCategory, useCreateCategory, useUpdateCategory } from '../hooks/useApi';

const AddEditCategory = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const { data: category, isLoading: isCategoryLoading } = useCategory(id);
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory(id || '');

  const [name, setName] = useState('');
  const [type, setType] = useState('EXPENSE');
  const [color, setColor] = useState('#F44336');

  useEffect(() => {
    if (category) {
      setName(category.name);
      setType(category.type);
      setColor(category.color);
    }
  }, [category]);

  const colors = ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'];

  const handleSave = async () => {
    const payload = {
      name,
      type: type as 'INCOME' | 'EXPENSE',
      color,
      icon: 'category', // default for now
    };

    if (isEdit) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
    navigate(-1);
  };

  const isLoading = isCategoryLoading;

  if (isLoading) {
    return (
      <Layout title={isEdit ? "Edit Category" : "Add Category"}>
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout
      title={isEdit ? "Edit Category" : "Add Category"}
      navigationIcon={
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>
      }
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
            <ToggleButton value="EXPENSE">Expense</ToggleButton>
            <ToggleButton value="INCOME">Income</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            label="Category Name"
            variant="outlined"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Food, Salary, Gift"
          />

          <Box>
            <Box mb={1} ml={1}>
              <Box component="span" fontSize="0.75rem" color="text.secondary">Category Color</Box>
            </Box>
            <Grid container spacing={1}>
              {colors.map((c) => (
                <Grid item key={c} xs={3} sm={2} md={1.5}>
                  <Box
                    onClick={() => setColor(c)}
                    sx={{
                      height: 40,
                      bgcolor: c,
                      borderRadius: 1,
                      cursor: 'pointer',
                      border: color === c ? '3px solid white' : 'none',
                      boxShadow: color === c ? `0 0 0 2px ${c}` : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>

          <Button 
            variant="contained" 
            size="large" 
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
            sx={{ mt: 2, height: 56, borderRadius: 3 }}
          >
            {isEdit ? "Update Category" : "Save Category"}
          </Button>
        </Stack>
      </Box>
    </Layout>
  );
};

export default AddEditCategory;
