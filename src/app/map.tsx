import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SpendingMap } from '@/screens/SpendingMap';

export default function MapRoute() {
  return (
    <View style={styles.container}>
      <SpendingMap />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
});
