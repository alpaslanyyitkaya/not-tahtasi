// Türkçe kısa tarih biçimi: "az önce", "bugün, 09:30", "dün, 14:20", "12 Kas", "2 Mar 2025".
export const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const pad = (n) => String(n).padStart(2, '0');
const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function formatWhen(ts, now) {
  if (now - ts >= 0 && now - ts < 3600e3) return 'az önce';
  const d = new Date(ts), n = new Date(now);
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const today = dayStart(n);
  const yesterday = dayStart(new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1));
  const day = dayStart(d);
  if (day === today) return `bugün, ${hm}`;
  if (day === yesterday) return `dün, ${hm}`;
  const dm = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === n.getFullYear() ? dm : `${dm} ${d.getFullYear()}`;
}

export function shortDate(ts) {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
