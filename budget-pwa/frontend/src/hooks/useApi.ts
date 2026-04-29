import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import { Account, Transaction, Category, Budget, PlannedPayment, StatsSummary, MonthlyTrendItem } from '../types/api';

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

export const usePlannedPayments = () => {
  return useQuery({
    queryKey: ['plannedPayments'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiCollection<PlannedPayment>>('/planned_payments');
      return data['hydra:member'];
    },
  });
};

export const usePlannedPayment = (id?: string) => {
  return useQuery({
    queryKey: ['plannedPayment', id],
    queryFn: async () => {
      const { data } = await apiClient.get<PlannedPayment>(`/planned_payments/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useCreatePlannedPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payment: Partial<PlannedPayment>) => {
      const { data } = await apiClient.post<PlannedPayment>('/planned_payments', payment);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plannedPayments'] });
    },
  });
};

export const useUpdatePlannedPayment = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payment: Partial<PlannedPayment>) => {
      const { data } = await apiClient.put<PlannedPayment>(`/planned_payments/${id}`, payment);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plannedPayments'] });
      queryClient.invalidateQueries({ queryKey: ['plannedPayment', id] });
    },
  });
};

export const useDeletePlannedPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/planned_payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plannedPayments'] });
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

export const useTogglePlannedPaymentPaid = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isPaid }: { id: string; isPaid: boolean }) => {
      const { data } = await apiClient.patch<PlannedPayment>(
        `/planned_payments/${id}`,
        { isPaid },
        { headers: { 'Content-Type': 'application/merge-patch+json' } }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plannedPayments'] });
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
