import { create } from 'zustand';
import { Platform } from 'react-native';

// Dynamically resolve API URL depending on host platform
// 10.0.2.2 is the standard loopback address for Android Emulators to connect to development machine's localhost
export const API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:5001/api',
  ios: 'http://localhost:5001/api',
  default: 'http://localhost:5001/api', // handles web and others
});

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

export const useAppStore = create<AppStoreState>((set, get) => ({
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
      const res = await fetch(`${API_BASE_URL}/categories`);
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
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`${API_BASE_URL}/transactions?${queryParams.toString()}`);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txData),
      });
      if (!res.ok) throw new Error('Failed to record transaction');
      const newTx = await res.json();
      
      // Refresh local metrics and data
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
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`${API_BASE_URL}/goals`);
      if (!res.ok) throw new Error('Failed to load savings goals');
      const data = await res.json();
      set({ goals: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchGoalDetails: async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/goals/${id}`);
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
      });
      if (!res.ok) throw new Error('Failed to delete savings goal');
      await Promise.all([
        get().fetchGoals(),
        get().fetchTransactions() // transactions might get unlinked or cascade deleted
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
      const res = await fetch(`${API_BASE_URL}/analytics/summary`);
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
      const res = await fetch(`${API_BASE_URL}/analytics/spending-by-category?${queryParams.toString()}`);
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
      
      const res = await fetch(`${API_BASE_URL}/analytics/spending-locations?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to load map transactions coordinates');
      const data = await res.json();
      set({ mapLocations: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  loadAllData: async () => {
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
