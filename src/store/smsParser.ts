/**
 * Geospatial SMS / Notification Transaction Parsing Engine
 */

interface ParsedTransaction {
  amount: number;
  title: string;
  type: 'expense' | 'income' | 'investment';
  notes: string;
}

/**
 * Parses standard bank transactional SMS alert copy and extracts amounts,
 * merchant names, and categorizations.
 */
export function parseSMSTransaction(message: string): ParsedTransaction | null {
  if (!message || message.trim() === '') return null;

  const text = message.toLowerCase();

  // 1. Transaction Check (Verify it is an outgoing expense or payment alert)
  const isTransaction = 
    text.includes('debited') ||
    text.includes('spent') ||
    text.includes('charged') ||
    text.includes('payment to') ||
    text.includes('paid to') ||
    text.includes('withdrawn') ||
    text.includes('transferred to') ||
    text.includes('sent to') ||
    text.includes('purchase at');

  if (!isTransaction) return null;

  // 2. Amount Extraction
  // Match standard Indian Rupees and general currency indicators (₹, Rs, Rs., INR, $, USD) followed by floats
  const amountRegex = /(?:rs\.?|inr|₹|\$|usd)\s*([\d,]+(?:\.\d{2})?)/i;
  const amountMatch = message.match(amountRegex);
  
  if (!amountMatch) return null;

  // Clean commas from amount before parsing
  const cleanAmountStr = amountMatch[1].replace(/,/g, '');
  const amount = parseFloat(cleanAmountStr);

  if (isNaN(amount) || amount <= 0) return null;

  // 3. Merchant / Business Title Extraction
  let merchant = 'Unknown Merchant';
  
  // Look for "at <Business Name>" or "to <Business Name>" patterns
  const merchantAtRegex = /(?:at|to|in)\s+([A-Z][A-Za-z0-9'&.\s]{2,30}?)(?=\s+on|\s+using|\s+via|\s+from|\s+for|\s+successful|\.|$)/;
  const merchantMatch = message.match(merchantAtRegex);

  if (merchantMatch && merchantMatch[1]) {
    merchant = merchantMatch[1].trim();
  } else {
    // Alternate check: check for common mock keywords seeded inside the database
    const commonMerchants = [
      'Starbucks', 'Blue Bottle', 'Whole Foods', 'Safeway', 'Equinox', 
      'Shell', 'Chevron', 'Apple Store', 'AMC Metreon', 'CVS', 'Dolores Park Cafe'
    ];
    for (const m of commonMerchants) {
      if (text.includes(m.toLowerCase())) {
        merchant = m;
        break;
      }
    }
  }

  // Double check and clean up merchant title length
  if (merchant.length > 50) {
    merchant = merchant.substring(0, 50) + '...';
  }

  // 4. Type & Notes mapping
  return {
    amount,
    title: merchant,
    type: 'expense', // SMS notifications are almost exclusively expense bank alerts
    notes: `Auto-logged via background SMS notification parser. Raw Text: "${message}"`
  };
}
