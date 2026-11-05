// The board's drag library clears the page selection around picking up a
// piece. A touch leaves the editor focused, so the editor reads that as the
// caret jumping to the start of the text. Held for as long as the board
// records into the text.
export function holdSelection(): () => void {
  const selection = document.getSelection();
  if (!selection) return () => {};
  selection.removeAllRanges = () => {};
  return () => {
    delete (selection as Partial<Selection>).removeAllRanges;
  };
}
