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
    aiGoalSuggestion,
    isGeneratingGoal,
    fetchAiGoalSuggestion,
    clearAiGoalSuggestion,
    createGoal,
    error,
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

        {/* AI Goal Suggestions */}
        <GlassCard style={[styles.gaugeCard, { borderColor: 'rgba(139, 92, 246, 0.3)', marginBottom: 20 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Icons.Sparkles size={20} color="#8B5CF6" />
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#F9FAFB', marginLeft: 8 }}>AI Smart Goals</Text>
          </View>

          {!aiGoalSuggestion ? (
            <>
              <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 12 }}>
                Let AI analyze your income and expenses to suggest a personalized savings goal.
              </Text>
              <Pressable
                style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.3)', borderWidth: 1, padding: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}
                onPress={() => fetchAiGoalSuggestion()}
                disabled={isGeneratingGoal}
              >
                {isGeneratingGoal ? (
                  <Text style={{ color: '#8B5CF6', fontWeight: '600' }}>Analyzing Finances...</Text>
                ) : (
                  <>
                    <Icons.Zap size={16} color="#8B5CF6" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#8B5CF6', fontWeight: '600' }}>Suggest Goal</Text>
                  </>
                )}
              </Pressable>
            </>
          ) : (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ backgroundColor: aiGoalSuggestion.color, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  {(() => {
                    const IconComp = Icons[aiGoalSuggestion.icon] || Icons.Target;
                    return <IconComp size={16} color="#FFFFFF" />;
                  })()}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#F9FAFB', fontSize: 16, fontWeight: '600' }}>{aiGoalSuggestion.title}</Text>
                  <Text style={{ color: aiGoalSuggestion.color, fontSize: 14, fontWeight: '500' }}>
                    Target: ₹{aiGoalSuggestion.target_amount.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
              <Text style={{ color: '#D1D5DB', fontSize: 14, lineHeight: 20, marginBottom: 16 }}>
                {aiGoalSuggestion.description}
              </Text>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable
                  style={{ flex: 1, backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)', borderWidth: 1, padding: 12, borderRadius: 12, alignItems: 'center' }}
                  onPress={async () => {
                    await createGoal({
                      name: aiGoalSuggestion.title,
                      target_amount: aiGoalSuggestion.target_amount,
                      target_date: null,
                      color: aiGoalSuggestion.color,
                      icon: aiGoalSuggestion.icon
                    });
                    clearAiGoalSuggestion();
                    alert('Goal created successfully! Check your Goals tab.');
                  }}
                >
                  <Text style={{ color: '#10B981', fontWeight: '600' }}>Accept Goal</Text>
                </Pressable>
                <Pressable
                  style={{ flex: 1, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 12, borderRadius: 12, alignItems: 'center' }}
                  onPress={clearAiGoalSuggestion}
                >
                  <Text style={{ color: '#EF4444', fontWeight: '500' }}>Discard</Text>
                </Pressable>
              </View>
            </View>
          )}

          {error && error.includes('AI') && (
            <View style={{ marginTop: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}>
              <Icons.AlertTriangle size={14} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={{ color: '#EF4444', fontSize: 12, flex: 1 }}>{error}</Text>
            </View>
          )}
        </GlassCard>

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
