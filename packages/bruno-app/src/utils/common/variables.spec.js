import { startsWithVariableReference } from './variables';

describe('startsWithVariableReference', () => {
  it('returns true when the value starts with a variable reference', () => {
    expect(startsWithVariableReference('{{token}}')).toBe(true);
    expect(startsWithVariableReference('{{token}}suffix')).toBe(true);
  });

  it('returns true when the value starts with a single opening brace', () => {
    expect(startsWithVariableReference('{')).toBe(true);
    expect(startsWithVariableReference('{token}')).toBe(true);
  });

  it('ignores leading whitespace', () => {
    expect(startsWithVariableReference('   {{token}}')).toBe(true);
    expect(startsWithVariableReference('\t{{token}}')).toBe(true);
  });

  it('returns false for literal values', () => {
    expect(startsWithVariableReference('secret123')).toBe(false);
    expect(startsWithVariableReference('Bearer {{token}}')).toBe(false);
    expect(startsWithVariableReference('')).toBe(false);
    expect(startsWithVariableReference(undefined)).toBe(false);
    expect(startsWithVariableReference(null)).toBe(false);
    expect(startsWithVariableReference(42)).toBe(false);
  });
});
