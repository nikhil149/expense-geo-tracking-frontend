import React from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';

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

  // Donut chart configuration
  const radius = 50;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <View style={styles.container}>
      {/* SVG Donut Visual */}
      <View style={styles.chartWrapper}>
        {/* Render on Web/Native using standard platform wrapper */}
        {Platform.OS === 'web' ? (
          <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth={strokeWidth}
            />
            {data.map((item, idx) => {
              const amount = Number(item.total_amount) || 0;
              const percent = amount / total;
              const strokeLength = percent * circumference;
              const strokeOffset = circumference - (accumulatedPercent * circumference);
              accumulatedPercent += percent;

              return (
                <circle
                  key={idx}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke={item.category_color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${strokeLength} ${circumference}`}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              );
            })}
          </svg>
        ) : (
          /* Native fallback: simplified layout if react-native-svg is compiling,
             rendered as concentric colorful progress rings or a gorgeous solid visual bar */
          <View style={styles.nativeRingContainer}>
            <View style={styles.nativeBar}>
              {data.map((item, idx) => {
                const amount = Number(item.total_amount) || 0;
                const percent = (amount / total) * 100;
                return (
                  <View
                    key={idx}
                    style={{
                      height: '100%',
                      width: `${percent}%`,
                      backgroundColor: item.category_color,
                    }}
                  />
                );
              })}
            </View>
          </View>
        )}
        <View style={styles.centerTextContainer}>
          <Text style={styles.centerSubText}>Total Spending</Text>
          <Text style={styles.centerMainText}>
            ${total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Text>
        </View>
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
                  ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
