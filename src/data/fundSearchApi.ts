export interface FundListItem {
  code: string;
  pinyin: string;
  name: string;
  type: string;
  pinyinFull: string;
}

const FUND_LIST_URL = 'https://fund.eastmoney.com/js/fundcode_search.js';
const CACHE_KEY = 'fundtool_fundlist';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load script'));
    document.head.appendChild(script);
  });
}

function parseFundList(): FundListItem[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (window as any).r;
  if (!Array.isArray(raw)) return [];
  return raw.map((item: string[]) => ({
    code: item[0],
    pinyin: item[1],
    name: item[2],
    type: item[3],
    pinyinFull: item[4],
  }));
}

function getCachedList(): FundListItem[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.timestamp > CACHE_EXPIRY) return null;
    return data.list as FundListItem[];
  } catch {
    return null;
  }
}

function setCachedList(list: FundListItem[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), list }));
}

let loadingPromise: Promise<FundListItem[]> | null = null;

export async function getFundList(): Promise<FundListItem[]> {
  const cached = getCachedList();
  if (cached) return cached;

  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    // Clear previous window.r to avoid stale data
    (window as any).r = undefined;
    await loadScript(FUND_LIST_URL + '?_=' + Date.now());
    const list = parseFundList();
    if (list.length > 0) {
      setCachedList(list);
    }
    return list;
  })();

  return loadingPromise;
}

// ─── Robust name normalization ───

const NOISE_WORDS = new Set([
  'ETF', 'LOF', 'QDII', 'FOF', '联接', '指数', '增强', '量化',
  '混合', '债券', '股票', '货币', '理财', '养老', '分级',
  'A', 'B', 'C', 'E', 'I', 'H',
  '人民币', '美元', '港币', '欧元',
]);

/** Normalize fund name for matching */
function normalize(name: string): string {
  return name
    .replace(/\s+/g, '')                    // remove spaces
    .replace(/[（(].*?[）)]/g, '')          // remove brackets and contents
    .replace(/[-·•]/g, '')                  // remove special chars
    .toLowerCase();
}

/** Extract core keywords by removing noise words */
function extractKeywords(name: string): string[] {
  const normalized = normalize(name);
  // Split by common separators and filter out noise
  const words = normalized.split(/(?=[A-Z])|(?<=[a-z])(?=[\u4e00-\u9fff])|(?<=[\u4e00-\u9fff])(?=[A-Za-z])/);
  const result: string[] = [];
  for (const w of words) {
    const trimmed = w.trim();
    if (trimmed.length >= 2 && !NOISE_WORDS.has(trimmed.toUpperCase())) {
      result.push(trimmed);
    }
  }
  return result;
}

/** Longest Common Subsequence length */
function lcsLength(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0 || n === 0) return 0;
  // Use rolling array for memory efficiency
  let prev = new Array(n + 1).fill(0);
  let curr = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** LCS similarity: 0 ~ 1 */
function lcsSimilarity(a: string, b: string): number {
  const len = lcsLength(a, b);
  return len / Math.max(a.length, b.length);
}

/** Jaccard similarity of keyword sets: 0 ~ 1 */
function keywordSimilarity(a: string, b: string): number {
  const kwA = new Set(extractKeywords(a));
  const kwB = new Set(extractKeywords(b));
  if (kwA.size === 0 || kwB.size === 0) return 0;
  let intersection = 0;
  for (const w of kwA) {
    if (kwB.has(w)) intersection++;
  }
  const union = kwA.size + kwB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/** Compute match score between query and fund name */
function scoreMatch(query: string, fundName: string): number {
  const nq = normalize(query);
  const nf = normalize(fundName);

  if (nq === nf) return 100;

  // Contains: query inside fund name
  if (nf.includes(nq)) {
    // Higher score if query is a larger portion of fund name
    return 90 + (nq.length / nf.length) * 5;
  }

  // Reverse contains: fund name inside query (query is longer)
  if (nq.includes(nf)) {
    return 80 + (nf.length / nq.length) * 5;
  }

  // Keyword Jaccard similarity
  const kwSim = keywordSimilarity(query, fundName);
  if (kwSim >= 0.5) {
    return 50 + kwSim * 30;
  }

  // LCS similarity
  const lcsSim = lcsSimilarity(nq, nf);
  if (lcsSim >= 0.6) {
    return 30 + lcsSim * 20;
  }

  // Fuzzy character-order match (legacy, weakened)
  let idx = 0;
  for (const char of nq) {
    idx = nf.indexOf(char, idx);
    if (idx === -1) break;
    idx++;
  }
  if (idx !== -1) {
    return 10 + (nq.length / nf.length) * 10;
  }

  return 0;
}

export async function searchFundByName(name: string): Promise<FundListItem | null> {
  if (!name) return null;

  const list = await getFundList();
  if (list.length === 0) return null;

  let best: FundListItem | null = null;
  let bestScore = 0;

  for (const fund of list) {
    const score = scoreMatch(name, fund.name);
    if (score > bestScore) {
      bestScore = score;
      best = fund;
    }
  }

  // Require minimum confidence
  if (bestScore >= 30) {
    return best;
  }

  return null;
}

/** Search multiple candidates, useful for manual selection */
export async function searchFundCandidates(name: string, limit = 5): Promise<FundListItem[]> {
  if (!name) return [];

  const list = await getFundList();
  if (list.length === 0) return [];

  const scored = list
    .map((fund) => ({ fund, score: scoreMatch(name, fund.name) }))
    .filter((item) => item.score >= 20)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((item) => item.fund);
}
