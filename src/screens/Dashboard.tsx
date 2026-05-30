import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { GlassCard } from '../components/GlassCard';
import * as LucideIcons from 'lucide-react-native';
const Icons = LucideIcons as any;

// Helper to resolve Lucide icons dynamically from seeded string values
export const CategoryIcon = ({ name, color, size = 18 }: { name: string; color: string; size?: number }) => {
  // Map standard category names to correct Lucide components
  let IconComponent = (Icons as any)[name];
  if (!IconComponent) {
    // Standard fallbacks if name is a lower-case match
    const lower = name.toLowerCase();
    if (lower === 'utensils') IconComponent = Icons.Utensils;
    else if (lower === 'car') IconComponent = Icons.Car;
    else if (lower === 'home') IconComponent = Icons.Home;
    else if (lower === 'zap') IconComponent = Icons.Zap;
    else if (lower === 'film') IconComponent = Icons.Film;
    else if (lower === 'heart-pulse') IconComponent = Icons.HeartPulse;
    else if (lower === 'shopping-bag') IconComponent = Icons.ShoppingBag;
    else if (lower === 'trending-up') IconComponent = Icons.TrendingUp;
    else if (lower === 'bar-chart-2') IconComponent = Icons.BarChart2;
    else if (lower === 'plane') IconComponent = Icons.Plane;
    else if (lower === 'shield') IconComponent = Icons.Shield;
    else if (lower === 'target') IconComponent = Icons.Target;
    else IconComponent = Icons.HelpCircle;
  }
  return <IconComponent size={size} color={color} />;
};

interface DashboardProps {
  onAddTransactionPress: () => void;
  onEditTransactionPress: (id: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onAddTransactionPress,
  onEditTransactionPress,
}) => {
  const {
    transactions,
    summary,
    isLoading,
    loadAllData,
    deleteTransaction,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const handleRefresh = () => {
    loadAllData();
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      await deleteTransaction(id);
    }
  };

  const filteredTransactions = transactions.filter((tx) =>
    tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tx.location_name && tx.location_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (tx.category_name && tx.category_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top welcome profile bar */}
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.welcomeText}>Hello Nikhil,</Text>
            <Text style={styles.subWelcomeText}>Welcome to your Geo-Finance Hub</Text>
          </View>
          <Pressable style={styles.refreshBtn} onPress={handleRefresh}>
            <Icons.RotateCw size={18} color="#9CA3AF" />
          </Pressable>
        </View>

        {/* Dynamic Glassmorphic PFM stats overview */}
        <GlassCard style={styles.mainBalanceCard}>
          <Text style={styles.balanceLabel}>Net Cash Balance</Text>
          <Text style={styles.balanceValue}>
            ₹{summary.netSavings.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <View style={styles.statsDivider} />
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <View style={styles.statIconWrapper}>
                <Icons.TrendingUp size={16} color="#10B981" />
                <Text style={styles.statLabel}>Income</Text>
              </View>
              <Text style={styles.statValue}>
                ₹{summary.totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </View>
            <View style={styles.statCol}>
              <View style={styles.statIconWrapper}>
                <Icons.TrendingDown size={16} color="#EF4444" />
                <Text style={styles.statLabel}>Expenses</Text>
              </View>
              <Text style={styles.statValue}>
                ₹{summary.totalExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </View>
            <View style={styles.statCol}>
              <View style={styles.statIconWrapper}>
                <Icons.BarChart2 size={16} color="#6366F1" />
                <Text style={styles.statLabel}>Invested</Text>
              </View>
              <Text style={styles.statValue}>
                ₹{summary.totalInvestment.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Transactions list header & search */}
        <View style={styles.txSectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {isLoading && <ActivityIndicator size="small" color="#8B5CF6" />}
        </View>

        <View style={styles.searchBarContainer}>
          <Icons.Search size={16} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            placeholder="Search stores, categories, or names..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery !== '' && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Icons.X size={16} color="#6B7280" />
            </Pressable>
          )}
        </View>

        {/* Transactions logs list */}
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icons.IndianRupee size={40} color="#374151" />
            <Text style={styles.emptyText}>No matching transactions found.</Text>
          </View>
        ) : (
          filteredTransactions.map((tx) => {
            const isExpense = tx.type === 'expense';
            const isIncome = tx.type === 'income';
            const catColor = tx.category_color || '#9CA3AF';
            const catIcon = tx.category_icon || 'HelpCircle';
            const txAmt = tx.amount;

            return (
              <GlassCard key={tx.id} style={styles.txRowCard}>
                <View style={styles.txRowInner}>
                  {/* Left part: Icon & Title */}
                  <View style={[styles.txIconBox, { backgroundColor: `${catColor}15` }]}>
                    <CategoryIcon name={catIcon} color={catColor} size={20} />
                  </View>
                  <View style={styles.txInfoCol}>
                    <View style={styles.txTitleRow}>
                      <Text style={styles.txTitle} numberOfLines={1}>
                        {tx.title}
                      </Text>
                      {tx.linked_goal_id && (
                        <View style={styles.goalBadge}>
                          <Icons.Target size={10} color="#8B5CF6" />
                          <Text style={styles.goalBadgeText} numberOfLines={1}>
                            {tx.linked_goal_name}
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    {/* Location tag with Pin icon */}
                    {tx.location_name && (
                      <View style={styles.locationTag}>
                        <Icons.MapPin size={10} color="#9CA3AF" />
                        <Text style={styles.locationTagText} numberOfLines={1}>
                          {tx.location_name}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.txDate}>
                      {new Date(tx.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>

                  {/* Right part: Amount & Actions */}
                  <View style={styles.txRightCol}>
                    <Text
                      style={[
                        styles.txAmount,
                        { color: isIncome ? '#10B981' : tx.type === 'investment' ? '#6366F1' : '#EF4444' },
                      ]}
                    >
                      {isIncome ? '+' : '-'}₹{txAmt.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                    <View style={styles.actionRow}>
                      <Pressable
                        style={styles.actionBtn}
                        onPress={() => onEditTransactionPress(tx.id)}
                      >
                        <Icons.Edit2 size={12} color="#9CA3AF" />
                      </Pressable>
                      <Pressable
                        style={styles.actionBtn}
                        onPress={() => handleDelete(tx.id)}
                      >
                        <Icons.Trash2 size={12} color="#EF4444" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </GlassCard>
            );
          })
        )}
      </ScrollView>

      {/* Floating Add Transaction glowing Button */}
      <Pressable style={styles.fabBtn} onPress={onAddTransactionPress}>
        <Icons.Plus size={24} color="#FFFFFF" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Space for FAB
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: Platform.OS === 'ios' ? 40 : 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F3F4F6',
  },
  subWelcomeText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  mainBalanceCard: {
    marginBottom: 24,
    padding: 24,
  },
  balanceLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#9CA3AF',
    letterSpacing: 1,
    fontWeight: '600',
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statsDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 18,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCol: {
    flex: 1,
  },
  statIconWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F3F4F6',
  },
  txSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F3F4F6',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F3F4F6',
    fontSize: 14,
    height: '100%',
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  emptyContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 10,
    fontStyle: 'italic',
  },
  txRowCard: {
    marginBottom: 12,
    padding: 14,
  },
  txRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  txTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  txTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F3F4F6',
    maxWidth: 120,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
    maxWidth: 100,
  },
  goalBadgeText: {
    color: '#8B5CF6',
    fontSize: 9,
    fontWeight: '700',
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  locationTagText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '400',
    maxWidth: 160,
  },
  txDate: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 3,
  },
  txRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
    minHeight: 44,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  actionBtn: {
    padding: 4,
  },
  fabBtn: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      web: {
        cursor: 'pointer',
        boxShadow: '0 6px 20px rgba(139, 92, 246, 0.4)',
      },
    }),
  },
});
