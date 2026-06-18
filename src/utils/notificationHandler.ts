import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseSMSTransaction } from '../store/smsParser';
import { API_BASE_URL } from '../store/useAppStore';

export const backgroundNotificationHandler = async ({ notification }: any) => {
  if (!notification) return;

  try {
    let notificationText = '';
    
    // Attempt to extract text from the notification object
    if (typeof notification === 'string') {
      try {
        const parsed = JSON.parse(notification);
        notificationText = parsed.text || parsed.titleBig || parsed.title || '';
      } catch (e) {
        notificationText = notification;
      }
    } else {
      notificationText = notification.text || notification.titleBig || notification.title || '';
    }

    if (!notificationText) return;

    // Run the text through our SMS parsing engine
    const transaction = parseSMSTransaction(notificationText);
    
    if (transaction) {
      // It's a valid transaction alert (Debit/Credit). Try to auto-log it.
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return; // Not logged in

      const txData = {
        title: transaction.title,
        amount: transaction.amount,
        type: transaction.type,
        date: transaction.date,
        // Optional tracking if location is available (Headless JS doesn't have foreground location access, so we skip it)
      };

      const res = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(txData),
      });

      if (!res.ok) {
        console.error('Failed to auto-log notification transaction:', await res.text());
      } else {
        console.log('Successfully intercepted and logged transaction:', transaction.title);
      }
    }
  } catch (error) {
    console.error('Error handling background notification:', error);
  }
};
