import {
  calcSBATotal,
  calcWeightedTotal,
  calcGrade,
  ordinal,
} from './constants';

describe('constants.js — Calculation Functions', () => {
  describe('calcSBATotal', () => {
    test('returns sum of all task marks when all present', () => {
      expect(calcSBATotal({ t1: 30, t2: 20, t3: 30, t4: 20 })).toBe(100);
    });

    test('returns empty string when all marks are empty', () => {
      expect(calcSBATotal({ t1: '', t2: '', t3: '', t4: '' })).toBe('');
    });

    test('calculates partial sums when some marks exist', () => {
      expect(calcSBATotal({ t1: 15, t2: 10, t3: '', t4: '' })).toBe(25);
    });

    test('treats undefined as 0', () => {
      expect(calcSBATotal({ t1: 20, t2: undefined, t3: 25, t4: undefined })).toBe(45);
    });
  });

  describe('calcWeightedTotal', () => {
    test('calcWeightedTotal({ t1:30,t2:20,t3:30,t4:20, ex:80 }) === 90', () => {
      const result = calcWeightedTotal({ t1: 30, t2: 20, t3: 30, t4: 20, ex: 80 });
      expect(result).toBe(90);
    });

    test('calcWeightedTotal({ t1:20,t2:15,t3:20,t4:15, ex:60 }) === 65', () => {
      const result = calcWeightedTotal({ t1: 20, t2: 15, t3: 20, t4: 15, ex: 60 });
      expect(result).toBe(65);
    });

    test('returns empty string when sba is empty', () => {
      expect(calcWeightedTotal({ t1: '', t2: '', t3: '', t4: '', ex: 50 })).toBe('');
    });

    test('returns empty string when exam is empty', () => {
      expect(calcWeightedTotal({ t1: 30, t2: 20, t3: 30, t4: 20, ex: '' })).toBe('');
    });
  });

  describe('calcGrade', () => {
    test('calcGrade(85).grade === "1"', () => {
      const result = calcGrade(85);
      expect(result.grade).toBe('1');
    });

    test('calcGrade(45).grade === "5"', () => {
      const result = calcGrade(45);
      expect(result.grade).toBe('5');
    });

    test('calcGrade(25).grade === "7"', () => {
      const result = calcGrade(25);
      expect(result.grade).toBe('7');
    });

    test('calcGrade("") returns null', () => {
      expect(calcGrade('')).toBe(null);
    });

    test('returns null for invalid total', () => {
      expect(calcGrade(-5)).toBe(null);
    });
  });

  describe('ordinal', () => {
    test('ordinal(1) === "1st"', () => {
      expect(ordinal(1)).toBe('1st');
    });

    test('ordinal(2) === "2nd"', () => {
      expect(ordinal(2)).toBe('2nd');
    });

    test('ordinal(3) === "3rd"', () => {
      expect(ordinal(3)).toBe('3rd');
    });

    test('ordinal(11) === "11th"', () => {
      expect(ordinal(11)).toBe('11th');
    });

    test('ordinal(21) === "21st"', () => {
      expect(ordinal(21)).toBe('21st');
    });

    test('ordinal(0) returns empty string', () => {
      expect(ordinal(0)).toBe('');
    });
  });
});
