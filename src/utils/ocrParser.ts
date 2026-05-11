export interface ParsedFund {
  code: string;
  name: string;
  shares: number;
  avgCost: number;
  amount: number;
  confidence: number; // 0-1
}

const FUND_KEYWORDS = ['ETF', '混合', '债券', '指数', '股票', 'QDII', '联接', '增强', 'LOF', 'FOF', '货币', '理财'];
const NON_FUND_KEYWORDS = ['余额宝', '保险', '保单', '驾乘', '意外险', '商业险', '定期', '黄金'];

function isFundName(text: string): boolean {
  const hasFundKeyword = FUND_KEYWORDS.some((k) => text.toUpperCase().includes(k));
  const hasNonFundKeyword = NON_FUND_KEYWORDS.some((k) => text.includes(k));
  return hasFundKeyword && !hasNonFundKeyword && text.length >= 4;
}

function cleanNumber(text: string): number {
  // Remove commas, spaces, and other non-numeric chars except dot and minus
  const cleaned = text.replace(/,/g, '').replace(/\s+/g, '').replace(/[^\d.\-]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

function extractName(text: string): string {
  // Remove tags like "基金", "投资增值", "金选" etc.
  return text
    .replace(/基金/g, '')
    .replace(/投资增值/g, '')
    .replace(/金选/g, '')
    .replace(/指数基金/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse OCR text to extract fund holdings information.
 * Supports Alipay, Tiantian Fund, brokerage apps, etc.
 * Handles cases where fund code is not shown (like Alipay screenshots).
 */
export function parseOcrText(text: string): ParsedFund[] {
  const funds: ParsedFund[] = [];
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Strategy 1: Find 6-digit fund codes (traditional mode)
    const codeMatch = line.match(/\b(\d{6})\b/);
    if (codeMatch) {
      const code = codeMatch[1];
      if (funds.some((f) => f.code === code)) continue;

      let name = '';
      const nameMatch = line.match(/([\u4e00-\u9fa5]{2,}[A-Za-z\u4e00-\u9fa5\d()]*)/);
      if (nameMatch) {
        name = extractName(nameMatch[1].trim());
      } else if (i > 0) {
        const prevNameMatch = lines[i - 1].match(/([\u4e00-\u9fa5]{2,}[A-Za-z\u4e00-\u9fa5\d()]*)/);
        if (prevNameMatch) name = extractName(prevNameMatch[1].trim());
      }

      let shares = 0;
      let avgCost = 0;
      let amount = 0;
      const searchRange = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 6));

      for (const searchLine of searchRange) {
        if (!shares) {
          const sharesMatch = searchLine.match(/(?:持有)?份额[:：]?\s*([\d,]+(?:\.\d+)?)/) ||
                              searchLine.match(/([\d,]+(?:\.\d+)?)\s*(?:份|份数)/);
          if (sharesMatch) shares = cleanNumber(sharesMatch[1]);
        }

        if (!avgCost) {
          const costMatch = searchLine.match(/(?:持仓|平均|成本|单价|成本价)[:：]?\s*([\d,]+(?:\.\d+)?)/) ||
                            searchLine.match(/(?:成本|单价)\s*([\d,]+(?:\.\d+)?)/);
          if (costMatch) avgCost = cleanNumber(costMatch[1]);
        }

        if (!amount) {
          const amountMatch = searchLine.match(/(?:金额|市值|资产|持有金额)[:：]?\s*([\d,]+(?:\.\d+)?)/) ||
                              searchLine.match(/(?:持有|金额)\s*([\d,]+(?:\.\d+)?)/);
          if (amountMatch) amount = cleanNumber(amountMatch[1]);
        }
      }

      const confidence = (shares > 0 ? 0.3 : 0) + (avgCost > 0 ? 0.3 : 0) + (amount > 0 ? 0.2 : 0) + (name.length > 1 ? 0.2 : 0);
      funds.push({ code, name, shares, avgCost, amount, confidence });
      continue;
    }

    // Strategy 2: Find fund names without codes (Alipay mode)
    // Look for lines that look like fund names and have "基金" tag nearby
    if (isFundName(line)) {
      const name = extractName(line);
      if (funds.some((f) => f.name === name)) continue;

      // Check next few lines for numeric data
      let amount = 0;
      const searchRange = lines.slice(i + 1, Math.min(lines.length, i + 5));

      for (const searchLine of searchRange) {
        // Skip percentage lines
        if (searchLine.includes('%')) continue;
        // Look for amount-like numbers (e.g. 1880.50, 3,641.46)
        const numMatch = searchLine.match(/([\d,]+(?:\.\d{1,2})?)/);
        if (numMatch) {
          const val = cleanNumber(numMatch[1]);
          if (val > 100 && val < 10000000) {
            amount = val;
            break;
          }
        }
      }

      if (amount > 0) {
        funds.push({
          code: '',
          name,
          shares: 0,
          avgCost: 0,
          amount,
          confidence: 0.5,
        });
      }
    }
  }

  return funds;
}
