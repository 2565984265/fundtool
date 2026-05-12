import { FundData, Backup, AccountsMeta, Account, AllAccountsExport } from '../types';

const ACCOUNTS_META_KEY = 'fundtool_accounts_meta';
const ACCOUNT_DATA_KEY_PREFIX = 'fundtool_account_';
const LEGACY_DATA_KEY = 'fundtool_data';
const BACKUP_KEY = 'fundtool_backups';

// ─── Accounts Meta ───

export function loadAccountsMeta(): AccountsMeta {
  try {
    const raw = localStorage.getItem(ACCOUNTS_META_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.accounts) && typeof parsed.currentAccountId === 'string') {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return { accounts: [], currentAccountId: '' };
}

export function saveAccountsMeta(meta: AccountsMeta): void {
  localStorage.setItem(ACCOUNTS_META_KEY, JSON.stringify(meta));
}

// ─── Legacy Migration ───

export function migrateLegacyData(): AccountsMeta {
  try {
    const raw = localStorage.getItem(LEGACY_DATA_KEY);
    if (raw) {
      const data = JSON.parse(raw) as FundData;
      if (Array.isArray(data.funds)) {
        const defaultAccount: Account = {
          id: 'default',
          name: '默认账户',
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem(`${ACCOUNT_DATA_KEY_PREFIX}default`, raw);
        const meta: AccountsMeta = {
          accounts: [defaultAccount],
          currentAccountId: defaultAccount.id,
        };
        saveAccountsMeta(meta);
        return meta;
      }
    }
  } catch {
    // ignore
  }
  // No legacy data — create a fresh default account
  const defaultAccount: Account = {
    id: 'default',
    name: '默认账户',
    createdAt: new Date().toISOString(),
  };
  const meta: AccountsMeta = {
    accounts: [defaultAccount],
    currentAccountId: defaultAccount.id,
  };
  saveAccountData(defaultAccount.id, { funds: [] });
  saveAccountsMeta(meta);
  return meta;
}

// ─── Account Data ───

function accountDataKey(accountId: string): string {
  return `${ACCOUNT_DATA_KEY_PREFIX}${accountId}`;
}

export function loadAccountData(accountId: string): FundData {
  if (!accountId) return { funds: [] };
  try {
    const raw = localStorage.getItem(accountDataKey(accountId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.funds)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return { funds: [] };
}

export function saveAccountData(accountId: string, data: FundData): void {
  if (!accountId) return;
  localStorage.setItem(accountDataKey(accountId), JSON.stringify(data));
}

export function deleteAccountData(accountId: string): void {
  localStorage.removeItem(accountDataKey(accountId));
}

export function loadAllAccountsData(accounts: Account[]): Record<string, FundData> {
  const result: Record<string, FundData> = {};
  for (const acc of accounts) {
    result[acc.id] = loadAccountData(acc.id);
  }
  return result;
}

// ─── Legacy wrappers (deprecated, kept for compatibility) ───

export function loadData(): FundData {
  const meta = loadAccountsMeta();
  if (meta.currentAccountId) {
    return loadAccountData(meta.currentAccountId);
  }
  // fallback
  try {
    const raw = localStorage.getItem(LEGACY_DATA_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { funds: [] };
}

export function saveData(data: FundData): void {
  const meta = loadAccountsMeta();
  if (meta.currentAccountId) {
    saveAccountData(meta.currentAccountId, data);
  } else {
    localStorage.setItem(LEGACY_DATA_KEY, JSON.stringify(data));
  }
}

// ─── Backups ───

export function loadBackups(): Backup[] {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveBackups(backups: Backup[]): void {
  localStorage.setItem(BACKUP_KEY, JSON.stringify(backups));
}

// ─── Export / Import ───

export function exportData(): string {
  const meta = loadAccountsMeta();
  const allData: AllAccountsExport = {
    version: 2,
    accountsMeta: meta,
    accountsData: loadAllAccountsData(meta.accounts),
  };
  return JSON.stringify(allData, null, 2);
}

export function importData(json: string): boolean {
  try {
    const parsed = JSON.parse(json);
    // v2 multi-account format
    if (parsed.version === 2 && parsed.accountsMeta && parsed.accountsData) {
      const meta: AccountsMeta = parsed.accountsMeta;
      const dataMap: Record<string, FundData> = parsed.accountsData;
      saveAccountsMeta(meta);
      for (const acc of meta.accounts) {
        if (dataMap[acc.id]) {
          saveAccountData(acc.id, dataMap[acc.id]);
        }
      }
      return true;
    }
    // v1 legacy format (FundData only) — import into current account
    if (Array.isArray(parsed.funds)) {
      const meta = loadAccountsMeta();
      if (meta.accounts.length > 0 && meta.currentAccountId) {
        saveAccountData(meta.currentAccountId, parsed as FundData);
      } else {
        const newMeta = migrateLegacyData();
        saveAccountData(newMeta.currentAccountId, parsed as FundData);
      }
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}
