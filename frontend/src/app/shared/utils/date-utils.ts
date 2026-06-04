function parseIsoOrLocalString(value: string): Date | null {
  const trimmed = value.trim();

  // Accept ISO strings with timezone offsets, including Z
  // IMPORTANT: Datele din backend (SQL DATETIME2) sunt returnate ca ISO cu Z,
  // dar Z nu înseamnă UTC - e LOCAL timezone, și mssql driver-ul presupune că LOCAL = UTC intern
  if (/[+-]\d{2}:?\d{2}$|Z$/.test(trimmed)) {
    // Dacă e ISO cu Z, parsez ca string direct (care e LOCAL)
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      const hours = Number(match[4]);
      const minutes = Number(match[5]);
      const seconds = Number(match[6] || '0');
      // Creez Date presupunând că e LOCAL (nu UTC), chiar dacă are Z
      return new Date(year, month, day, hours, minutes, seconds, 0);
    }
  }

  // ISO string fără timezone (ex: 2026-06-04T17:50:00) - tratăm ca LOCAL
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const hours = Number(match[4]);
    const minutes = Number(match[5]);
    const seconds = Number(match[6] || '0');
    // Creez o dată LOCAL (nu UTC)
    return new Date(year, month, day, hours, minutes, seconds, 0);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatRomanianDateTime(value?: string | Date | null): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : parseIsoOrLocalString(value);
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('ro-RO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatRomanianDate(value?: string | Date | null): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : parseIsoOrLocalString(value);
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('ro-RO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function parseLocalDateTime(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return parseIsoOrLocalString(value);
}

export function formatAsSSMS(value?: string | Date | null): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : parseIsoOrLocalString(value);
  if (!date || Number.isNaN(date.getTime())) return '-';
  
  // Formează data ca "YYYY-MM-DD HH:MM:SS" LOCAL timezone (cum e în SSMS)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function formatAsSSMSDateOnly(value?: string | Date | null): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : parseIsoOrLocalString(value);
  if (!date || Number.isNaN(date.getTime())) return '-';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

export function formatAsSSMSTimeOnly(value?: string | Date | null): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : parseIsoOrLocalString(value);
  if (!date || Number.isNaN(date.getTime())) return '-';
  
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

export function toDateTimeLocalString(value?: string | Date | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : parseIsoOrLocalString(value);
  if (!date || Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}