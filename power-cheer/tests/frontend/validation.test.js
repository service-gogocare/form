const path = require('path');
const { validateName, validateEmail, formatNumber, getDiscountTierInfo, calcProgressPercent } = require(
  path.join('..', '..', 'app.js')
);

describe('前端表單驗證 (與後端 spec.md 第 6 節規則一致)', () => {
  describe('validateName', () => {
    test('空白姓名無效', () => {
      expect(validateName('').valid).toBe(false);
      expect(validateName('   ').valid).toBe(false);
    });

    test('超過 50 字無效', () => {
      const result = validateName('王'.repeat(51));
      expect(result.valid).toBe(false);
      expect(result.message).toMatch(/50/);
    });

    test('剛好 50 字有效', () => {
      expect(validateName('王'.repeat(50)).valid).toBe(true);
    });

    test('正常姓名有效', () => {
      expect(validateName('王小明').valid).toBe(true);
    });
  });

  describe('validateEmail', () => {
    test('空白 Email 無效', () => {
      expect(validateEmail('').valid).toBe(false);
    });

    test('格式錯誤的 Email 無效', () => {
      expect(validateEmail('not-an-email').valid).toBe(false);
      expect(validateEmail('abc@').valid).toBe(false);
      expect(validateEmail('abc@domain').valid).toBe(false);
    });

    test('超過 100 字無效', () => {
      const longEmail = 'a'.repeat(95) + '@a.com';
      const result = validateEmail(longEmail);
      expect(result.valid).toBe(false);
      expect(result.message).toMatch(/100/);
    });

    test('正常 Email 有效', () => {
      expect(validateEmail('abc@gmail.com').valid).toBe(true);
    });
  });

  describe('formatNumber', () => {
    test('加上千分位', () => {
      expect(formatNumber(12587)).toBe('12,587');
    });
  });
});

describe('折扣門檻 (docs/souce.md 熱門課程降價集氣)，需與 backend/Config.gs 保持一致', () => {
  describe('getDiscountTierInfo', () => {
    test.each([
      [0, null, { threshold: 100, label: '9折' }],
      [99, null, { threshold: 100, label: '9折' }],
      [100, { threshold: 100, label: '9折' }, { threshold: 200, label: '8折' }],
      [500, { threshold: 500, label: '5折' }, null],
      [999, { threshold: 500, label: '5折' }, null],
    ])('total=%i', (total, current, next) => {
      expect(getDiscountTierInfo(total)).toEqual({ current, next });
    });
  });

  describe('calcProgressPercent', () => {
    test('尚未解鎖第一階時，以 0-100 為基準', () => {
      expect(calcProgressPercent(0)).toBe(0);
      expect(calcProgressPercent(50)).toBe(50);
      expect(calcProgressPercent(99)).toBe(99);
    });

    test('已解鎖某一階後，以該階到下一階的區間計算百分比', () => {
      expect(calcProgressPercent(100)).toBe(0); // 剛解鎖 9 折，往 8 折前進 0%
      expect(calcProgressPercent(150)).toBe(50); // 100~200 之間的中點
    });

    test('達到最高折扣時回傳 100', () => {
      expect(calcProgressPercent(500)).toBe(100);
      expect(calcProgressPercent(9999)).toBe(100);
    });
  });
});
