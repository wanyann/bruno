import { trimTrailingNewlines } from './trimTrailingNewlines';

describe('trimTrailingNewlines', () => {
  it('removes a single trailing LF', () => {
    expect(trimTrailingNewlines('https://api.test\n')).toBe('https://api.test');
  });

  it('removes a single trailing CRLF', () => {
    expect(trimTrailingNewlines('https://api.test\r\n')).toBe('https://api.test');
  });

  it('removes multiple trailing newlines', () => {
    expect(trimTrailingNewlines('a\n\n\n')).toBe('a');
    expect(trimTrailingNewlines('a\r\n\r\n')).toBe('a');
  });

  it('keeps interior newlines', () => {
    expect(trimTrailingNewlines('a\nb\n')).toBe('a\nb');
    expect(trimTrailingNewlines('a\nb')).toBe('a\nb');
  });

  it('handles a string that is only newlines', () => {
    expect(trimTrailingNewlines('\n')).toBe('');
    expect(trimTrailingNewlines('\r\n\r\n')).toBe('');
  });

  it('leaves strings without trailing newlines unchanged', () => {
    expect(trimTrailingNewlines('plain')).toBe('plain');
    expect(trimTrailingNewlines('')).toBe('');
  });

  it('returns non-string values unchanged', () => {
    expect(trimTrailingNewlines(null)).toBe(null);
    expect(trimTrailingNewlines(undefined)).toBe(undefined);
    expect(trimTrailingNewlines(42)).toBe(42);
  });
});
