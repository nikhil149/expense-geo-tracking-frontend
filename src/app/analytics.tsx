import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AnalyticsView } from '@/screens/AnalyticsView';

export default function AnalyticsRoute() {
  return (
    <View style={styles.container}>
      <AnalyticsView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
});
