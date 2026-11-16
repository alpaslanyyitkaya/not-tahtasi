// Geri al / ileri al: öğe dizisinin anlık görüntüleri. Öğeler değişmez nesnelerdir.
export function createHistory(limit = 100) {
  let undoStack = [];
  let redoStack = [];
  return {
    push(itemsBefore) {
      undoStack.push(itemsBefore);
      if (undoStack.length > limit) undoStack.shift();
      redoStack = [];
    },
    undo(current) {
      if (!undoStack.length) return null;
      redoStack.push(current);
      return undoStack.pop();
    },
    redo(current) {
      if (!redoStack.length) return null;
      undoStack.push(current);
      return redoStack.pop();
    },
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
  };
}
