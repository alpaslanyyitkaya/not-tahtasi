// Not listesinin saf mantığı: sıralama, arama, yedek hatırlatması, varsayılan ad.
import { shortDate } from '../time.js';

const BACKUP_REMINDER_MS = 14 * 86400000;
const fold = (s) => s.toLocaleLowerCase('tr');

export function sortNotes(notes) {
  return [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function filterNotes(notes, query) {
  const q = fold(query.trim());
  if (!q) return notes;
  return notes.filter((n) => fold(n.name).includes(q));
}

export function needsBackupReminder(lastBackupAt, noteCount, now) {
  if (noteCount === 0) return false;
  if (lastBackupAt == null) return true;
  return now - lastBackupAt > BACKUP_REMINDER_MS;
}

export function defaultNoteName(now) {
  return `Adsız not ${shortDate(now)}`;
}
