/**
 * Geospatial SMS / Notification Transaction Parsing Engine
 */

export interface ParsedTransaction {
  amount: number;
  title: string;
  type: 'expense' | 'income';
  notes: string;
  date?: string;
  payment_method?: 'credit_card' | 'debit_card' | 'upi' | 'net_banking' | 'wallet' | 'unknown';
  card_name?: string;      // e.g. "ICICI Bank Card XX8004"
  merchant_name?: string;  // e.g. "AMAZON PAY"
}

/**
 * Parses standard bank transactional SMS alert copy and extracts amounts,
 * merchant names, and categorizations.
 */
export function parseSMSTransaction(message: string): ParsedTransaction | null {
  if (!message || message.trim() === '') return null;

  // Strip WhatsApp/chat prefix if present, e.g. [31/05/26, 2:53:14 PM] Nikhil Rachawar:
  // Note the narrow space between PM and the name in some message formats.
  const cleanMessage = message.replace(/^\[\d{2}\/\d{2}\/\d{2},\s*\d{1,2}:\d{2}:\d{2}(?:\s| )?(?:AM|PM)\]\s*[^:]+:\s*/i, '');
  
  const text = cleanMessage.toLowerCase();

  // 1. Transaction Check (outgoing expense, income deposit, or payment alert)
  const isTransaction = 
    text.includes('debited') ||
    text.includes('spent') ||
    text.includes('charged') ||
    text.includes('payment of') ||
    text.includes('payment to') ||
    text.includes('paid to') ||
    text.includes('withdrawn') ||
    text.includes('transferred to') ||
    text.includes('sent to') ||
    text.includes('sent rs') ||
    text.includes('purchase at') ||
    text.includes('deposited') ||
    text.includes('credited') ||
    text.includes('received') ||
    text.includes('salary') ||
    text.includes('passbook balance') ||
    text.includes('contribution') ||
    text.includes('added to');

  if (!isTransaction) return null;

  // 1.5. Exclusion Check (reject reminders, upcoming payments, OTPs)
  if (
    text.includes('is due by') ||
    text.includes('to be debited') ||
    text.includes('reminder') ||
    text.includes('otp') ||
    text.includes('one time password')
  ) {
    return null;
  }

  // 2. Amount Extraction
  // Match standard Indian Rupees and general currency indicators (₹, Rs, Rs., INR, $, USD) followed by floats
  const amountRegex = /(?:rs\.?|inr|₹|\$|usd)\s*([\d,]+(?:\.\d{2})?)/i;
  const amountMatch = cleanMessage.match(amountRegex);
  
  if (!amountMatch) return null;

  // Clean commas from amount before parsing
  const cleanAmountStr = amountMatch[1].replace(/,/g, '');
  const amount = parseFloat(cleanAmountStr);

  if (isNaN(amount) || amount <= 0) return null;

  // 3. Type classification
  let type: 'expense' | 'income' = 'expense';
  if (text.includes('passbook balance') || text.includes('contribution') || text.includes('provident fund') || text.includes('epfo')) {
    type = 'expense';
  } else if (text.includes('deposited') || text.includes('credited') || text.includes('salary') || (text.includes('received') && !text.includes('credit card'))) {
    type = 'income';
  } else if (
    text.includes('invested') || text.includes('investment') || text.includes('mutual fund') || text.includes('sip') ||
    text.includes('zerodha') || text.includes('groww') || text.includes('upstox')
  ) {
    type = 'expense';
  }

  // 4. Payment Method & Card Name Detection
  let payment_method: ParsedTransaction['payment_method'] = 'unknown';
  let card_name: string | undefined;

  // Credit card patterns: "ICICI Bank Card XX8004", "HDFC Credit Card ending 1234", "SBI Card"
  const creditCardMatch = cleanMessage.match(/(?:(.+?)\s+)?(?:credit\s*card|card)\s*(?:ending\s*(?:with\s*)?|xx?|no\.?\s*)?(\d{4})/i)
    || cleanMessage.match(/([\w\s]+?Bank\s+Card)\s+XX?(\d{4})/i);
  
  // Debit card patterns
  const debitCardMatch = cleanMessage.match(/(?:(.+?)\s+)?debit\s*card\s*(?:ending\s*(?:with\s*)?|xx?|no\.?\s*)?(\d{4})/i);
  
  // UPI patterns
  const upiMatch = text.includes('upi') || text.includes('google pay') || text.includes('phonepe') || text.includes('paytm');
  
  // Wallet patterns
  const walletMatch = text.includes('wallet') || text.includes('amazon pay balance') || text.includes('paytm wallet');

  if (creditCardMatch) {
    payment_method = 'credit_card';
    const bankName = creditCardMatch[1]?.trim() || '';
    const lastDigits = creditCardMatch[2];
    card_name = bankName ? `${bankName} XX${lastDigits}` : `Credit Card XX${lastDigits}`;
    // Clean up card_name — remove amount/currency prefixes that might have been captured
    card_name = card_name.replace(/^(?:rs\.?|inr|₹|\$|usd)\s*[\d,]+\.?\d*\s*/i, '').trim();
    // Also try to extract clean bank name from the broader message
    const bankNameMatch = cleanMessage.match(/(ICICI|HDFC|SBI|Axis|Kotak|IndusInd|RBL|IDFC|Yes|Federal|BOB|PNB|Canara|Union)\s*(?:Bank)?\s*(?:Credit\s*)?Card/i);
    if (bankNameMatch) {
      card_name = `${bankNameMatch[1]} Bank Card XX${lastDigits}`;
    }
  } else if (debitCardMatch) {
    payment_method = 'debit_card';
    const bankName = debitCardMatch[1]?.trim() || '';
    const lastDigits = debitCardMatch[2];
    card_name = bankName ? `${bankName} Debit Card XX${lastDigits}` : `Debit Card XX${lastDigits}`;
  } else if (text.includes('using card') || text.includes('card xx') || text.includes('card ending')) {
    payment_method = 'credit_card'; // Default card type when not explicit
    const genericCardMatch = cleanMessage.match(/(?:([\w\s]+?)\s+)?Card\s*(?:XX?|ending\s*(?:with\s*)?|no\.?\s*)(\d{4})/i);
    if (genericCardMatch) {
      const bankName = genericCardMatch[1]?.trim() || '';
      const lastDigits = genericCardMatch[2];
      card_name = bankName ? `${bankName} Card XX${lastDigits}` : `Card XX${lastDigits}`;
      card_name = card_name.replace(/^(?:rs\.?|inr|₹|\$|usd)\s*[\d,]+\.?\d*\s*/i, '').trim();
      const bankNameMatch = cleanMessage.match(/(ICICI|HDFC|SBI|Axis|Kotak|IndusInd|RBL|IDFC|Yes|Federal|BOB|PNB|Canara|Union)\s*(?:Bank)?\s*(?:Credit\s*)?Card/i);
      if (bankNameMatch) {
        card_name = `${bankNameMatch[1]} Bank Card XX${lastDigits}`;
      }
    }
  } else if (upiMatch) {
    payment_method = 'upi';
  } else if (walletMatch) {
    payment_method = 'wallet';
  } else if (text.includes('net banking') || text.includes('neft') || text.includes('rtgs') || text.includes('imps')) {
    payment_method = 'net_banking';
  }

  // 5. Merchant / Business Title Extraction
  let merchant = 'Unknown Merchant';
  let merchant_name: string | undefined;

  // Extract merchant from "on <MERCHANT>" pattern (common in card SMS)
  // e.g. "spent...on AMAZON PAY IN E" or "at FLIPKART"
  const onMerchantMatch = cleanMessage.match(/(?:spent|charged|debited|purchase)\s+.*?\s+(?:on|at)\s+([A-Za-z0-9'\-&.\s]{2,40}?)(?=\.\s|\s+Avl|\s+Available|\s+Bal|\s+If\s+not|\s+Not\s+you|$)/i);

  // Specific custom regexes for matching the provided transaction patterns
  const creditCardPaymentMatch = cleanMessage.match(/payment of\s+(?:rs\.?|inr|₹|\$|usd)?\s*[\d,.]+\s+received towards your credit card ending with\s+(\d+)/i);
  const sentToMatch = cleanMessage.match(/Sent\s+(?:rs\.?|inr|₹|\$|usd)?\s*[\d,.]+\s+(?:From\s+.*?[\s\n])?To\s+([A-Za-z0-9'&.\s]{2,40}?)(?=\s+On|\s+using|\s+via|\s+Ref|\.|$|\n)/i);
  const epfMatch = cleanMessage.match(/passbook balance against\s+([A-Z0-9*]{4,20})/i);
  const nachMatch = cleanMessage.match(/(credit|debit)\s+(?:by|via)\s+NACH-?\s*([A-Za-z0-9'\-&.\s]*?)(?=\s+(?:of\s+(?:rs\.?|inr|₹|\$|usd)|on\s+\d|avl|balance)|$)/i);
  const standingInstructionMatch = cleanMessage.match(/(?:to|towards)\s+(?:Merchant\s+)?([A-Za-z0-9'\-&.\s]+?)(?:,|\s+as\s+per\s+Standing\s+Instruction)/i);
  const brokerMatch = cleanMessage.match(/added\s+to\s+your\s+([A-Za-z]+)\s+account/i);
  
  if (brokerMatch && brokerMatch[1]) {
    const rawBroker = brokerMatch[1].trim();
    merchant = `${rawBroker} Investment`;
    merchant_name = rawBroker;
    type = 'expense'; // Force expense type for investments
  } else if (nachMatch) {
    const isCredit = nachMatch[1].toLowerCase() === 'credit';
    const rawMerchant = nachMatch[2]?.trim();
    
    if (isCredit) {
      merchant = rawMerchant ? `Dividend income from ${rawMerchant}` : 'NACH Dividend Income';
      merchant_name = rawMerchant || 'NACH Credit';
      type = 'income';
    } else {
      merchant = rawMerchant ? `NACH Investment - ${rawMerchant}` : 'NACH SIP Investment';
      merchant_name = rawMerchant || 'NACH Debit';
      type = 'expense';
    }
  } else if (creditCardPaymentMatch) {
    const cardNum = creditCardPaymentMatch[1];
    const isHDFC = text.includes('hdfc');
    merchant = `${isHDFC ? 'HDFC Bank ' : ''}Credit Card ${cardNum} Payment`;
  } else if (onMerchantMatch && onMerchantMatch[1]) {
    merchant = onMerchantMatch[1].trim();
    merchant_name = merchant;
  } else if (epfMatch) {
    merchant = `EPF Contribution - ${epfMatch[1]}`;
  } else if (text.includes('passbook balance') || text.includes('contribution') || text.includes('provident fund')) {
    merchant = 'EPF Passbook Contribution';
  } else if (sentToMatch && sentToMatch[1]) {
    merchant = sentToMatch[1].trim();
    merchant_name = merchant;
  } else if (standingInstructionMatch && standingInstructionMatch[1]) {
    merchant = standingInstructionMatch[1].trim();
    merchant_name = merchant;
    // Strip "Merchant " if it got captured
    if (merchant.toLowerCase().startsWith('merchant ')) {
      merchant = merchant.substring(9).trim();
      merchant_name = merchant;
    }
  } else {
    // Look for "at <Business Name>", "to <Business Name>", "in <Business Name>" or "for <Business Name>" patterns
    const merchantAtRegex = /(?:at|to|in|for)\s+([A-Za-z0-9'\-&.\s]{2,40}?)(?=\s+on|\s+using|\s+via|\s+from|\s+for|\s+successful|\s+ref|\.|$|\n)/i;
    const merchantMatch = cleanMessage.match(merchantAtRegex);

    if (merchantMatch && merchantMatch[1] && !merchantMatch[1].trim().match(/^\d+$/)) {
      merchant = merchantMatch[1].trim();
      merchant_name = merchant;
      // Clean up common prefix like "ACH C- " or "SAL-" if present
      if (merchant.toUpperCase().startsWith('ACH C- ')) {
        merchant = merchant.replace(/^ACH C-\s*/i, '');
      }
      if (merchant.toUpperCase().startsWith('SAL-')) {
        merchant = 'Salary - ' + merchant.replace(/^SAL-\s*/i, '');
      }
    } else {
      // Alternate check: check for common mock keywords seeded inside the database
      const commonMerchants = [
        'Starbucks', 'Blue Bottle', 'Whole Foods', 'Safeway', 'Equinox', 
        'Shell', 'Chevron', 'Apple Store', 'AMC Metreon', 'CVS', 'Dolores Park Cafe', 'BLINK COMMERCE', 'HDFC'
      ];
      for (const m of commonMerchants) {
        if (text.includes(m.toLowerCase())) {
          merchant = m;
          merchant_name = m;
          break;
        }
      }
    }
  }

  // Clean up any trailing/leading symbols or phrases from merchant
  merchant = merchant.trim()
    .replace(/[,.\-]$/, '')
    .trim();

  if (merchant.length > 50) {
    merchant = merchant.substring(0, 50) + '...';
  }

  // 6. Date Extraction
  const dateVal = parseSMSDate(cleanMessage);

  // Build rich notes with payment metadata
  const notesParts = [`Auto-logged via background SMS notification parser.`];
  if (payment_method !== 'unknown') {
    notesParts.push(`Payment: ${payment_method.replace('_', ' ')}`);
  }
  if (card_name) {
    notesParts.push(`Card: ${card_name}`);
  }
  if (merchant_name) {
    notesParts.push(`Merchant: ${merchant_name}`);
  }
  notesParts.push(`Raw Text: "${cleanMessage.trim()}"`);

  return {
    amount,
    title: merchant,
    type,
    notes: notesParts.join(' | '),
    date: dateVal || new Date().toISOString(),
    payment_method,
    card_name,
    merchant_name: merchant_name || merchant,
  };
}

/**
 * Extracts and parses dates from SMS copy into standard ISO-8601 strings
 */
function parseSMSDate(text: string): string | null {
  // Try pattern 1: YYYY-MM-DD
  const p1 = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (p1) {
    const year = parseInt(p1[1], 10);
    const month = parseInt(p1[2], 10) - 1;
    const day = parseInt(p1[3], 10);
    return new Date(Date.UTC(year, month, day)).toISOString();
  }

  // Try pattern 3: DD-MMM-YY or DD-MMM-YYYY (e.g., 29-MAY-26)
  const p3 = text.match(/\b(\d{1,2})[-/]([A-Za-z]{3,9})[-/](\d{2,4})\b/);
  if (p3) {
    const day = parseInt(p3[1], 10);
    const monthStr = p3[2].toLowerCase();
    let year = parseInt(p3[3], 10);
    if (p3[3].length === 2) {
      year += 2000;
    }
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      january: 0, february: 1, march: 2, april: 3, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
    };
    const month = months[monthStr];
    if (month !== undefined) {
      return new Date(Date.UTC(year, month, day)).toISOString();
    }
  }

  // Try pattern 2: DD/MM/YY or DD/MM/YYYY (e.g., 30/05/26)
  const p2 = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/);
  if (p2) {
    const day = parseInt(p2[1], 10);
    const month = parseInt(p2[2], 10) - 1;
    let year = parseInt(p2[3], 10);
    if (p2[3].length === 2) {
      year += 2000;
    }
    return new Date(Date.UTC(year, month, day)).toISOString();
  }

  // Try pattern 4: MMM-YY or MMM-YYYY (e.g., May-26)
  const p4 = text.match(/\b([A-Za-z]{3,9})-(\d{2,4})\b/);
  if (p4) {
    const monthStr = p4[1].toLowerCase();
    let year = parseInt(p4[2], 10);
    if (p4[2].length === 2) {
      year += 2000;
    }
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      january: 0, february: 1, march: 2, april: 3, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
    };
    const month = months[monthStr];
    if (month !== undefined) {
      return new Date(Date.UTC(year, month, 1)).toISOString();
    }
  }

  return null;
}
