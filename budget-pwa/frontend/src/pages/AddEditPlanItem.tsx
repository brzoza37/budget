import { useState, useEffect } from 'react';
import {
  Box, TextField, Button, Typography, MenuItem, Stack,
  ToggleButton, ToggleButtonGroup, Select, FormControl,
  InputLabel, CircularProgress, Alert, IconButton, Divider,
} from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  useCategories, useAccounts, useRecurringEvents,
  useCreatePlannedItem, useUpdatePlannedItem, useDeletePlannedItem,
  useCreateRecurringEvent, useGenerateMonth,
} from '../hooks/useApi';
import type { PlannedItem, RecurringEvent } from '../types/api';
import apiClient from '../api/apiClient';

type Mode = 'one-off' | 'recurring';

const AddEditPlanItem = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  useRecurringEvents();

  const createItem = useCreatePlannedItem();
  const updateItem = useUpdatePlannedItem(id ?? '');
  const deleteItem = useDeletePlannedItem();
  const createEvent = useCreateRecurringEvent();
  const generateMonth = useGenerateMonth();

  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<Mode>('one-off');
  const [form, setForm] = useState({
    name: '',
    amount: '',
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    category: '',
    account: '',
    dueDate: new Date().toISOString().split('T')[0],
    note: '',
    // Recurring fields
    repeatEvery: '1',
    repeatUnit: 'months' as 'days' | 'weeks' | 'months' | 'years',
    dayOfMonth: '',
    startDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (!isEdit) return;
    apiClient.get<PlannedItem>(`/planned_items/${id}`)
      .then(({ data }) => {
        setForm((f) => ({
          ...f,
          name: data.name,
          amount: String(data.amount),
          type: data.type,
          category: data.category?.['@id'] ?? '',
          account: data.account?.['@id'] ?? '',
          dueDate: data.dueDate.split('T')[0],
          note: data.note ?? '',
        }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, isEdit]);

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const now = new Date();

    try {
      if (isEdit) {
        await updateItem.mutateAsync({
          name: form.name,
          amount: parseFloat(form.amount),
          type: form.type,
          category: form.category || undefined,
          account: form.account || undefined,
          dueDate: form.dueDate,
          note: form.note || undefined,
        } as Partial<PlannedItem>);
      } else if (mode === 'one-off') {
        await createItem.mutateAsync({
          name: form.name,
          amount: parseFloat(form.amount),
          type: form.type,
          category: form.category || undefined,
          account: form.account || undefined,
          dueDate: form.dueDate,
          note: form.note || undefined,
        } as Partial<PlannedItem>);
      } else {
        // Create recurring event then generate current month
        await createEvent.mutateAsync({
          name: form.name,
          amount: parseFloat(form.amount),
          type: form.type,
          category: form.category || undefined,
          account: form.account || undefined,
          repeatEvery: parseInt(form.repeatEvery, 10),
          repeatUnit: form.repeatUnit,
          dayOfMonth: form.dayOfMonth ? parseInt(form.dayOfMonth, 10) : undefined,
          startDate: form.startDate + 'T00:00:00+00:00',
          note: form.note || undefined,
        } as Partial<RecurringEvent>);

        await generateMonth.mutateAsync({ month: now.getMonth() + 1, year: now.getFullYear() });
      }

      navigate('/plan');
    } catch {
      setError('Failed to save. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this planned item?')) return;
    await deleteItem.mutateAsync(id!);
    navigate('/plan');
  };

  if (loading) {
    return (
      <Layout title="Plan Item" navigationIcon={<IconButton onClick={() => navigate('/plan')}><BackIcon /></IconButton>}>
        <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  const isSubmitting = createItem.isPending || updateItem.isPending || createEvent.isPending;

  return (
    <Layout
      title={isEdit ? 'Edit Plan Item' : 'Add Plan Item'}
      navigationIcon={<IconButton onClick={() => navigate('/plan')}><BackIcon /></IconButton>}
    >
      <Box p={2} component="form" onSubmit={handleSubmit}>
        <Stack spacing={2.5}>
          {!isEdit && (
            <ToggleButtonGroup value={mode} exclusive onChange={(_, v) => v && setMode(v)} size="small" fullWidth>
              <ToggleButton value="one-off">One-off</ToggleButton>
              <ToggleButton value="recurring">Recurring</ToggleButton>
            </ToggleButtonGroup>
          )}

          <ToggleButtonGroup value={form.type} exclusive onChange={(_, v) => v && update('type', v)} size="small" fullWidth>
            <ToggleButton value="EXPENSE">Expense</ToggleButton>
            <ToggleButton value="INCOME">Income</ToggleButton>
          </ToggleButtonGroup>

          <TextField label="Name" value={form.name} onChange={(e) => update('name', e.target.value)} required fullWidth />
          <TextField label="Amount" type="number" value={form.amount} onChange={(e) => update('amount', e.target.value)} required fullWidth inputProps={{ min: 0.01, step: 0.01 }} />

          <FormControl fullWidth>
            <InputLabel>Category (optional)</InputLabel>
            <Select value={form.category} label="Category (optional)" onChange={(e) => update('category', e.target.value)}>
              <MenuItem value=""><em>None</em></MenuItem>
              {categories?.filter((c) => c.type === form.type).map((c) => (
                <MenuItem key={c.id} value={c['@id']}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Account (optional)</InputLabel>
            <Select value={form.account} label="Account (optional)" onChange={(e) => update('account', e.target.value)}>
              <MenuItem value=""><em>None</em></MenuItem>
              {accounts?.map((a) => (
                <MenuItem key={a.id} value={a['@id']}>{a.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {mode === 'one-off' || isEdit ? (
            <TextField
              label="Due Date"
              type="date"
              value={form.dueDate}
              onChange={(e) => update('dueDate', e.target.value)}
              required
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          ) : (
            <>
              <Divider />
              <Typography variant="labelMedium" color="text.secondary">Recurrence</Typography>
              <Box display="flex" gap={1}>
                <TextField
                  label="Every"
                  type="number"
                  value={form.repeatEvery}
                  onChange={(e) => update('repeatEvery', e.target.value)}
                  inputProps={{ min: 1, step: 1 }}
                  sx={{ width: 100 }}
                />
                <FormControl sx={{ flex: 1 }}>
                  <InputLabel>Unit</InputLabel>
                  <Select value={form.repeatUnit} label="Unit" onChange={(e) => update('repeatUnit', e.target.value)}>
                    <MenuItem value="days">Days</MenuItem>
                    <MenuItem value="weeks">Weeks</MenuItem>
                    <MenuItem value="months">Months</MenuItem>
                    <MenuItem value="years">Years</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {(form.repeatUnit === 'months' || form.repeatUnit === 'years') && (
                <TextField
                  label="On day of month (1–31)"
                  type="number"
                  value={form.dayOfMonth}
                  onChange={(e) => update('dayOfMonth', e.target.value)}
                  inputProps={{ min: 1, max: 31 }}
                  fullWidth
                />
              )}

              <TextField
                label="Starting"
                type="date"
                value={form.startDate}
                onChange={(e) => update('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </>
          )}

          <TextField label="Note (optional)" value={form.note} onChange={(e) => update('note', e.target.value)} multiline rows={2} fullWidth />

          {error && <Alert severity="error">{error}</Alert>}

          <Button variant="contained" type="submit" disabled={isSubmitting} size="large" sx={{ borderRadius: 2, py: 1.5 }}>
            {isEdit ? 'Update' : mode === 'recurring' ? 'Create Recurring' : 'Add to Plan'}
          </Button>

          {isEdit && (
            <Button variant="outlined" color="error" onClick={handleDelete} disabled={deleteItem.isPending}>
              Delete
            </Button>
          )}
        </Stack>
      </Box>
    </Layout>
  );
};

export default AddEditPlanItem;
