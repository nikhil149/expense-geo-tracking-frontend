import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { CategoryChart } from '../components/CategoryChart';
import { GlassCard } from '../components/GlassCard';
import * as LucideIcons from 'lucide-react-native';
const Icons = LucideIcons as any;

export const AnalyticsView: React.FC = () => {
  const {
    spendingByCategory,
    summary,
    fetchSpendingByCategory,
    fetchSummary,
  } = useAppStore();

  const [activeRange, setActiveRange] = useState<'all' | 'week' | 'month'>('all');

  useEffect(() => {
    fetchSpendingByCategory();
    fetchSummary();
  }, []);

  const handleRangeSelect = (range: 'all' | 'week' | 'month') => {
    setActiveRange(range);
    
    let startDate = undefined;
    const now = new Date();

    if (range === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = oneWeekAgo.toISOString();
    } else if (range === 'month') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = oneMonthAgo.toISOString();
    }

    fetchSpendingByCategory(startDate);
  };

  const savingsRate = summary.totalIncome > 0
    ? Math.round((summary.netSavings / summary.totalIncome) * 100)
    : 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Screen Title */}
        <View style={styles.headerRow}>
          <Text style={styles.titleText}>Financial Insights</Text>
        </View>

        {/* Date Filter Bar */}
        <GlassCard style={styles.rangeSelectorCard}>
          <Pressable
            style={[styles.rangeBtn, activeRange === 'all' && styles.rangeBtnActive]}
            onPress={() => handleRangeSelect('all')}
          >
            <Text style={[styles.rangeBtnText, activeRange === 'all' && styles.rangeBtnTextActive]}>
              All Time
            </Text>
          </Pressable>
          <Pressable
            style={[styles.rangeBtn, activeRange === 'week' && styles.rangeBtnActive]}
            onPress={() => handleRangeSelect('week')}
          >
            <Text style={[styles.rangeBtnText, activeRange === 'week' && styles.rangeBtnTextActive]}>
              Last 7 Days
            </Text>
          </Pressable>
          <Pressable
            style={[styles.rangeBtn, activeRange === 'month' && styles.rangeBtnActive]}
            onPress={() => handleRangeSelect('month')}
          >
            <Text style={[styles.rangeBtnText, activeRange === 'month' && styles.rangeBtnTextActive]}>
              Last 30 Days
            </Text>
          </Pressable>
        </GlassCard>

        {/* Savings Gauge Card */}
        <GlassCard style={styles.gaugeCard}>
          <View style={styles.gaugeHeader}>
            <Icons.PieChart size={18} color="#10B981" />
            <Text style={styles.gaugeTitle}>Savings & Investment Rate</Text>
          </View>
          <View style={styles.gaugeContent}>
            <View style={styles.rateCircle}>
              <Text style={styles.rateNum}>{savingsRate}%</Text>
              <Text style={styles.rateLabel}>Saved</Text>
            </View>
            <View style={styles.gaugeDetails}>
              <Text style={styles.detailsText}>
                You have allocated <Text style={styles.boldText}>{savingsRate}%</Text> of your total income to net cash growth and long-term investments.
              </Text>
              <View style={styles.miniProgressTrack}>
                <View
                  style={[
                    styles.miniProgressFill,
                    { width: `${Math.max(0, Math.min(savingsRate, 100))}%` },
                  ]}
                />
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Spending Category Donut Breakdown */}
        <GlassCard style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Icons.BarChart2 size={18} color="#8B5CF6" />
            <Text style={styles.chartTitle}>Categorized Expenditure</Text>
          </View>
          
          <CategoryChart data={spendingByCategory} />
        </GlassCard>
      </ScrollView>
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
    paddingBottom: 40,
  },
  headerRow: {
    marginBottom: 20,
    marginTop: Platform.OS === 'ios' ? 40 : 10,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F3F4F6',
  },
  rangeSelectorCard: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  rangeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  rangeBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  rangeBtnText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  rangeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  gaugeCard: {
    marginBottom: 20,
    padding: 18,
  },
  gaugeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  gaugeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F3F4F6',
  },
  gaugeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rateCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  rateNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  rateLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  gaugeDetails: {
    flex: 1,
  },
  detailsText: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 18,
  },
  boldText: {
    color: '#10B981',
    fontWeight: '800',
  },
  miniProgressTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  chartCard: {
    padding: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F3F4F6',
  },
});
