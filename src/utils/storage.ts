import { FundData, Backup } from '../types';

const STORAGE_KEY = 'fundtool_data';
const BACKUP_KEY = 'fundtool_backups';

export function loadData(): FundData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return { funds: [] };
}

export function saveData(data: FundData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

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

export function exportData(): string {
  return JSON.stringify(loadData(), null, 2);
}

export function importData(json: string): boolean {
  try {
    const data = JSON.parse(json) as FundData;
    if (Array.isArray(data.funds)) {
      saveData(data);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}
