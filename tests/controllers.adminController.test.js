// ============================================================
// Tests for controllers/adminController.js
// Changed in this PR:
//   - dashboard(): now calls flagOverdueBookings() before loading stats
//   - legalAction(): new exported method
//   - markLegalAction(): new exported method
//   - resolveOverdue(): new exported method
//   - flagOverdueBookings(): private helper, tested via observable side effects
// ============================================================

jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('../models/User', () => ({}));

const pool = require('../config/db');
const adminController = require('../controllers/adminController');

// ─── Helpers ────────────────────────────────────────────────

function makeReq(overrides = {}) {
    return {
        params: { id: 'booking-1' },
        body: {},
        user: { id: 'admin-1' },
        app: { get: jest.fn().mockReturnValue(null) },
        flash: jest.fn(),
        ...overrides,
    };
}

function makeRes() {
    return {
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        render: jest.fn(),
        send: jest.fn(),
    };
}

beforeEach(() => {
    jest.clearAllMocks();
});

// ─── dashboard() – calls flagOverdueBookings ─────────────────

describe('adminController.dashboard', () => {
    it('executes the auto-cancel overdue advance payments query', async () => {
        // dashboard calls flagOverdueBookings which issues two queries,
        // then many more for stats. We just verify pool.query was called
        // with the advance-cancellation SQL.
        pool.query.mockResolvedValue({ rows: [{}] });

        const req = makeReq();
        const res = makeRes();

        await adminController.dashboard(req, res);

        const allQueries = pool.query.mock.calls.map(call => call[0]);
        const cancelQuery = allQueries.find(sql =>
            typeof sql === 'string' &&
            sql.includes("status = 'cancelled'") &&
            sql.includes('advance_deadline')
        );
        expect(cancelQuery).toBeDefined();
    });

    it('executes the overdue_final flagging query', async () => {
        pool.query.mockResolvedValue({ rows: [{}] });

        const req = makeReq();
        const res = makeRes();

        await adminController.dashboard(req, res);

        const allQueries = pool.query.mock.calls.map(call => call[0]);
        const overdueQuery = allQueries.find(sql =>
            typeof sql === 'string' &&
            sql.includes("status = 'overdue_final'") &&
            sql.includes('final_deadline')
        );
        expect(overdueQuery).toBeDefined();
    });

    it('redirects to "/" and flashes error when database query fails', async () => {
        pool.query.mockRejectedValue(new Error('DB connection lost'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const req = makeReq();
        const res = makeRes();

        await adminController.dashboard(req, res);

        expect(req.flash).toHaveBeenCalledWith('error', 'Failed to load admin dashboard');
        expect(res.redirect).toHaveBeenCalledWith('/');
        consoleSpy.mockRestore();
    });
});

// ─── legalAction() ───────────────────────────────────────────

describe('adminController.legalAction', () => {
    it('calls flagOverdueBookings queries and then queries for overdue/legal_action bookings', async () => {
        pool.query.mockResolvedValue({ rows: [] });

        const req = makeReq();
        const res = makeRes();

        await adminController.legalAction(req, res);

        const allQueries = pool.query.mock.calls.map(call => call[0]);
        const legalQuery = allQueries.find(sql =>
            typeof sql === 'string' && sql.includes("'overdue_final'") && sql.includes("'legal_action'")
        );
        expect(legalQuery).toBeDefined();
    });

    it('renders admin-legal page with bookings', async () => {
        const mockBookings = [{ id: 'b-1', status: 'overdue_final' }];
        pool.query
            .mockResolvedValueOnce({ rows: [] }) // flagOverdueBookings cancel query
            .mockResolvedValueOnce({ rows: [] }) // flagOverdueBookings overdue query
            .mockResolvedValueOnce({ rows: mockBookings }); // getLegalActionBookings

        const req = makeReq();
        const res = makeRes();

        await adminController.legalAction(req, res);

        expect(res.render).toHaveBeenCalledWith('pages/admin-legal', expect.objectContaining({
            bookings: mockBookings,
        }));
    });

    it('flashes error and redirects to /admin on failure', async () => {
        pool.query.mockRejectedValue(new Error('DB error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const req = makeReq();
        const res = makeRes();

        await adminController.legalAction(req, res);

        expect(req.flash).toHaveBeenCalledWith('error', 'Failed to load legal action panel');
        expect(res.redirect).toHaveBeenCalledWith('/admin');
        consoleSpy.mockRestore();
    });
});

// ─── markLegalAction() ───────────────────────────────────────

describe('adminController.markLegalAction', () => {
    it('updates booking status to "legal_action"', async () => {
        pool.query.mockResolvedValue({ rows: [] });

        const req = makeReq({ params: { id: 'booking-abc' } });
        const res = makeRes();

        await adminController.markLegalAction(req, res);

        expect(pool.query).toHaveBeenCalledWith(
            "UPDATE bookings SET status = 'legal_action' WHERE id = $1",
            ['booking-abc']
        );
    });

    it('flashes success and redirects to /admin/legal-action on success', async () => {
        pool.query.mockResolvedValue({ rows: [] });

        const req = makeReq({ params: { id: 'booking-abc' } });
        const res = makeRes();

        await adminController.markLegalAction(req, res);

        expect(req.flash).toHaveBeenCalledWith('success', 'Booking marked as legal action.');
        expect(res.redirect).toHaveBeenCalledWith('/admin/legal-action');
    });

    it('flashes error and redirects to /admin/legal-action on database failure', async () => {
        pool.query.mockRejectedValue(new Error('DB error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const req = makeReq({ params: { id: 'booking-bad' } });
        const res = makeRes();

        await adminController.markLegalAction(req, res);

        expect(req.flash).toHaveBeenCalledWith('error', 'Failed to update booking.');
        expect(res.redirect).toHaveBeenCalledWith('/admin/legal-action');
        consoleSpy.mockRestore();
    });

    it('uses the booking id from req.params.id as a bind parameter', async () => {
        pool.query.mockResolvedValue({ rows: [] });

        const req = makeReq({ params: { id: 'specific-booking-id' } });
        const res = makeRes();

        await adminController.markLegalAction(req, res);

        const [, params] = pool.query.mock.calls[0];
        expect(params).toEqual(['specific-booking-id']);
    });
});

// ─── resolveOverdue() ────────────────────────────────────────

describe('adminController.resolveOverdue', () => {
    it('updates booking status to "completed"', async () => {
        pool.query.mockResolvedValue({ rows: [] });

        const req = makeReq({ params: { id: 'booking-xyz' } });
        const res = makeRes();

        await adminController.resolveOverdue(req, res);

        expect(pool.query).toHaveBeenCalledWith(
            "UPDATE bookings SET status = 'completed' WHERE id = $1",
            ['booking-xyz']
        );
    });

    it('flashes success and redirects to /admin/legal-action on success', async () => {
        pool.query.mockResolvedValue({ rows: [] });

        const req = makeReq({ params: { id: 'booking-xyz' } });
        const res = makeRes();

        await adminController.resolveOverdue(req, res);

        expect(req.flash).toHaveBeenCalledWith('success', 'Booking marked as resolved.');
        expect(res.redirect).toHaveBeenCalledWith('/admin/legal-action');
    });

    it('flashes error and redirects to /admin/legal-action on failure', async () => {
        pool.query.mockRejectedValue(new Error('DB down'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const req = makeReq({ params: { id: 'booking-fail' } });
        const res = makeRes();

        await adminController.resolveOverdue(req, res);

        expect(req.flash).toHaveBeenCalledWith('error', 'Failed to resolve booking.');
        expect(res.redirect).toHaveBeenCalledWith('/admin/legal-action');
        consoleSpy.mockRestore();
    });

    it('uses parameterized query to prevent SQL injection', async () => {
        pool.query.mockResolvedValue({ rows: [] });

        const req = makeReq({ params: { id: "'; DROP TABLE bookings; --" } });
        const res = makeRes();

        await adminController.resolveOverdue(req, res);

        const [sql, params] = pool.query.mock.calls[0];
        expect(sql).toBe("UPDATE bookings SET status = 'completed' WHERE id = $1");
        expect(params[0]).toBe("'; DROP TABLE bookings; --"); // safely bound
    });
});

// ─── flagOverdueBookings (indirect tests via dashboard) ──────

describe('flagOverdueBookings (via dashboard side effects)', () => {
    it('does not throw when the database query fails (catches errors internally)', async () => {
        // The first two queries from flagOverdueBookings fail,
        // which should be caught internally
        pool.query
            .mockRejectedValueOnce(new Error('Advance cancel query failed'))
            .mockResolvedValue({ rows: [{}] }); // subsequent queries succeed

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const req = makeReq();
        const res = makeRes();

        // Should not throw
        await expect(adminController.dashboard(req, res)).resolves.not.toThrow();

        consoleSpy.mockRestore();
    });

    it('runs both the advance-cancellation and overdue-flagging queries', async () => {
        pool.query.mockResolvedValue({ rows: [{}] });

        const req = makeReq();
        const res = makeRes();

        await adminController.dashboard(req, res);

        const advanceCancelCalled = pool.query.mock.calls.some(([sql]) =>
            typeof sql === 'string' && sql.includes('advance_deadline') && sql.includes("'cancelled'")
        );
        const overdueFinalCalled = pool.query.mock.calls.some(([sql]) =>
            typeof sql === 'string' && sql.includes('final_deadline') && sql.includes("'overdue_final'")
        );

        expect(advanceCancelCalled).toBe(true);
        expect(overdueFinalCalled).toBe(true);
    });
});