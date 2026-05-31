/**
 * Geospatial SMS / Notification Transaction Parsing Engine
 */

export interface ParsedTransaction {
  amount: number;
  title: string;
  type: 'expense' | 'income' | 'investment';
  notes: string;
  date?: string;
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
    text.includes('contribution');

  if (!isTransaction) return null;

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
  let type: 'expense' | 'income' | 'investment' = 'expense';
  if (text.includes('passbook balance') || text.includes('contribution') || text.includes('provident fund') || text.includes('epfo')) {
    type = 'investment';
  } else if (text.includes('deposited') || text.includes('credited') || text.includes('salary') || (text.includes('received') && !text.includes('credit card'))) {
    type = 'income';
  } else if (text.includes('invested') || text.includes('investment') || text.includes('mutual fund') || text.includes('sip')) {
    type = 'investment';
  }

  // 4. Merchant / Business Title Extraction
  let merchant = 'Unknown Merchant';

  // Specific custom regexes for matching the provided transaction patterns
  const creditCardPaymentMatch = cleanMessage.match(/payment of\s+(?:rs\.?|inr|₹|\$|usd)?\s*[\d,.]+\s+received towards your credit card ending with\s+(\d+)/i);
  const sentToMatch = cleanMessage.match(/Sent\s+(?:rs\.?|inr|₹|\$|usd)?\s*[\d,.]+\s+(?:From\s+[^\n]+)?\s*To\s+([A-Za-z0-9'&.\s]{2,30}?)(?=\s+On|\s+using|\s+via|\s+Ref|\.|$|\n)/i);
  const epfMatch = cleanMessage.match(/passbook balance against\s+([A-Z0-9*]{4,20})/i);
  
  if (creditCardPaymentMatch) {
    const cardNum = creditCardPaymentMatch[1];
    const isHDFC = text.includes('hdfc');
    merchant = `${isHDFC ? 'HDFC Bank ' : ''}Credit Card ${cardNum} Payment`;
  } else if (epfMatch) {
    merchant = `EPF Contribution - ${epfMatch[1]}`;
  } else if (text.includes('passbook balance') || text.includes('contribution') || text.includes('provident fund')) {
    merchant = 'EPF Passbook Contribution';
  } else if (sentToMatch && sentToMatch[1]) {
    merchant = sentToMatch[1].trim();
  } else {
    // Look for "at <Business Name>", "to <Business Name>", "in <Business Name>" or "for <Business Name>" patterns
    const merchantAtRegex = /(?:at|to|in|for)\s+([A-Za-z0-9'\-&\.\s]{2,40}?)(?=\s+on|\s+using|\s+via|\s+from|\s+for|\s+successful|\s+ref|\.|$|\n)/i;
    const merchantMatch = cleanMessage.match(merchantAtRegex);

    if (merchantMatch && merchantMatch[1]) {
      merchant = merchantMatch[1].trim();
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
        'Shell', 'Chevron', 'Apple Store', 'AMC Metreon', 'CVS', 'Dolores Park Cafe', 'BLINK COMMERCE'
      ];
      for (const m of commonMerchants) {
        if (text.includes(m.toLowerCase())) {
          merchant = m;
          break;
        }
      }
    }
  }

  // Clean up any trailing/leading symbols or phrases from merchant
  merchant = merchant.trim()
    .replace(/[,\.\-]$/, '')
    .trim();

  if (merchant.length > 50) {
    merchant = merchant.substring(0, 50) + '...';
  }

  // 5. Date Extraction
  const dateVal = parseSMSDate(cleanMessage);

  return {
    amount,
    title: merchant,
    type,
    notes: `Auto-logged via background SMS notification parser. Raw Text: "${cleanMessage.trim()}"`,
    ...(dateVal ? { date: dateVal } : {})
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
