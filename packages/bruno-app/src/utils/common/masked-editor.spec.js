/**
 * @jest-environment jsdom
 */
import { MaskedEditor } from './masked-editor';

const createMockEditor = (initialValue = '') => {
  let value = initialValue;
  return {
    _marks: [],
    getValue: jest.fn(() => value),
    setValue: jest.fn((v) => {
      value = v;
    }),
    lineCount: jest.fn(() => (value ? value.split('\n').length : 1)),
    getLine: jest.fn((line) => value.split('\n')[line] ?? ''),
    markText: jest.fn((from, to, opts) => {
      const mark = { clear: jest.fn(), opts };
      return mark;
    }),
    getAllMarks: jest.fn(function () {
      return this._marks;
    }),
    operation: jest.fn((fn) => fn()),
    refresh: jest.fn(),
    setCursor: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  };
};

describe('MaskedEditor shouldMask predicate', () => {
  it('masks the value by default', () => {
    const editor = createMockEditor('secret123');
    const masked = new MaskedEditor(editor);
    masked.enable();

    expect(editor.markText).toHaveBeenCalled();
  });

  it('does not mask when the predicate returns false', () => {
    const editor = createMockEditor('{{token}}');
    const masked = new MaskedEditor(editor, '*', {
      shouldMask: (value) => !value.startsWith('{{')
    });
    masked.enable();

    expect(editor.markText).not.toHaveBeenCalled();
  });

  it('stops masking when the value becomes a variable reference', () => {
    const editor = createMockEditor('secret123');
    const masked = new MaskedEditor(editor, '*', {
      shouldMask: (value) => !value.startsWith('{{')
    });
    masked.enable();
    expect(editor.markText).toHaveBeenCalled();

    editor.markText.mockClear();
    editor.setValue('{{token}}');
    masked.update();

    expect(editor.markText).not.toHaveBeenCalled();
  });
});
