import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Select, MenuItem, FormControl,
  InputLabel, ToggleButton, ToggleButtonGroup, Typography, Stack,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAccounts } from '../hooks/useApi';
import type { PlannedItem } from '../types/api';
import { formatAmount } from '../utils/formatAmount';

interface Props {
  item: PlannedItem | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: { amount: number; accountId: number; date: string }) => void;
  isLoading: boolean;
}

const ConfirmSheet = ({ item, open, onClose, onConfirm, isLoading }: Props) => {
  const { t } = useTranslation();
  const { data: accounts } = useAccounts();
  const [mode, setMode] = useState<'full' | 'partial'>('full');
  const [partialAmount, setPartialAmount] = useState('');
  const [accountId, setAccountId] = useState<number | ''>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  if (!item) return null;

  const alreadyPaid = item.paidAmount ?? 0;
  const remaining = item.amount - alreadyPaid;
  const confirmAmount = mode === 'full' ? remaining : parseFloat(partialAmount || '0');
  const label = item.type === 'INCOME' ? t('plan.markAsReceived') : t('plan.markAsPaid');

  const handleConfirm = () => {
    if (!accountId) return;
    onConfirm({ amount: confirmAmount, accountId: Number(accountId), date });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{label}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Typography variant="body2" color="text.secondary">
            {item.name} — planned {formatAmount(item.amount, 'USD')}
            {alreadyPaid > 0 && ` ${t('plan.alreadyPaid', { amount: formatAmount(alreadyPaid, 'USD') })}`}
          </Typography>

          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, v) => v && setMode(v)}
            size="small"
            fullWidth
          >
            <ToggleButton value="full">{t('plan.fullAmount', { amount: formatAmount(remaining, 'USD') })}</ToggleButton>
            <ToggleButton value="partial">{t('plan.partial')}</ToggleButton>
          </ToggleButtonGroup>

          {mode === 'partial' && (
            <TextField
              label={t('plan.amount')}
              type="number"
              value={partialAmount}
              onChange={(e) => setPartialAmount(e.target.value)}
              inputProps={{ min: 0.01, max: remaining, step: 0.01 }}
              size="small"
              fullWidth
            />
          )}

          <FormControl fullWidth size="small">
            <InputLabel>{t('plan.account')}</InputLabel>
            <Select
              value={accountId}
              label={t('plan.account')}
              onChange={(e) => setAccountId(Number(e.target.value))}
            >
              {accounts?.map((a) => (
                <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label={t('plan.date')}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={isLoading || !accountId || (mode === 'partial' && confirmAmount <= 0)}
        >
          {isLoading ? t('plan.saving') : label}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmSheet;
