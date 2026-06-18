import { create } from 'zustand';
import { Platform } from 'react-native';

// Dynamically resolve API URL depending on host platform and environment
// TODO: Replace <YOUR_CLOUDFRONT_DOMAIN> with your actual CloudFront distribution domain
// after completing AWS setup (Part 2.8 of the deployment plan).
// Example: 'https://d1abc2def3ghij.cloudfront.net/api'
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || (__DEV__
  ? Platform.select({
    android: 'http://10.0.2.2:5001/api',
    ios: 'http://192.168.100.22:5001/api',
    default: 'http://localhost:5001/api', // Web can safely use localhost
  })
  : 'https://d29xz5ma6wsmg7.cloudfront.net/api');

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  is_custom: boolean;
}

export interface Transaction {
  id: number;
  title: string;
  amount: number;
  type: 'income' | 'expense' | 'investment';
  date: string;
  category_id: number | null;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  notes: string | null;
  linked_goal_id?: number | null;
  linked_goal_name?: string | null;
}

export interface Goal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  color: string;
  icon: string;
  investments?: Array<{
    id: number;
    transaction_id: number;
    transaction_title: string;
    transaction_amount: number;
    transaction_type: string;
    allocated_amount: number;
    allocated_date: string;
  }>;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  totalInvestment: number;
  netSavings: number;
}

interface MapFilters {
  category_id: number | null;
  startDate: string | null;
  endDate: string | null;
}

interface AppStoreState {
  // Auth state
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  transactions: Transaction[];
  categories: Category[];
  goals: Goal[];
  summary: FinanceSummary;
  mapLocations: Transaction[];
  spendingByCategory: any[];
  isLoading: boolean;
  error: string | null;
  mapFilters: MapFilters;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  verifyCode: (email: string, code: string) => Promise<string>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<string>;
  initializeAuth: () => Promise<void>;

  setMapFilters: (filters: Partial<MapFilters>) => void;
  resetMapFilters: () => void;

  fetchCategories: () => Promise<void>;
  createCategory: (name: string, color: string, icon: string) => Promise<Category>;

  fetchTransactions: (customFilters?: Record<string, any>) => Promise<void>;
  createTransaction: (txData: Omit<Transaction, 'id'> & { goal_id?: number | null }) => Promise<Transaction>;
  updateTransaction: (id: number, txData: Partial<Transaction> & { goal_id?: number | null }) => Promise<Transaction>;
  deleteTransaction: (id: number) => Promise<void>;

  fetchGoals: () => Promise<void>;
  fetchGoalDetails: (id: number) => Promise<Goal>;
  createGoal: (goalData: Omit<Goal, 'id' | 'current_amount'>) => Promise<Goal>;
  updateGoal: (id: number, goalData: Partial<Goal>) => Promise<Goal>;
  deleteGoal: (id: number) => Promise<void>;

  fetchSummary: () => Promise<void>;
  fetchSpendingByCategory: (startDate?: string, endDate?: string) => Promise<void>;
  fetchSpendingLocations: () => Promise<void>;

  loadAllData: () => Promise<void>;
}

import AsyncStorage from '@react-native-async-storage/async-storage';

const getStorageItem = async (key: string): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    } else {
      return await AsyncStorage.getItem(key);
    }
  } catch (e) {
    return null;
  }
};

const setStorageItem = async (key: string, value: string | null): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } else {
      if (value) await AsyncStorage.setItem(key, value);
      else await AsyncStorage.removeItem(key);
    }
  } catch (e) { }
};

// Helper to resolve request headers with JWT authorization
const getAuthHeaders = (token: string | null) => {
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const useAppStore = create<AppStoreState>((set, get) => ({
  // Auth initial state
  user: null,
  token: null,
  isAuthenticated: false,

  transactions: [],
  categories: [],
  goals: [],
  summary: {
    totalIncome: 0,
    totalExpense: 0,
    totalInvestment: 0,
    netSavings: 0,
  },
  mapLocations: [],
  spendingByCategory: [],
  isLoading: false,
  error: null,
  mapFilters: {
    category_id: null,
    startDate: null,
    endDate: null,
  },

  initializeAuth: async () => {
    const token = await getStorageItem('auth_token');
    const cachedUser = await getStorageItem('auth_user');
    if (token && cachedUser) {
      set({
        token,
        user: JSON.parse(cachedUser),
        isAuthenticated: true
      });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      await setStorageItem('auth_token', data.token);
      await setStorageItem('auth_user', JSON.stringify(data.user));

      set({
        token: data.token,
        user: data.user,
        isAuthenticated: true,
        error: null
      });

      // Fetch user data
      await get().loadAllData();
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      await setStorageItem('auth_token', data.token);
      await setStorageItem('auth_user', JSON.stringify(data.user));

      set({
        token: data.token,
        user: data.user,
        isAuthenticated: true,
        error: null
      });

      // Fetch user data
      await get().loadAllData();
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await setStorageItem('auth_token', null);
    await setStorageItem('auth_user', null);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      transactions: [],
      goals: [],
      mapLocations: [],
      spendingByCategory: [],
      summary: {
        totalIncome: 0,
        totalExpense: 0,
        totalInvestment: 0,
        netSavings: 0,
      }
    });
  },

  deleteAccount: async () => {
    set({ isLoading: true, error: null });
    try {
      const { token } = get();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }

      await get().logout();
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  forgotPassword: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send code');
      return data.message;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  verifyCode: async (email: string, code: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Invalid code');
      return data.message;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  resetPassword: async (email: string, code: string, newPassword: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to reset password');
      return data.message;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  setMapFilters: (filters) => {
    set((state) => ({
      mapFilters: { ...state.mapFilters, ...filters }
    }));
    get().fetchSpendingLocations();
  },

  resetMapFilters: () => {
    set({
      mapFilters: {
        category_id: null,
        startDate: null,
        endDate: null,
      }
    });
    get().fetchSpendingLocations();
  },

  fetchCategories: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/categories`, {
        headers: getAuthHeaders(get().token)
      });
      if (!res.ok) throw new Error('Failed to load categories');
      const data = await res.json();
      set({ categories: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  createCategory: async (name, color, icon) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: getAuthHeaders(get().token),
        body: JSON.stringify({ name, color, icon }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create category');
      }
      const data = await res.json();
      set((state) => ({ categories: [...state.categories, data] }));
      return data;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchTransactions: async (customFilters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(customFilters).forEach(([key, val]) => {
        if (val !== null && val !== undefined) queryParams.append(key, val);
      });
      const res = await fetch(`${API_BASE_URL}/transactions?${queryParams.toString()}`, {
        headers: getAuthHeaders(get().token)
      });
      if (!res.ok) throw new Error('Failed to load transactions');
      const data = await res.json();
      set({ transactions: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  createTransaction: async (txData) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: getAuthHeaders(get().token),
        body: JSON.stringify(txData),
      });
      if (!res.ok) {
        let errMsg = 'Failed to record transaction';
        try {
          const errData = await res.json();
          if (errData.error) errMsg = errData.error;
        } catch (e) {}
        throw new Error(errMsg);
      }
      const newTx = await res.json();

      await Promise.all([
        get().fetchTransactions(),
        get().fetchGoals(),
        get().fetchSummary(),
        get().fetchSpendingByCategory(),
        get().fetchSpendingLocations()
      ]);

      return newTx;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  updateTransaction: async (id, txData) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/transactions/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(get().token),
        body: JSON.stringify(txData),
      });
      if (!res.ok) throw new Error('Failed to update transaction');
      const updatedTx = await res.json();

      await Promise.all([
        get().fetchTransactions(),
        get().fetchGoals(),
        get().fetchSummary(),
        get().fetchSpendingByCategory(),
        get().fetchSpendingLocations()
      ]);

      return updatedTx;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteTransaction: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/transactions/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(get().token)
      });
      if (!res.ok) throw new Error('Failed to delete transaction');

      await Promise.all([
        get().fetchTransactions(),
        get().fetchGoals(),
        get().fetchSummary(),
        get().fetchSpendingByCategory(),
        get().fetchSpendingLocations()
      ]);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchGoals: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/goals`, {
        headers: getAuthHeaders(get().token)
      });
      if (!res.ok) throw new Error('Failed to load savings goals');
      const data = await res.json();
      set({ goals: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchGoalDetails: async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/goals/${id}`, {
        headers: getAuthHeaders(get().token)
      });
      if (!res.ok) throw new Error(`Failed to load goal details for ${id}`);
      return await res.json();
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  createGoal: async (goalData) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/goals`, {
        method: 'POST',
        headers: getAuthHeaders(get().token),
        body: JSON.stringify(goalData),
      });
      if (!res.ok) throw new Error('Failed to create savings goal');
      const newGoal = await res.json();
      await get().fetchGoals();
      return newGoal;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  updateGoal: async (id, goalData) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/goals/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(get().token),
        body: JSON.stringify(goalData),
      });
      if (!res.ok) throw new Error('Failed to update savings goal');
      const updatedGoal = await res.json();
      await get().fetchGoals();
      return updatedGoal;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteGoal: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/goals/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(get().token)
      });
      if (!res.ok) throw new Error('Failed to delete savings goal');
      await Promise.all([
        get().fetchGoals(),
        get().fetchTransactions()
      ]);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSummary: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/analytics/summary`, {
        headers: getAuthHeaders(get().token)
      });
      if (!res.ok) throw new Error('Failed to fetch finance summary');
      const data = await res.json();
      set({ summary: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchSpendingByCategory: async (startDate, endDate) => {
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      const res = await fetch(`${API_BASE_URL}/analytics/spending-by-category?${queryParams.toString()}`, {
        headers: getAuthHeaders(get().token)
      });
      if (!res.ok) throw new Error('Failed to load spending category details');
      const data = await res.json();
      set({ spendingByCategory: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchSpendingLocations: async () => {
    try {
      const { category_id, startDate, endDate } = get().mapFilters;
      const queryParams = new URLSearchParams();
      if (category_id) queryParams.append('category_id', String(category_id));
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const res = await fetch(`${API_BASE_URL}/analytics/spending-locations?${queryParams.toString()}`, {
        headers: getAuthHeaders(get().token)
      });
      if (!res.ok) throw new Error('Failed to load map transactions coordinates');
      const data = await res.json();
      set({ mapLocations: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  loadAllData: async () => {
    if (!get().token) return; // Do not fetch if not authenticated
    set({ isLoading: true, error: null });
    try {
      await Promise.all([
        get().fetchCategories(),
        get().fetchTransactions(),
        get().fetchGoals(),
        get().fetchSummary(),
        get().fetchSpendingByCategory(),
        get().fetchSpendingLocations(),
      ]);
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  }
}));
