import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import { Account, Transaction, Category, Budget, RecurringEvent, PlannedItem, ConfirmPayload, StatsSummary, MonthlyTrendItem } from '../types/api';

interface ApiCollection<T> {
  'hydra:member': T[];
  'hydra:totalItems': number;
}

export const useAccounts = () => {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiCollection<Account>>('/accounts');
      return data['hydra:member'];
    },
  });
};

export const useTransactions = (params?: object) => {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiCollection<Transaction>>('/transactions', { params });
      return data['hydra:member'];
    },
  });
};

export const useTransaction = (id?: string) => {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: async () => {
      const { data } = await apiClient.get<Transaction>(`/transactions/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (transaction: Partial<Transaction>) => {
      const { data } = await apiClient.post<Transaction>('/transactions', transaction);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

export const useUpdateTransaction = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (transaction: Partial<Transaction>) => {
      const { data } = await apiClient.put<Transaction>(`/transactions/${id}`, transaction);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction', id] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiCollection<Category>>('/categories');
      return data['hydra:member'];
    },
  });
};

export const useAccount = (id?: string) => {
  return useQuery({
    queryKey: ['account', id],
    queryFn: async () => {
      const { data } = await apiClient.get<Account>(`/accounts/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (account: Partial<Account>) => {
      const { data } = await apiClient.post<Account>('/accounts', account);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

export const useUpdateAccount = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (account: Partial<Account>) => {
      const { data } = await apiClient.put<Account>(`/accounts/${id}`, account);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['account', id] });
    },
  });
};

export const useCategory = (id?: string) => {
  return useQuery({
    queryKey: ['category', id],
    queryFn: async () => {
      const { data } = await apiClient.get<Category>(`/categories/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (category: Partial<Category>) => {
      const { data } = await apiClient.post<Category>('/categories', category);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

export const useUpdateCategory = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (category: Partial<Category>) => {
      const { data } = await apiClient.put<Category>(`/categories/${id}`, category);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category', id] });
    },
  });
};

export const useBudgets = () => {
  return useQuery({
    queryKey: ['budgets'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiCollection<Budget>>('/budgets');
      return data['hydra:member'];
    },
  });
};

// ── Recurring Events ──────────────────────────────────────────────────────────

export const useRecurringEvents = () => {
  return useQuery({
    queryKey: ['recurringEvents'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiCollection<RecurringEvent>>('/recurring_events');
      return data['hydra:member'];
    },
  });
};

export const useCreateRecurringEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (event: Partial<RecurringEvent>) => {
      const { data } = await apiClient.post<RecurringEvent>('/recurring_events', event);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringEvents'] });
    },
  });
};

export const useUpdateRecurringEvent = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (event: Partial<RecurringEvent>) => {
      const { data } = await apiClient.put<RecurringEvent>(`/recurring_events/${id}`, event);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringEvents'] });
    },
  });
};

export const useDeleteRecurringEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/recurring_events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringEvents'] });
      queryClient.invalidateQueries({ queryKey: ['plannedItems'] });
    },
  });
};

// ── Planned Items ─────────────────────────────────────────────────────────────

export const usePlannedItems = (month: number, year: number) => {
  const after = new Date(year, month - 1, 1).toISOString();
  const before = new Date(year, month, 0, 23, 59, 59).toISOString();
  return useQuery({
    queryKey: ['plannedItems', month, year],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiCollection<PlannedItem>>('/planned_items', {
        params: { 'dueDate[after]': after, 'dueDate[before]': before, itemsPerPage: 200 },
      });
      return data['hydra:member'];
    },
  });
};

export const useCreatePlannedItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: Partial<PlannedItem>) => {
      const { data } = await apiClient.post<PlannedItem>('/planned_items', item);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plannedItems'] });
    },
  });
};

export const useUpdatePlannedItem = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: Partial<PlannedItem>) => {
      const { data } = await apiClient.put<PlannedItem>(`/planned_items/${id}`, item);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plannedItems'] });
    },
  });
};

export const useDeletePlannedItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/planned_items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plannedItems'] });
    },
  });
};

export const useConfirmPlannedItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: ConfirmPayload }) => {
      const { data } = await apiClient.post(`/plan/confirm/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plannedItems'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
};

export const useGenerateMonth = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      const { data } = await apiClient.post('/plan/generate_month', { month, year });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plannedItems'] });
    },
  });
};

export const useBudget = (id?: string) => {
  return useQuery({
    queryKey: ['budget', id],
    queryFn: async () => {
      const { data } = await apiClient.get<Budget>(`/budgets/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useCreateBudget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (budget: Partial<Budget>) => {
      const { data } = await apiClient.post<Budget>('/budgets', budget);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
};

export const useUpdateBudget = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (budget: Partial<Budget>) => {
      const { data } = await apiClient.put<Budget>(`/budgets/${id}`, budget);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budget', id] });
    },
  });
};

export const useDeleteBudget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/budgets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

export const useArchiveCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch<Category>(`/categories/${id}`, { isArchived: true }, {
        headers: { 'Content-Type': 'application/merge-patch+json' },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

export const useStatsSummary = (year: number, month: number) => {
  return useQuery({
    queryKey: ['stats', 'summary', year, month],
    queryFn: async () => {
      const { data } = await apiClient.get<StatsSummary>('/stats/summary', {
        params: { year, month },
      });
      return data;
    },
  });
};

export const useMonthlyTrend = (months: number = 6) => {
  return useQuery({
    queryKey: ['stats', 'monthly-trend', months],
    queryFn: async () => {
      const { data } = await apiClient.get<MonthlyTrendItem[]>('/stats/monthly-trend', {
        params: { months },
      });
      return data;
    },
  });
};
