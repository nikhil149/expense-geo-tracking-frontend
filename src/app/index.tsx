import React, { useState } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Dashboard } from '@/screens/Dashboard';
import { TransactionForm } from '@/screens/TransactionForm';

export default function IndexRoute() {
  const [showForm, setShowForm] = useState(false);
  const [editingTxId, setEditingTxId] = useState<number | null>(null);

  const handleOpenAdd = () => {
    setEditingTxId(null);
    setShowForm(true);
  };

  const handleOpenEdit = (id: number) => {
    setEditingTxId(id);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTxId(null);
  };

  return (
    <View style={styles.container}>
      <Dashboard
        onAddTransactionPress={handleOpenAdd}
        onEditTransactionPress={handleOpenEdit}
      />

      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseForm}
      >
        <TransactionForm
          transactionId={editingTxId}
          onClose={handleCloseForm}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
});
