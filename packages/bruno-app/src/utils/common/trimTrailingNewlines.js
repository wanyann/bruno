// Removes all trailing line breaks (\n, \r\n) from a string.
// Interior newlines are preserved so intentional multi-line values are kept.
// Non-string inputs are returned unchanged.
export const trimTrailingNewlines = (value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.replace(/[\r\n]+$/, '');
};
