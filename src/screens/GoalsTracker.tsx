import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useAppStore, Goal } from '../store/useAppStore';
import { GlassCard } from '../components/GlassCard';
import { ProgressBar } from '../components/ProgressBar';
import * as LucideIcons from 'lucide-react-native';
const Icons = LucideIcons as any;

const GOAL_COLORS = ['#8B5CF6', '#10B981', '#6366F1', '#EC4899', '#F59E0B', '#EF4444', '#06B6D4'];
const GOAL_ICONS = ['plane', 'zap', 'shield', 'home', 'car', 'briefcase', 'gift', 'award', 'target'];

export const GoalsTracker: React.FC = () => {
  const {
    goals,
    isLoading,
    fetchGoals,
    createGoal,
    deleteGoal,
    fetchGoalDetails,
  } = useAppStore();

  const [expandedGoalId, setExpandedGoalId] = useState<number | null>(null);
  const [goalDetails, setGoalDetails] = useState<Goal | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [selectedColor, setSelectedColor] = useState('#8B5CF6');
  const [selectedIcon, setSelectedIcon] = useState('target');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleToggleExpand = async (id: number) => {
    if (expandedGoalId === id) {
      setExpandedGoalId(null);
      setGoalDetails(null);
    } else {
      setExpandedGoalId(id);
      try {
        const details = await fetchGoalDetails(id);
        setGoalDetails(details);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleCreateGoal = async () => {
    setFormError(null);
    if (!name || !targetAmount) {
      setFormError('Goal Name and Target Amount are required.');
      return;
    }
    const parsedAmount = parseFloat(targetAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid positive target amount.');
      return;
    }

    try {
      await createGoal({
        name,
        target_amount: parsedAmount,
        target_date: targetDate ? new Date(targetDate).toISOString() : null,
        color: selectedColor,
        icon: selectedIcon,
      });
      // Reset form
      setName('');
      setTargetAmount('');
      setTargetDate('');
      setShowAddForm(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create goal');
    }
  };

  const handleDeleteGoal = async (id: number) => {
    if (confirm('Are you sure you want to delete this savings goal? This will unlink associated transactions.')) {
      await deleteGoal(id);
      if (expandedGoalId === id) {
        setExpandedGoalId(null);
        setGoalDetails(null);
      }
    }
  };

  const GoalIcon = ({ name, color }: { name: string; color: string }) => {
    let IconComponent = (Icons as any)[name];
    if (!IconComponent) {
      const lower = name.toLowerCase();
      if (lower === 'plane') IconComponent = Icons.Plane;
      else if (lower === 'zap') IconComponent = Icons.Zap;
      else if (lower === 'shield') IconComponent = Icons.Shield;
      else if (lower === 'home') IconComponent = Icons.Home;
      else if (lower === 'car') IconComponent = Icons.Car;
      else if (lower === 'briefcase') IconComponent = Icons.Briefcase;
      else if (lower === 'gift') IconComponent = Icons.Gift;
      else if (lower === 'award') IconComponent = Icons.Award;
      else IconComponent = Icons.Target;
    }
    return <IconComponent size={20} color={color} />;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Screen Title */}
        <View style={styles.headerRow}>
          <Text style={styles.titleText}>Savings Goals</Text>
          <Pressable
            style={styles.addBtn}
            onPress={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? (
              <Icons.X size={18} color="#FFFFFF" />
            ) : (
              <Icons.Plus size={18} color="#FFFFFF" />
            )}
            <Text style={styles.addBtnText}>{showAddForm ? 'Close' : 'Add Goal'}</Text>
          </Pressable>
        </View>

        {/* Collapsible Goals Input Form */}
        {showAddForm && (
          <GlassCard style={styles.formCard}>
            <Text style={styles.formTitle}>New Financial Goal</Text>
            {formError && <Text style={styles.errorText}>{formError}</Text>}

            <TextInput
              placeholder="e.g. Europe Trip, Emergency Fund..."
              placeholderTextColor="#6B7280"
              value={name}
              onChangeText={setName}
              style={styles.formInput}
            />

            <View style={styles.inputRow}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Target Amount ($)</Text>
                <TextInput
                  placeholder="5000"
                  placeholderTextColor="#6B7280"
                  value={targetAmount}
                  onChangeText={setTargetAmount}
                  keyboardType="numeric"
                  style={styles.formInput}
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Target Date (YYYY-MM-DD)</Text>
                <TextInput
                  placeholder="2026-12-31"
                  placeholderTextColor="#6B7280"
                  value={targetDate}
                  onChangeText={setTargetDate}
                  style={styles.formInput}
                />
              </View>
            </View>

            {/* Colors picker */}
            <Text style={styles.inputLabel}>Accent Theme Color</Text>
            <View style={styles.colorSelector}>
              {GOAL_COLORS.map((c) => (
                <Pressable
                  key={c}
                  style={[
                    styles.colorOption,
                    { backgroundColor: c },
                    selectedColor === c && styles.colorOptionSelected,
                  ]}
                  onPress={() => setSelectedColor(c)}
                />
              ))}
            </View>

            {/* Icons Selector */}
            <Text style={styles.inputLabel}>Goal Symbol</Text>
            <View style={styles.iconSelector}>
              {GOAL_ICONS.map((ic) => (
                <Pressable
                  key={ic}
                  style={[
                    styles.iconOption,
                    selectedIcon === ic && styles.iconOptionSelected,
                  ]}
                  onPress={() => setSelectedIcon(ic)}
                >
                  <GoalIcon name={ic} color={selectedIcon === ic ? '#FFFFFF' : '#9CA3AF'} />
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.submitBtn} onPress={handleCreateGoal}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Create Goal</Text>
              )}
            </Pressable>
          </GlassCard>
        )}

        {/* Goals Progress Bars Grid */}
        {goals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icons.Target size={48} color="#374151" />
            <Text style={styles.emptyText}>No goals established yet. Start planning today!</Text>
          </View>
        ) : (
          goals.map((goal) => {
            const isExpanded = expandedGoalId === goal.id;
            const remaining = Math.max(0, goal.target_amount - goal.current_amount);
            const isCompleted = remaining === 0;

            return (
              <GlassCard key={goal.id} style={[styles.goalCard, isCompleted ? styles.completedGoal : undefined]}>
                <Pressable onPress={() => handleToggleExpand(goal.id)}>
                  <View style={styles.goalHeader}>
                    <View style={[styles.goalIconBox, { backgroundColor: `${goal.color}15` }]}>
                      <GoalIcon name={goal.icon || 'target'} color={goal.color} />
                    </View>
                    <View style={styles.goalTitleCol}>
                      <Text style={styles.goalName}>{goal.name}</Text>
                      {goal.target_date && (
                        <View style={styles.deadlineRow}>
                          <Icons.Calendar size={10} color="#9CA3AF" />
                          <Text style={styles.deadlineText}>
                            Target: {new Date(goal.target_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Pressable
                      style={styles.deleteGoalBtn}
                      onPress={() => handleDeleteGoal(goal.id)}
                    >
                      <Icons.Trash2 size={14} color="#EF4444" />
                    </Pressable>
                  </View>

                  {/* Standardized animated progress indicators */}
                  <ProgressBar current={goal.current_amount} target={goal.target_amount} color={goal.color} />

                  <View style={styles.goalMetricsRow}>
                    <Text style={styles.metricsLeft}>
                      {isCompleted ? (
                        <Text style={styles.completedTag}>Goal Achieved!</Text>
                      ) : (
                        `$${remaining.toLocaleString('en-US', { maximumFractionDigits: 0 })} remaining`
                      )}
                    </Text>
                    <Text style={styles.expandLabel}>
                      {isExpanded ? 'Hide Details' : 'View Deposits'}
                    </Text>
                  </View>
                </Pressable>

                {/* Expanded Transactions Logs */}
                {isExpanded && (
                  <View style={styles.expansionContainer}>
                    <Text style={styles.expansionTitle}>Investment Audit Trail</Text>
                    {!goalDetails ? (
                      <ActivityIndicator size="small" color={goal.color} style={{ marginVertical: 10 }} />
                    ) : goalDetails.investments && goalDetails.investments.length === 0 ? (
                      <Text style={styles.emptyInvestmentsText}>No transactions allocated to this goal yet.</Text>
                    ) : (
                      goalDetails.investments?.map((inv) => (
                        <View key={inv.id} style={styles.investmentRow}>
                          <View style={styles.investmentLeft}>
                            <Text style={styles.investmentTitle}>{inv.transaction_title}</Text>
                            <Text style={styles.investmentDate}>
                              {new Date(inv.allocated_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </Text>
                          </View>
                          <Text style={[styles.investmentAmt, { color: goal.color }]}>
                            +${inv.allocated_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </GlassCard>
            );
          })
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: Platform.OS === 'ios' ? 40 : 10,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F3F4F6',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  formCard: {
    marginBottom: 24,
    padding: 18,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 10,
    fontWeight: '600',
  },
  formInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    color: '#FFFFFF',
    paddingHorizontal: 12,
    height: 40,
    fontSize: 14,
    marginBottom: 12,
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputCol: {
    flex: 1,
  },
  inputLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  colorSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  colorOption: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#FFFFFF',
  },
  iconSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  iconOption: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  iconOptionSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  submitBtn: {
    backgroundColor: '#8B5CF6',
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  goalCard: {
    marginBottom: 16,
    padding: 16,
  },
  completedGoal: {
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  goalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goalTitleCol: {
    flex: 1,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  deadlineText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  deleteGoalBtn: {
    padding: 6,
  },
  goalMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  metricsLeft: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  completedTag: {
    color: '#10B981',
    fontWeight: '800',
  },
  expandLabel: {
    fontSize: 11,
    color: '#6366F1',
    fontWeight: '700',
  },
  expansionContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 14,
  },
  expansionTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    fontWeight: '700',
    marginBottom: 10,
  },
  emptyInvestmentsText: {
    color: '#6B7280',
    fontSize: 11,
    fontStyle: 'italic',
  },
  investmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  investmentLeft: {
    flex: 1,
  },
  investmentTitle: {
    color: '#F3F4F6',
    fontSize: 13,
    fontWeight: '600',
  },
  investmentDate: {
    color: '#6B7280',
    fontSize: 10,
    marginTop: 2,
  },
  investmentAmt: {
    fontSize: 13,
    fontWeight: '800',
  },
  emptyContainer: {
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 240,
    fontStyle: 'italic',
  },
});
