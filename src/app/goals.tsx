import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GoalsTracker } from '@/screens/GoalsTracker';

export default function GoalsRoute() {
  return (
    <View style={styles.container}>
      <GoalsTracker />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
});
