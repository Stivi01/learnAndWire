function formatSqlDateTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * NORMALIZARE DATETIME - PARSER TIMEZONE-AGNOSTIC
 * 
 * Rezolvă problema diferenței de 3 ore (UTC+3 vs UTC)
 * 
 * STRATEGIA: Parsez stringul ISO fără timezone (ex: "2026-06-04T17:30")
 * și creez o dată care va fi EXACT "2026-06-04 17:30:00" în SQL,
 * indiferent de timezone-ul serverului.
 * 
 * IMPORTANTE: SQL Server DATETIME2 nu are timezone info - e mereu LOCAL.
 * Driverul mssql convertește JavaScript Date la DATETIME2 presupunând UTC intern.
 * De aceea, trebuie să extragi componenții și să creezi string direct.
 */
function parseLocalDateTime(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();

  // Regex pentru ISO format fără timezone: YYYY-MM-DDTHH:MM:SS
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    const year = match[1];
    const month = match[2];
    const day = match[3];
    const hours = match[4];
    const minutes = match[5];
    const seconds = match[6] || '00';
    
    // ✅ NORMALIZARE DATETIME - FIX DIFERENȚĂ TIMEZONE
    // Frontend trimite: "2026-06-04T17:30" (LOCAL time în browser)
    // Calculez exact acea dată ca UTC: new Date('2026-06-04T17:30:00Z')
    // SQL Server DATETIME2 va stoca exact: 2026-06-04 17:30:00
    // indiferent de timezone-ul serverului!
    return new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`);
  }

  // Fallback: Încearcă să parseze ca ISO string cu timezone
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Convertează data din frontend la format SQL-ready STRING
 * IMPORTANT: Trimite stringul direct la SQL ca variabilă, nu Date object!
 * Aceasta evită ORICE ambiguitate de timezone.
 * 
 * Frontend trimite: "2026-06-04T17:30"
 * Returnez: "2026-06-04 17:30:00"  <- SQL va interpreta EXACT ca asta
 */
function convertToSqlDateTime(isoString) {
  if (!isoString || typeof isoString !== 'string') return null;
  const match = isoString.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const [, year, month, day, hours, minutes, seconds = '00'] = match;
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

module.exports = { parseLocalDateTime, formatSqlDateTime, convertToSqlDateTime };