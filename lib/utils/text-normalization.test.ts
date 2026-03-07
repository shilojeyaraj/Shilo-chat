import { normalizeText, normalizeForClipboard, normalizeOnPaste } from './text-normalization';

describe('normalizeText', () => {
  it('returns empty string unchanged', () => {
    expect(normalizeText('')).toBe('');
  });

  it('replaces em dash with hyphen', () => {
    expect(normalizeText('Hello—world')).toBe('Hello-world');
  });

  it('replaces en dash with hyphen', () => {
    expect(normalizeText('2020–2021')).toBe('2020-2021');
  });

  it('replaces curly quotes with straight quotes', () => {
    expect(normalizeText('"hello"')).toBe('"hello"');
    expect(normalizeText('\u201Chello\u201D')).toBe('"hello"');
    expect(normalizeText('\u2018hello\u2019')).toBe("'hello'");
  });

  it('replaces ellipsis with three periods', () => {
    expect(normalizeText('Wait\u2026')).toBe('Wait...');
  });

  it('removes zero-width spaces', () => {
    expect(normalizeText('hello\u200Bworld')).toBe('helloworld');
  });

  it('normalizes multiple special characters in one string', () => {
    const input = 'Price: 10—20\u2026 "optional"';
    const output = normalizeText(input);
    expect(output).toContain('-');
    expect(output).toContain('...');
    expect(output).not.toContain('\u2014');
    expect(output).not.toContain('\u2026');
  });
});

describe('normalizeForClipboard', () => {
  it('delegates to normalizeText', () => {
    expect(normalizeForClipboard('Test—value')).toBe('Test-value');
  });
});

describe('normalizeOnPaste', () => {
  it('delegates to normalizeText', () => {
    expect(normalizeOnPaste('Test—value')).toBe('Test-value');
  });
});
