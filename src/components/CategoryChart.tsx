import React from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

interface SpendingItem {
  category_id: number;
  category_name: string;
  category_color: string;
  category_icon: string;
  total_amount: number;
}

interface CategoryChartProps {
  data: SpendingItem[];
}

export const CategoryChart: React.FC<CategoryChartProps> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0);

  if (total === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No spending recorded in this period.</Text>
      </View>
    );
  }

  // Format data for Gifted Charts PieChart
  const pieData = data.map((item) => {
    const amount = Number(item.total_amount) || 0;
    return {
      value: amount,
      color: item.category_color || '#8B5CF6',
      focused: true,
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        {Platform.OS === 'web' ? (
          <PieChart
            data={pieData}
            donut
            radius={80}
            innerRadius={60}
            strokeWidth={0}
            centerLabelComponent={() => {
              return (
                <View style={styles.centerTextContainer}>
                  <Text style={styles.centerSubText}>Total</Text>
                  <Text style={styles.centerMainText}>
                    ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </Text>
                </View>
              );
            }}
          />
        ) : (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <PieChart
              data={pieData}
              donut
              radius={80}
              innerRadius={60}
              strokeWidth={0}
              centerLabelComponent={() => {
                return (
                  <View style={styles.centerTextContainer}>
                    <Text style={styles.centerSubText}>Total</Text>
                    <Text style={styles.centerMainText}>
                      ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </Text>
                  </View>
                );
              }}
            />
          </View>
        )}
      </View>

      {/* Legend & Breakdown List */}
      <View style={styles.legendContainer}>
        {data.map((item, idx) => {
          const amount = Number(item.total_amount) || 0;
          const percent = Math.round((amount / total) * 100);

          return (
            <View key={idx} style={styles.legendItem}>
              <View style={styles.legendLeft}>
                <View style={[styles.colorBullet, { backgroundColor: item.category_color }]} />
                <Text style={styles.categoryName} numberOfLines={1}>
                  {item.category_name}
                </Text>
              </View>
              <View style={styles.legendRight}>
                <Text style={styles.categoryAmount}>
                  ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <Text style={styles.categoryPercent}>{percent}%</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  emptyContainer: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontStyle: 'italic',
  },
  chartWrapper: {
    position: 'relative',
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  centerTextContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  centerSubText: {
    fontSize: 11,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  centerMainText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F3F4F6',
    marginTop: 2,
  },
  nativeRingContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 10,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  nativeBar: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  legendContainer: {
    width: '100%',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorBullet: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  categoryName: {
    color: '#F3F4F6',
    fontSize: 14,
    fontWeight: '600',
  },
  legendRight: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    color: '#F3F4F6',
    fontSize: 14,
    fontWeight: '700',
  },
  categoryPercent: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 1,
  },
});
