export interface ParsedFund {
  code: string;
  name: string;
  shares: number;
  avgCost: number;
  confidence: number; // 0-1
}

/**
 * Parse OCR text to extract fund holdings information.
 * Supports common formats from Alipay, Tiantian Fund, brokerage apps, etc.
 */
export function parseOcrText(text: string): ParsedFund[] {
  const funds: ParsedFund[] = [];
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);

  // Strategy: find 6-digit fund codes, then look around for related data
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const codeMatch = line.match(/\b(\d{6})\b/);
    if (!codeMatch) continue;

    const code = codeMatch[1];
    // Skip if already parsed
    if (funds.some((f) => f.code === code)) continue;

    // Look for name (usually on same line or previous line)
    let name = '';
    const nameMatch = line.match(/([\u4e00-\u9fa5]{2,}[A-Za-z\u4e00-\u9fa5\d]*)/);
    if (nameMatch) {
      name = nameMatch[1].trim();
    } else if (i > 0) {
      const prevNameMatch = lines[i - 1].match(/([\u4e00-\u9fa5]{2,}[A-Za-z\u4e00-\u9fa5\d]*)/);
      if (prevNameMatch) name = prevNameMatch[1].trim();
    }

    // Search in surrounding lines for shares and cost
    let shares = 0;
    let avgCost = 0;
    const searchRange = lines.slice(Math.max(0, i - 3), Math.min(lines.length, i + 6));

    for (const searchLine of searchRange) {
      // Shares: patterns like "持有份额 1000.00", "份额 500", "1000.00份"
      if (!shares) {
        const sharesMatch = searchLine.match(/(?:持有)?份额[:：]?\s*(\d+(?:\.\d+)?)/) ||
                            searchLine.match(/(\d+(?:\.\d+)?)\s*(?:份|份数)/);
        if (sharesMatch) shares = parseFloat(sharesMatch[1]);
      }

      // Cost: patterns like "持仓成本 1.2345", "成本单价 1.23", "平均成本 1.0000"
      if (!avgCost) {
        const costMatch = searchLine.match(/(?:持仓|平均|成本|单价|成本价)[:：]?\s*(\d+(?:\.\d+)?)/) ||
                          searchLine.match(/(?:成本|单价)\s*(\d+(?:\.\d{1,4})?)/);
        if (costMatch) avgCost = parseFloat(costMatch[1]);
      }

      // If no explicit cost, try to infer from amount / shares
      if (!avgCost && shares > 0) {
        const amountMatch = searchLine.match(/(?:金额|市值|资产|成本金额)[:：]?\s*(\d+(?:\.\d+)?)/);
        if (amountMatch) {
          avgCost = parseFloat((parseFloat(amountMatch[1]) / shares).toFixed(4));
        }
      }
    }

    // Heuristic: if we have code and reasonable shares, consider it valid
    const confidence = (shares > 0 ? 0.4 : 0) + (avgCost > 0 ? 0.3 : 0) + (name.length > 1 ? 0.3 : 0);

    funds.push({
      code,
      name,
      shares: shares || 0,
      avgCost: avgCost || 0,
      confidence,
    });
  }

  return funds;
}
