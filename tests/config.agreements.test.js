// ============================================================
// Tests for config/agreements.js
// ============================================================

const crypto = require('crypto');
const { AGREEMENT_VERSIONS, getAgreementHash } = require('../config/agreements');

describe('AGREEMENT_VERSIONS', () => {
    it('exports a v1.0 agreement object', () => {
        expect(Object.keys(AGREEMENT_VERSIONS)).toContain('v1.0');
    });

    it('v1.0 has the expected shape', () => {
        const v1 = AGREEMENT_VERSIONS['v1.0'];
        expect(v1).toHaveProperty('version', 'v1.0');
        expect(v1).toHaveProperty('text');
        expect(typeof v1.text).toBe('string');
        expect(v1.text.length).toBeGreaterThan(0);
    });

    it('v1.0 text contains required legal sections', () => {
        const text = AGREEMENT_VERSIONS['v1.0'].text;
        expect(text).toContain('ADVANCE PAYMENT OBLIGATION');
        expect(text).toContain('FINAL PAYMENT OBLIGATION');
        expect(text).toContain('CONSEQUENCES OF NON-PAYMENT');
        expect(text).toContain('DISPUTE PROCESS');
        expect(text).toContain('REFUND POLICY');
        expect(text).toContain('CONSENT TO RECORD');
    });

    it('v1.0 text mentions the 30% advance payment requirement', () => {
        const text = AGREEMENT_VERSIONS['v1.0'].text;
        expect(text).toContain('30%');
    });

    it('v1.0 text mentions the 70% final payment requirement', () => {
        const text = AGREEMENT_VERSIONS['v1.0'].text;
        expect(text).toContain('70%');
    });

    it('v1.0 text mentions the 24-hour advance window', () => {
        const text = AGREEMENT_VERSIONS['v1.0'].text;
        expect(text).toContain('24 hours');
    });

    it('v1.0 text mentions the 48-hour final payment window', () => {
        const text = AGREEMENT_VERSIONS['v1.0'].text;
        expect(text).toContain('48 hours');
    });

    it('v1.0 text has been trimmed (no leading/trailing whitespace)', () => {
        const text = AGREEMENT_VERSIONS['v1.0'].text;
        expect(text).toBe(text.trim());
    });
});

describe('getAgreementHash', () => {
    it('returns a string for v1.0', () => {
        const hash = getAgreementHash('v1.0');
        expect(typeof hash).toBe('string');
    });

    it('returns a 64-character hex string (SHA-256)', () => {
        const hash = getAgreementHash('v1.0');
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('returns the same hash on multiple calls (deterministic)', () => {
        const hash1 = getAgreementHash('v1.0');
        const hash2 = getAgreementHash('v1.0');
        expect(hash1).toBe(hash2);
    });

    it('hash matches manual SHA-256 of the agreement text', () => {
        const text = AGREEMENT_VERSIONS['v1.0'].text;
        const expected = crypto.createHash('sha256').update(text).digest('hex');
        expect(getAgreementHash('v1.0')).toBe(expected);
    });

    it('throws if version does not exist (undefined text)', () => {
        expect(() => getAgreementHash('v999')).toThrow();
    });
});