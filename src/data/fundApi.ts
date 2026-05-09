import { FundInfo } from '../types';

const PROXY_URL = 'https://api.allorigins.win/get?url=';

function eastMoneyUrl(code: string): string {
  return `https://fundgz.1234567.com.cn/js/${code}.js`;
}

export async function fetchFundInfo(code: string): Promise<FundInfo | null> {
  try {
    const url = eastMoneyUrl(code);
    const proxy = `${PROXY_URL}${encodeURIComponent(url)}`;
    const res = await fetch(proxy);
    const data = await res.json();
    const text: string = data.contents || '';
    const match = text.match(/jsonpgz\((.*)\);?/);
    if (!match) return null;

    const json = JSON.parse(match[1]);
    const netValue = parseFloat(json.dwjz || '0');
    const estimateValue = parseFloat(json.gsz || '0');
    const estimateChange = parseFloat(json.gszzl || '0');
    // preNetValue is previous trading day's net value
    const preNetValue = estimateChange !== 0 && estimateValue > 0
      ? estimateValue / (1 + estimateChange / 100)
      : netValue;
    return {
      code: json.fundcode,
      name: json.name,
      netValue,
      preNetValue,
      netValueDate: json.jzrq || '',
      estimateValue,
      estimateTime: json.gztime || '',
      estimateChange,
    };
  } catch {
    return null;
  }
}

export async function fetchFundHistory(code: string): Promise<{ date: string; value: number }[]> {
  try {
    const url = `https://fundf10.eastmoney.com/F10DataApi.aspx?type=lsjz&code=${code}&page=1&per=30`;
    const proxy = `${PROXY_URL}${encodeURIComponent(url)}`;
    const res = await fetch(proxy);
    const data = await res.json();
    const text: string = data.contents || '';
    const match = text.match(/content:\"(.*)\"}/);
    if (!match) return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(match[1], 'text/html');
    const rows = doc.querySelectorAll('tr');
    const result: { date: string; value: number }[] = [];

    rows.forEach((row) => {
      const tds = row.querySelectorAll('td');
      if (tds.length >= 2) {
        result.push({
          date: tds[0].textContent || '',
          value: parseFloat(tds[1].textContent || '0'),
        });
      }
    });

    return result.reverse();
  } catch {
    return [];
  }
}
