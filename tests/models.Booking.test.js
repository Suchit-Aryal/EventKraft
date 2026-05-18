// ============================================================
// Tests for models/Booking.js — focused on changed code:
//   - create() now includes customer_note ($13/$14 parameter)
//   - updateFields() new method with whitelist
// ============================================================

jest.mock('../config/db', () => ({
    query: jest.fn(),
}));

const pool = require('../config/db');
const Booking = require('../models/Booking');

beforeEach(() => {
    jest.clearAllMocks();
});

// ─── Booking.create ─────────────────────────────────────────

describe('Booking.create', () => {
    const baseData = {
        customer_id: 'cust-1',
        worker_id: 'work-1',
        gig_id: 'gig-1',
        job_id: null,
        package_id: 'pkg-1',
        total_amount: 1000,
        commission_rate: 10,
        commission_amount: 100,
        worker_earning: 900,
        event_date: '2026-06-01',
        event_location: 'Kathmandu',
        requirements: 'Photo coverage',
        customer_note: 'Please arrive early',
    };

    it('passes customer_note to the INSERT query', async () => {
        pool.query.mockResolvedValue({ rows: [{ id: 'booking-1', ...baseData }] });

        await Booking.create(baseData);

        const [sql, params] = pool.query.mock.calls[0];
        expect(sql).toContain('customer_note');
        expect(params).toContain('Please arrive early');
    });

    it('passes null for customer_note when not provided', async () => {
        const data = { ...baseData };
        delete data.customer_note;
        pool.query.mockResolvedValue({ rows: [{ id: 'booking-2', ...data }] });

        await Booking.create(data);

        const params = pool.query.mock.calls[0][1];
        // customer_note should be null (index 12, 0-based)
        expect(params[12]).toBeNull();
    });

    it('defaults status to "pending" when not provided', async () => {
        pool.query.mockResolvedValue({ rows: [{ id: 'booking-3' }] });
        await Booking.create(baseData);

        const params = pool.query.mock.calls[0][1];
        // status is last parameter
        expect(params[params.length - 1]).toBe('pending');
    });

    it('uses provided status when given', async () => {
        pool.query.mockResolvedValue({ rows: [{ id: 'booking-4' }] });
        await Booking.create({ ...baseData, status: 'accepted' });

        const params = pool.query.mock.calls[0][1];
        expect(params[params.length - 1]).toBe('accepted');
    });

    it('returns the first row from the query result', async () => {
        const mockRow = { id: 'booking-5', customer_id: 'cust-1' };
        pool.query.mockResolvedValue({ rows: [mockRow] });

        const result = await Booking.create(baseData);
        expect(result).toEqual(mockRow);
    });

    it('coerces null gig_id when not provided', async () => {
        pool.query.mockResolvedValue({ rows: [{ id: 'booking-6' }] });
        await Booking.create({ ...baseData, gig_id: undefined });

        const params = pool.query.mock.calls[0][1];
        expect(params[2]).toBeNull(); // gig_id position
    });
});

// ─── Booking.updateFields ────────────────────────────────────

describe('Booking.updateFields', () => {
    it('builds a SET clause and executes UPDATE for allowed fields', async () => {
        pool.query.mockResolvedValue({ rows: [{ id: 'booking-1', status: 'accepted' }] });

        const result = await Booking.updateFields('booking-1', { status: 'accepted' });

        expect(pool.query).toHaveBeenCalledTimes(1);
        const [sql, params] = pool.query.mock.calls[0];
        expect(sql).toContain('UPDATE bookings SET');
        expect(sql).toContain('status = $2');
        expect(sql).toContain('WHERE id = $1');
        expect(params[0]).toBe('booking-1');
        expect(params[1]).toBe('accepted');
        expect(result).toEqual({ id: 'booking-1', status: 'accepted' });
    });

    it('strips disallowed fields and only updates whitelisted columns', async () => {
        pool.query.mockResolvedValue({ rows: [{ id: 'booking-2', status: 'accepted' }] });

        await Booking.updateFields('booking-2', {
            status: 'accepted',
            hacker_field: 'DROP TABLE bookings;',
            __proto__: 'evil',
        });

        const [sql, params] = pool.query.mock.calls[0];
        expect(sql).not.toContain('hacker_field');
        expect(sql).not.toContain('__proto__');
        expect(params).not.toContain('DROP TABLE bookings;');
    });

    it('returns undefined without querying when no allowed fields are provided', async () => {
        const result = await Booking.updateFields('booking-3', {
            totally_unknown: 'value',
            another_bad_field: 123,
        });

        expect(pool.query).not.toHaveBeenCalled();
        expect(result).toBeUndefined();
    });

    it('returns undefined without querying for an empty fields object', async () => {
        const result = await Booking.updateFields('booking-4', {});

        expect(pool.query).not.toHaveBeenCalled();
        expect(result).toBeUndefined();
    });

    it('can update multiple allowed fields at once', async () => {
        pool.query.mockResolvedValue({ rows: [{ id: 'booking-5' }] });

        await Booking.updateFields('booking-5', {
            status: 'paid_advance',
            advance_paid_at: new Date('2026-01-01'),
            advance_esewa_ref_id: 'REF-XYZ',
        });

        const [sql, params] = pool.query.mock.calls[0];
        expect(sql).toContain('status =');
        expect(sql).toContain('advance_paid_at =');
        expect(sql).toContain('advance_esewa_ref_id =');
        // params[0] is the booking id, the rest are field values
        expect(params[0]).toBe('booking-5');
        expect(params.length).toBe(4); // id + 3 fields
    });

    it('accepts all fields in the whitelist without filtering', async () => {
        pool.query.mockResolvedValue({ rows: [{}] });

        const allowedFields = {
            status: 'work_done',
            customer_note: 'note',
            accepted_at: new Date(),
            advance_deadline: new Date(),
            advance_amount: 300,
            final_amount: 700,
            legal_agreed_at: new Date(),
            legal_agreed_ip: '127.0.0.1',
            legal_agreed_user_agent: 'Mozilla/5.0',
            advance_transaction_uuid: 'EK-1-ABCD1234',
            advance_esewa_ref_id: 'REF1',
            advance_paid_at: new Date(),
            final_transaction_uuid: 'EK-2-EFGH5678',
            final_esewa_ref_id: 'REF2',
            final_paid_at: new Date(),
            final_deadline: new Date(),
            completion_proof: '[]',
            completion_note: 'Done',
            completed_at: new Date(),
            dispute_window_expires_at: new Date(),
            dispute_raised_at: new Date(),
            overdue_flagged_at: new Date(),
        };

        await Booking.updateFields('booking-6', allowedFields);

        expect(pool.query).toHaveBeenCalledTimes(1);
        const [sql] = pool.query.mock.calls[0];
        expect(sql).toContain('WHERE id = $1');
    });

    it('uses parameterized query preventing SQL injection via field values', async () => {
        pool.query.mockResolvedValue({ rows: [{ id: 'booking-7' }] });

        await Booking.updateFields('booking-7', {
            completion_note: "'; DROP TABLE bookings; --",
        });

        const [, params] = pool.query.mock.calls[0];
        // The dangerous value should appear as a bind parameter, never interpolated
        expect(params).toContain("'; DROP TABLE bookings; --");
        const [sql] = pool.query.mock.calls[0];
        expect(sql).not.toContain("'; DROP TABLE bookings; --");
    });
});