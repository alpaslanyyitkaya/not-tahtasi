// Liste ekranı: isimli notlar, arama, yeni not, yeniden adlandır, sil, ayarlar.
import * as db from '../db.js';
import { newId } from '../ids.js';
import { formatWhen } from '../time.js';
import { sortNotes, filterNotes, needsBackupReminder, defaultNoteName } from './list-model.js';
import { showScreen } from '../router.js';
import { el, toast, confirmDialog, promptDialog, infoDialog, openMenu } from '../ui.js';
import { getPenOnly, setPenOnly } from '../settings.js';
import { readDeviceInfo, renderDeviceInfo } from '../device-info.js';

let state = null;

export const listScreen = {
  async mount(root) {
    state = { notes: [], query: '', urls: [], lastBackupAt: null };
    const search = el('input', { type: 'search', placeholder: 'Not adına göre ara', 'aria-label': 'Ara', id: 'note-search' });
    search.addEventListener('input', () => { state.query = search.value; renderList(); });
    const moreBtn = el('button', { class: 'ghost', 'aria-label': 'Menü', title: 'Menü' }, '⋮');
    moreBtn.addEventListener('click', () => openMenu(moreBtn, headMenuItems()));

    state.dom = {
      banner: el('div', { class: 'banner', hidden: '' }),
      list: el('ul', { class: 'notes' }),
      empty: el('div', { class: 'empty', hidden: '' }),
      search,
    };
    root.append(el('div', { class: 'list-screen' },
      el('div', { class: 'list-wrap' },
        el('div', { class: 'list-head' },
          el('h1', {}, 'Notlarım'),
          el('button', { class: 'primary', onclick: createNote }, '+ Yeni'),
          moreBtn),
        state.dom.banner,
        search,
        state.dom.list,
        state.dom.empty)));
    await reload();
  },
  unmount() {
    revokeUrls();
    state = null;
  },
};

// Diğer modüllerin (paylaş, yedek) menüye eklediği maddeler.
const extraHeadItems = [];
const extraRowItems = [];
export function addHeadMenuItem(item) { extraHeadItems.push(item); }
export function addRowMenuItem(item) { extraRowItems.push(item); }
export function refreshList() { return state ? reload() : Promise.resolve(); }

async function reload() {
  const [notes, lastBackupAt] = await Promise.all([db.listNotes(), db.getMeta('lastBackupAt')]);
  if (!state) return;
  state.notes = sortNotes(notes);
  state.lastBackupAt = lastBackupAt;
  renderBanner();
  renderList();
}

function revokeUrls() {
  for (const u of state?.urls ?? []) URL.revokeObjectURL(u);
  if (state) state.urls = [];
}

function renderBanner() {
  const b = state.dom.banner;
  const show = needsBackupReminder(state.lastBackupAt, state.notes.length, Date.now());
  b.hidden = !show;
  if (!show) return;
  const when = state.lastBackupAt ? `Son yedek: ${formatWhen(state.lastBackupAt, Date.now())}.` : 'Henüz yedek almadın.';
  const backupItem = extraHeadItems.find((i) => i.id === 'export');
  b.replaceChildren(el('span', {}, `${when} Notların yalnızca bu tablette duruyor.`),
    ...(backupItem ? [el('button', { onclick: backupItem.onClick }, 'Yedek al')] : []));
}

function renderList() {
  revokeUrls();
  const { list, empty } = state.dom;
  const shown = filterNotes(state.notes, state.query);
  list.replaceChildren();
  list.hidden = shown.length === 0;
  empty.hidden = shown.length > 0;
  if (!state.notes.length) {
    empty.replaceChildren(el('strong', {}, 'Henüz not yok'), '+ Yeni ile ilk notunu başlat.');
  } else if (!shown.length) {
    empty.replaceChildren(el('strong', {}, `“${state.query.trim()}” adında not yok`), 'Başka bir kelime dene.');
  }
  const now = Date.now();
  for (const note of shown) {
    let thumb;
    if (note.thumb) {
      const url = URL.createObjectURL(note.thumb);
      state.urls.push(url);
      thumb = el('img', { class: 'thumb', src: url, alt: '' });
    } else {
      thumb = el('div', { class: 'thumb' });
    }
    const more = el('button', { class: 'ghost', 'aria-label': `${note.name} menüsü` }, '⋮');
    more.addEventListener('click', () => openMenu(more, rowMenuItems(note)));
    list.append(el('li', { class: 'note-row' },
      el('button', { class: 'note-open', onclick: () => showScreen('board', note.id) },
        thumb,
        el('span', { class: 'note-text' },
          el('span', { class: 'note-name' }, note.name),
          el('span', { class: 'note-when' }, formatWhen(note.updatedAt, now)))),
      more));
  }
}

function headMenuItems() {
  const penOnly = getPenOnly();
  return [
    ...extraHeadItems,
    ...(extraHeadItems.length ? ['-'] : []),
    { label: `Sadece kalem çizsin: ${penOnly ? 'Açık' : 'Kapalı'}`, onClick: () => { setPenOnly(!penOnly); toast(`Sadece kalem çizsin: ${!penOnly ? 'Açık' : 'Kapalı'}`); } },
    { label: 'Cihaz bilgisi', onClick: async () => infoDialog('Cihaz bilgisi', renderDeviceInfo(await readDeviceInfo())) },
  ];
}

function rowMenuItems(note) {
  return [
    { label: 'Yeniden adlandır', onClick: () => renameNote(note) },
    ...extraRowItems.map((it) => ({ label: it.label, onClick: () => it.onClick(note) })),
    '-',
    { label: 'Sil', danger: true, onClick: () => deleteNote(note) },
  ];
}

async function createNote() {
  const now = Date.now();
  const name = await promptDialog({ title: 'Yeni not', placeholder: defaultNoteName(now), ok: 'Oluştur', allowEmpty: true });
  if (name === null) return;
  const note = { id: newId(), name: name || defaultNoteName(now), createdAt: now, updatedAt: now, thumb: null };
  try {
    await db.saveBoardAndNote({ noteId: note.id, items: [] }, note);
  } catch (e) {
    toast('Not oluşturulamadı: ' + e.message, 6000);
    return;
  }
  showScreen('board', note.id);
}

async function renameNote(note) {
  const name = await promptDialog({ title: 'Yeniden adlandır', value: note.name });
  if (!name || name === note.name) return;
  const fresh = await db.getNote(note.id);
  if (!fresh) return;
  await db.putNote({ ...fresh, name });
  await reload();
}

async function deleteNote(note) {
  const ok = await confirmDialog({ title: `“${note.name}” silinsin mi?`, text: 'Bu geri alınamaz.', ok: 'Sil', danger: true });
  if (!ok) return;
  await db.deleteNote(note.id);
  toast('Not silindi');
  await reload();
}
