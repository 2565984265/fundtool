import { FundInfo } from '../types';

interface EastMoneyJsonp {
  fundcode: string;
  name: string;
  jzrq: string;
  dwjz: string;
  gsz: string;
  gszzl: string;
  gztime: string;
}

// Queue-based JSONP to handle multiple sequential requests safely
let jsonpQueue: Array<(data: EastMoneyJsonp) => void> = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).jsonpgz = (data: EastMoneyJsonp) => {
  const resolve = jsonpQueue.shift();
  if (resolve) resolve(data);
};

function fetchJsonpSingle(url: string, timeout = 8000): Promise<EastMoneyJsonp> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    // Add random query param to bypass cache
    script.src = url + (url.includes('?') ? '&' : '?') + '_rt=' + Date.now();
    script.async = true;

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('JSONP timeout'));
    }, timeout);

    function cleanup() {
      clearTimeout(timer);
      if (script.parentNode) script.parentNode.removeChild(script);
      // Remove this request from queue if still pending
      const idx = jsonpQueue.indexOf(resolve as (data: EastMoneyJsonp) => void);
      if (idx >= 0) jsonpQueue.splice(idx, 1);
    }

    jsonpQueue.push((data: EastMoneyJsonp) => {
      clearTimeout(timer);
      if (script.parentNode) script.parentNode.removeChild(script);
      resolve(data);
    });

    script.onerror = () => {
      cleanup();
      reject(new Error('JSONP load error'));
    };

    document.head.appendChild(script);
  });
}

export async function fetchFundInfo(code: string): Promise<FundInfo | null> {
  try {
    const url = `https://fundgz.1234567.com.cn/js/${code}.js`;
    const data = await fetchJsonpSingle(url, 8000);

    const netValue = parseFloat(data.dwjz || '0');
    const estimateValue = parseFloat(data.gsz || '0');
    const estimateChange = parseFloat(data.gszzl || '0');
    // preNetValue is previous trading day's net value
    const preNetValue = estimateChange !== 0 && estimateValue > 0
      ? estimateValue / (1 + estimateChange / 100)
      : netValue;

    return {
      code: data.fundcode,
      name: data.name,
      netValue,
      preNetValue,
      netValueDate: data.jzrq || '',
      estimateValue,
      estimateTime: data.gztime || '',
      estimateChange,
    };
  } catch {
    return null;
  }
}

export async function fetchFundHistory(code: string): Promise<{ date: string; value: number }[]> {
  try {
    const PROXY_URL = 'https://api.allorigins.win/get?url=';
    const url = `https://fundf10.eastmoney.com/F10DataApi.aspx?type=lsjz&code=${code}&page=1&per=30`;
    const proxy = `${PROXY_URL}${encodeURIComponent(url)}`;
    const res = await fetch(proxy);
    const data = await res.json();
    const text: string = data.contents || '';
    const match = text.match(/content:"(.*)"}/);
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
