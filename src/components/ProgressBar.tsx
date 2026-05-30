import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';

interface ProgressBarProps {
  current: number;
  target: number;
  color?: string;
  height?: number;
  style?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  target,
  color = '#8B5CF6',
  height = 8,
  style,
}) => {
  const percentage = Math.min(Math.round((current / (target || 1)) * 100), 100);
  const displayPercentage = Math.round((current / (target || 1)) * 100);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.textRow}>
        <Text style={styles.stats}>
          ₹{current.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <Text style={styles.target}> of ₹{target.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</Text>
        </Text>
        <Text style={[styles.percentage, { color }]}>
          {displayPercentage}%
        </Text>
      </View>
      
      <View style={[styles.track, { height, borderRadius: height / 2 }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${percentage}%`,
              backgroundColor: color,
              borderRadius: height / 2,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 4,
  },
  textRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  stats: {
    color: '#F3F4F6',
    fontSize: 14,
    fontWeight: '700',
  },
  target: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '400',
  },
  percentage: {
    fontSize: 14,
    fontWeight: '800',
  },
  track: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
