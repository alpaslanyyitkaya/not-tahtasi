// "Paylaş" düğmesi: not ekranında araç çubuğuna, listede satır menüsüne eklenir.
import { boardHooks } from './board-screen.js';
import { shareItems, shareNoteById } from './export.js';
import { addRowMenuItem } from '../list/list-screen.js';
import { el, toast } from '../ui.js';

boardHooks.toolbarExtras.push((S) => {
  const btn = el('button', { title: 'PNG olarak paylaş (ör. Discord)' }, 'Paylaş');
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try { await shareItems(S.note.name, S.items, S.bitmaps); }
    catch (e) { toast('Paylaşılamadı: ' + e.message, 6000); }
    finally { btn.disabled = false; }
  });
  return btn;
});

addRowMenuItem({
  label: 'Paylaş',
  onClick: async (note) => {
    try { await shareNoteById(note); } catch (e) { toast('Paylaşılamadı: ' + e.message, 6000); }
  },
});
