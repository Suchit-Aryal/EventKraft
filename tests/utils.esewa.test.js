// ============================================================
// Tests for utils/esewa.js
// ============================================================

const crypto = require('crypto');

// Mock fetch globally (Node 18+ has it built-in, but mock for test control)
global.fetch = jest.fn();

const { generateTransactionUUID, signEsewaPayload, getEsewaEndpoint, verifyEsewaPayment } = require('../utils/esewa');

describe('generateTransactionUUID', () => {
    it('returns a string', () => {
        const uuid = generateTransactionUUID();
        expect(typeof uuid).toBe('string');
    });

    it('starts with "EK-"', () => {
        const uuid = generateTransactionUUID();
        expect(uuid).toMatch(/^EK-/);
    });

    it('contains a timestamp component', () => {
        const before = Date.now();
        const uuid = generateTransactionUUID();
        const after = Date.now();
        const parts = uuid.split('-');
        // Format: EK-{timestamp}-{uuid_hex}
        const timestamp = parseInt(parts[1], 10);
        expect(timestamp).toBeGreaterThanOrEqual(before);
        expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('contains an 8-character uppercase hex suffix', () => {
        const uuid = generateTransactionUUID();
        const parts = uuid.split('-');
        // Last part is uppercase alphanumeric (UUID hex chars)
        const suffix = parts[parts.length - 1];
        expect(suffix).toHaveLength(8);
        expect(suffix).toMatch(/^[A-F0-9]+$/);
    });

    it('generates unique values on successive calls', () => {
        const uuids = new Set(Array.from({ length: 20 }, () => generateTransactionUUID()));
        expect(uuids.size).toBe(20);
    });
});

describe('signEsewaPayload', () => {
    const SECRET_KEY = 'test-secret-key-for-unit-tests';

    beforeEach(() => {
        process.env.ESEWA_SECRET_KEY = SECRET_KEY;
    });

    afterEach(() => {
        delete process.env.ESEWA_SECRET_KEY;
    });

    it('returns a base64-encoded string', () => {
        const sig = signEsewaPayload('100.00', 'EK-123-ABCD1234', 'MERCHANT001');
        // Valid base64 check
        expect(() => Buffer.from(sig, 'base64')).not.toThrow();
        expect(sig).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('produces the correct HMAC-SHA256 signature', () => {
        const totalAmount = '500.00';
        const transactionUuid = 'EK-9999-DEADBEEF';
        const productCode = 'TESTMERCHANT';
        const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
        const expected = crypto.createHmac('sha256', SECRET_KEY).update(message).digest('base64');

        const result = signEsewaPayload(totalAmount, transactionUuid, productCode);
        expect(result).toBe(expected);
    });

    it('produces a different signature when amount changes', () => {
        const sig1 = signEsewaPayload('100.00', 'EK-1-AABB1122', 'MERCHANT');
        const sig2 = signEsewaPayload('200.00', 'EK-1-AABB1122', 'MERCHANT');
        expect(sig1).not.toBe(sig2);
    });

    it('produces a different signature when transaction UUID changes', () => {
        const sig1 = signEsewaPayload('100.00', 'EK-1-AAAAAAAA', 'MERCHANT');
        const sig2 = signEsewaPayload('100.00', 'EK-2-BBBBBBBB', 'MERCHANT');
        expect(sig1).not.toBe(sig2);
    });

    it('throws when ESEWA_SECRET_KEY is not set', () => {
        delete process.env.ESEWA_SECRET_KEY;
        expect(() => signEsewaPayload('100.00', 'EK-1-ABCD1234', 'MERCHANT')).toThrow('ESEWA_SECRET_KEY is not configured');
    });

    it('is deterministic — same inputs produce same output', () => {
        const sig1 = signEsewaPayload('250.00', 'EK-777-CAFEBABE', 'MC_123');
        const sig2 = signEsewaPayload('250.00', 'EK-777-CAFEBABE', 'MC_123');
        expect(sig1).toBe(sig2);
    });
});

describe('getEsewaEndpoint', () => {
    afterEach(() => {
        delete process.env.ESEWA_ENV;
    });

    it('returns the sandbox endpoint when ESEWA_ENV is not "live"', () => {
        process.env.ESEWA_ENV = 'sandbox';
        expect(getEsewaEndpoint()).toBe('https://rc-epay.esewa.com.np/api/epay/main/v2/form');
    });

    it('returns the sandbox endpoint when ESEWA_ENV is undefined', () => {
        delete process.env.ESEWA_ENV;
        expect(getEsewaEndpoint()).toBe('https://rc-epay.esewa.com.np/api/epay/main/v2/form');
    });

    it('returns the live endpoint when ESEWA_ENV is "live"', () => {
        process.env.ESEWA_ENV = 'live';
        expect(getEsewaEndpoint()).toBe('https://epay.esewa.com.np/api/epay/main/v2/form');
    });

    it('returns sandbox endpoint for any value other than "live"', () => {
        process.env.ESEWA_ENV = 'production'; // intentional misconfig
        expect(getEsewaEndpoint()).toBe('https://rc-epay.esewa.com.np/api/epay/main/v2/form');
    });
});

describe('verifyEsewaPayment', () => {
    beforeEach(() => {
        process.env.ESEWA_MERCHANT_CODE = 'TEST_MERCHANT';
        process.env.ESEWA_ENV = 'sandbox';
        global.fetch.mockReset();
    });

    afterEach(() => {
        delete process.env.ESEWA_MERCHANT_CODE;
        delete process.env.ESEWA_ENV;
    });

    it('returns the response data when status is COMPLETE', async () => {
        const mockData = { status: 'COMPLETE', ref_id: 'REF123', total_amount: '300.00' };
        global.fetch.mockResolvedValue({ json: async () => mockData });

        const result = await verifyEsewaPayment('EK-1-ABCDEFGH', '300.00');
        expect(result).toEqual(mockData);
    });

    it('returns null when status is not COMPLETE', async () => {
        global.fetch.mockResolvedValue({ json: async () => ({ status: 'PENDING' }) });

        const result = await verifyEsewaPayment('EK-1-ABCDEFGH', '300.00');
        expect(result).toBeNull();
    });

    it('returns null when status is FAILED', async () => {
        global.fetch.mockResolvedValue({ json: async () => ({ status: 'FAILED' }) });

        const result = await verifyEsewaPayment('EK-1-ABCDEFGH', '300.00');
        expect(result).toBeNull();
    });

    it('calls the sandbox verification URL when ESEWA_ENV is sandbox', async () => {
        global.fetch.mockResolvedValue({ json: async () => ({ status: 'COMPLETE' }) });

        await verifyEsewaPayment('EK-1-TESTID', '150.00');

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('rc.esewa.com.np')
        );
    });

    it('calls the live verification URL when ESEWA_ENV is live', async () => {
        process.env.ESEWA_ENV = 'live';
        global.fetch.mockResolvedValue({ json: async () => ({ status: 'COMPLETE' }) });

        await verifyEsewaPayment('EK-1-LIVEID', '150.00');

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('epay.esewa.com.np')
        );
    });

    it('includes merchant code, amount and uuid in the request URL', async () => {
        global.fetch.mockResolvedValue({ json: async () => ({ status: 'COMPLETE' }) });

        await verifyEsewaPayment('EK-MYUUID-12345678', '999.00');

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('product_code=TEST_MERCHANT')
        );
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('total_amount=999.00')
        );
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('transaction_uuid=EK-MYUUID-12345678')
        );
    });
});