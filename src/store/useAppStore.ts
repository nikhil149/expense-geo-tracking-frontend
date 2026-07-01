import { create } from 'zustand';
import { Platform } from 'react-native';

// Dynamically resolve API URL depending on host platform and environment
// TODO: Replace <YOUR_CLOUDFRONT_DOMAIN> with your actual CloudFront distribution domain
// after completing AWS setup (Part 2.8 of the deployment plan).
// Example: 'https://d1abc2def3ghij.cloudfront.net/api'
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || (__DEV__
  ? Platform.select({
    android: 'http://192.168.100.22:5001/api', // Use computer's actual LAN IP for physical android devices
    ios: 'http://192.168.100.22:5001/api', // Use computer's actual LAN IP for physical iOS devices
    default: 'http://localhost:5001/api', // Web can safely use localhost
  })
  : 'https://wxm1ud51uf.execute-api.ap-south-1.amazonaws.com/api');

export interface User {
  id: number;
  phone_number: string;
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
  type: 'income' | 'expense' | 'investment' | 'transfer';
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

export interface RegionSpending {
  totalSpending: number;
  transactionCount: number;
  last7DaysSpending: number;
  last7DaysCount: number;
  currentMonthSpending: number;
  currentMonthCount: number;
}

export interface RegionBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface RawSmsPayload {
  id: string; // Unique ID to track failures
  raw_text: string;
  source_app: string;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
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
  regionSpending: RegionSpending | null;
  isRegionLoading: boolean;
  pendingSms: RawSmsPayload[];
  aiInsight: { summary: string; tip: string } | null;
  isLoadingInsight: boolean;
  aiGoalSuggestion: { title: string; target_amount: number; description: string; icon: string; color: string; } | null;
  isGeneratingGoal: boolean;

  // Actions
  fetchAiInsight: () => Promise<void>;
  clearAiInsight: () => void;
  fetchAiGoalSuggestion: () => Promise<void>;
  clearAiGoalSuggestion: () => void;
  sendOtp: (phone_number: string) => Promise<void>;
  verifyOtp: (phone_number: string, otp_code: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  initializeAuth: () => Promise<void>;

  enqueueSms: (payload: Omit<RawSmsPayload, 'id'>) => void;
  removeSms: (id: string) => void;
  flushPendingSms: () => Promise<void>;

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

  fetchRegionSpending: (bounds: RegionBounds) => Promise<void>;
  clearRegionSpending: () => void;
  clearError: () => void;

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
  regionSpending: null,
  isRegionLoading: false,
  pendingSms: [],
  aiInsight: null,
  isLoadingInsight: false,
  aiGoalSuggestion: null,
  isGeneratingGoal: false,

  initializeAuth: async () => {
    const token = await getStorageItem('auth_token');
    const cachedUser = await getStorageItem('auth_user');
    const cachedSms = await getStorageItem('pending_sms_queue');
    if (token && cachedUser) {
      set({
        token,
        user: JSON.parse(cachedUser),
        isAuthenticated: true,
        pendingSms: cachedSms ? JSON.parse(cachedSms) : []
      });
    }
  },

  enqueueSms: (payload) => {
    const newSms = { ...payload, id: Date.now().toString() + Math.random().toString(36).substring(7) };
    set((state) => {
      const updated = [...state.pendingSms, newSms];
      setStorageItem('pending_sms_queue', JSON.stringify(updated));
      return { pendingSms: updated };
    });
  },

  removeSms: (id) => {
    set((state) => {
      const updated = state.pendingSms.filter(s => s.id !== id);
      setStorageItem('pending_sms_queue', JSON.stringify(updated));
      return { pendingSms: updated };
    });
  },

  flushPendingSms: async () => {
    const { pendingSms, removeSms, token } = get();
    if (pendingSms.length === 0 || !token) return;

    for (const sms of pendingSms) {
      try {
        const res = await fetch(`${API_BASE_URL}/sms/raw`, {
          method: 'POST',
          headers: getAuthHeaders(token),
          body: JSON.stringify(sms),
        });
        
        if (res.ok) {
          removeSms(sms.id);
        } else {
          console.error('[OfflineQueue] Failed to flush SMS:', sms.id, await res.text().catch(() => ''));
        }
      } catch (err) {
        console.error('[OfflineQueue] Network error while flushing SMS:', sms.id, err);
        // Break the loop, assume network is still down
        break;
      }
    }
  },

  sendOtp: async (phone_number) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  verifyOtp: async (phone_number, otp_code, name) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number, otp_code, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        // If it returns a specific error about needing a name, we throw that so UI can handle it.
        const error: any = new Error(data.error || 'Verification failed');
        error.isNewUser = data.isNewUser;
        throw error;
      }

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
        } catch (e) { }
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

  fetchRegionSpending: async (bounds) => {
    set({ isRegionLoading: true });
    try {
      const queryParams = new URLSearchParams({
        minLat: String(bounds.minLat),
        maxLat: String(bounds.maxLat),
        minLng: String(bounds.minLng),
        maxLng: String(bounds.maxLng),
      });
      const res = await fetch(`${API_BASE_URL}/analytics/spending-by-region?${queryParams.toString()}`, {
        headers: getAuthHeaders(get().token),
      });
      if (!res.ok) throw new Error('Failed to fetch region spending');
      const data = await res.json();
      set({ regionSpending: data });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isRegionLoading: false });
    }
  },

  clearRegionSpending: () => {
    set({ regionSpending: null });
  },

  clearError: () => {
    set({ error: null });
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
  },

  fetchAiInsight: async () => {
    try {
      set({ isLoadingInsight: true, error: null });
      const { token } = get();
      const res = await fetch(`${API_BASE_URL}/analytics/ai-insights`, {
        headers: getAuthHeaders(token)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch AI insight');
      }
      const data = await res.json();
      set({ aiInsight: data, isLoadingInsight: false });
    } catch (error: any) {
      set({ error: error.message, isLoadingInsight: false });
    }
  },

  clearAiInsight: () => set({ aiInsight: null, error: null }),

  fetchAiGoalSuggestion: async () => {
    try {
      set({ isGeneratingGoal: true, error: null, aiGoalSuggestion: null });
      const { token } = get();
      const res = await fetch(`${API_BASE_URL}/analytics/ai-goal-suggestion`, {
        headers: getAuthHeaders(token)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate AI goal suggestion');
      }
      const data = await res.json();
      set({ aiGoalSuggestion: data, isGeneratingGoal: false });
    } catch (error: any) {
      set({ error: error.message, isGeneratingGoal: false });
    }
  },

  clearAiGoalSuggestion: () => set({ aiGoalSuggestion: null })
}));
