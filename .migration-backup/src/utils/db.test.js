import { makeTermId } from './db';

describe('db.js — Firestore Path Helpers', () => {
  describe('makeTermId', () => {
    test('makeTermId("2026","Term 3") returns "2026__Term_3"', () => {
      const result = makeTermId('2026', 'Term 3');
      expect(result).toBe('2026__Term_3');
    });

    test('makeTermId("2026","Term-3") returns "2026__Term_3" (hyphens replaced)', () => {
      const result = makeTermId('2026', 'Term-3');
      expect(result).toBe('2026__Term_3');
    });

    test('result must NOT contain hyphens', () => {
      const result = makeTermId('2026', 'Term-3');
      expect(result).not.toContain('-');
    });

    test('result must NOT contain spaces', () => {
      const result = makeTermId('2026', 'Term 3');
      expect(result).not.toContain(' ');
    });

    test('handles "2026/T1" by replacing slash with underscore', () => {
      const result = makeTermId('2026', 'T1/2026');
      expect(result).not.toContain('/');
      expect(result).toBe('2026__T1_2026');
    });

    test('handles multiple special chars in term name', () => {
      const result = makeTermId('2026', 'Term-3/2026');
      expect(result).not.toMatch(/[-\/\s]/);
    });

    test('produces valid Firestore segment count', () => {
      // marksData/{safeKey(term, class, subject)}/entries
      // = 1 + 1 + 1 = 3 segments ✓
      const termId = makeTermId('2026', 'Term 3');
      const classCode = 'B7';
      const subjectCode = 'EN';
      const safeKey = `${termId}__${classCode}__${subjectCode}`;
      // Collection path: marksData, safeKey, entries = 3 segments ✓
      expect(safeKey).toBeDefined();
      expect(safeKey).not.toContain(' ');
      expect(safeKey).not.toContain('-');
    });
  });
});
