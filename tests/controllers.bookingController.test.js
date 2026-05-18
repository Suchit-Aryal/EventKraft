// ============================================================
// Tests for controllers/bookingController.js
// Changed in this PR:
//   - store(): extracts customer_note from req.body
//   - decide(): new method — accept/decline with notifications
//   - showAgreement(): new method
//   - acceptAgreement(): new method
//   - showAdvancePayment(): new method
//   - handleAdvanceFailure(): new method
//   - handleFinalFailure(): new method
//   - raiseDispute(): new method
//   - moneyAmount() / formatMoney() helpers (private, tested via observe)
// ============================================================

jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('../models/Booking');
jest.mock('../models/Message');
jest.mock('../utils/notify', () => ({ createNotification: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../config/agreements', () => ({
    AGREEMENT_VERSIONS: {
        'v1.0': { version: 'v1.0', text: 'Test agreement text.' },
    },
    getAgreementHash: jest.fn().mockReturnValue('abc123hash'),
}));
jest.mock('../config/mailer', () => ({
    sendBookingAcceptedEmail: jest.fn().mockResolvedValue({}),
}));
jest.mock('../utils/esewa', () => ({
    generateTransactionUUID: jest.fn().mockReturnValue('EK-TEST-ABCD1234'),
    signEsewaPayload: jest.fn().mockReturnValue('mock-signature'),
    getEsewaEndpoint: jest.fn().mockReturnValue('https://rc-epay.esewa.com.np/api/epay/main/v2/form'),
    verifyEsewaPayment: jest.fn(),
}));

const pool = require('../config/db');
const Booking = require('../models/Booking');
const Message = require('../models/Message');
const { createNotification } = require('../utils/notify');
const controller = require('../controllers/bookingController');

// ─── Helpers ────────────────────────────────────────────────

function makeReq(overrides = {}) {
    return {
        params: { id: 'booking-1' },
        body: {},
        query: {},
        user: { id: 'user-1' },
        app: { get: jest.fn().mockReturnValue(null) },
        flash: jest.fn(),
        headers: { 'user-agent': 'TestAgent/1.0' },
        socket: { remoteAddress: '127.0.0.1' },
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3000'),
        files: [],
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
    process.env.ESEWA_MERCHANT_CODE = 'TEST_MERCHANT';
    process.env.ESEWA_SECRET_KEY = 'test-secret';
    process.env.APP_URL = 'http://localhost:3000';
});

afterEach(() => {
    delete process.env.ESEWA_MERCHANT_CODE;
    delete process.env.ESEWA_SECRET_KEY;
    delete process.env.APP_URL;
});

// ─── decide() ───────────────────────────────────────────────

describe('bookingController.decide', () => {
    const workerBooking = {
        id: 'booking-1',
        worker_id: 'user-1',
        customer_id: 'customer-1',
        status: 'pending',
        total_amount: 1000,
        gig_title: 'Photography',
    };

    beforeEach(() => {
        Message.getOrCreateConversation = jest.fn().mockResolvedValue({ id: 'conv-1' });
        Booking.findById = jest.fn().mockResolvedValue(workerBooking);
        Booking.updateStatus = jest.fn().mockResolvedValue({ ...workerBooking, status: 'cancelled' });
        Booking.updateFields = jest.fn().mockResolvedValue({ ...workerBooking, status: 'accepted' });
        pool.query = jest.fn().mockResolvedValue({ rows: [{ email: 'customer@example.com' }] });
    });

    it('returns 400 for an invalid decision value', async () => {
        const req = makeReq({ body: { decision: 'maybe' } });
        const res = makeRes();

        await controller.decide(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid booking decision' });
    });

    it('returns 400 for an empty decision', async () => {
        const req = makeReq({ body: { decision: '' } });
        const res = makeRes();

        await controller.decide(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when booking is not found', async () => {
        Booking.findById.mockResolvedValue(null);
        const req = makeReq({ body: { decision: 'accepted' } });
        const res = makeRes();

        await controller.decide(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Booking not found' });
    });

    it('returns 403 when user is not the assigned worker', async () => {
        Booking.findById.mockResolvedValue({ ...workerBooking, worker_id: 'different-worker' });
        const req = makeReq({ body: { decision: 'accepted' }, user: { id: 'user-1' } });
        const res = makeRes();

        await controller.decide(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Only the assigned worker can decide this booking' });
    });

    it('returns 409 when booking is not in pending status', async () => {
        Booking.findById.mockResolvedValue({ ...workerBooking, status: 'accepted' });
        const req = makeReq({ body: { decision: 'accepted' } });
        const res = makeRes();

        await controller.decide(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: 'This booking has already been decided',
            status: 'accepted',
        }));
    });

    it('cancels booking and sends notification when decision is "declined"', async () => {
        const req = makeReq({ body: { decision: 'declined' } });
        const res = makeRes();

        await controller.decide(req, res);

        expect(Booking.updateStatus).toHaveBeenCalledWith('booking-1', 'cancelled');
        expect(createNotification).toHaveBeenCalledWith(
            expect.anything(),
            null,
            expect.objectContaining({
                userId: 'customer-1',
                type: 'booking_declined',
            })
        );
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            decision: 'declined',
            status: 'cancelled',
        }));
    });

    it('accepts booking and sets advance deadline when decision is "accepted"', async () => {
        const req = makeReq({ body: { decision: 'accepted' } });
        const res = makeRes();

        await controller.decide(req, res);

        expect(Booking.updateFields).toHaveBeenCalledWith(
            'booking-1',
            expect.objectContaining({
                status: 'accepted',
                advance_amount: expect.any(Number),
                final_amount: expect.any(Number),
                advance_deadline: expect.any(Date),
            })
        );
    });

    it('calculates advance_amount as 30% of total_amount', async () => {
        const req = makeReq({ body: { decision: 'accepted' } });
        const res = makeRes();

        await controller.decide(req, res);

        const fieldsArg = Booking.updateFields.mock.calls[0][1];
        expect(fieldsArg.advance_amount).toBeCloseTo(300, 2); // 30% of 1000
    });

    it('calculates final_amount as 70% of total_amount', async () => {
        const req = makeReq({ body: { decision: 'accepted' } });
        const res = makeRes();

        await controller.decide(req, res);

        const fieldsArg = Booking.updateFields.mock.calls[0][1];
        expect(fieldsArg.final_amount).toBeCloseTo(700, 2); // 70% of 1000
    });

    it('sets redirect to agreement page on acceptance', async () => {
        const req = makeReq({ body: { decision: 'accepted' } });
        const res = makeRes();

        await controller.decide(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            redirect: '/bookings/booking-1/agreement',
        }));
    });

    it('sends accepted notification to customer on acceptance', async () => {
        const req = makeReq({ body: { decision: 'accepted' } });
        const res = makeRes();

        await controller.decide(req, res);

        expect(createNotification).toHaveBeenCalledWith(
            expect.anything(),
            null,
            expect.objectContaining({
                userId: 'customer-1',
                type: 'booking_accepted',
            })
        );
    });

    it('returns 500 on unexpected error', async () => {
        Booking.findById.mockRejectedValue(new Error('DB error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const req = makeReq({ body: { decision: 'accepted' } });
        const res = makeRes();

        await controller.decide(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update booking decision' });
        consoleSpy.mockRestore();
    });
});

// ─── showAgreement() ────────────────────────────────────────

describe('bookingController.showAgreement', () => {
    beforeEach(() => {
        Booking.findById = jest.fn();
    });

    it('redirects to /dashboard when booking not found', async () => {
        Booking.findById.mockResolvedValue(null);
        const req = makeReq();
        const res = makeRes();

        await controller.showAgreement(req, res);

        expect(res.redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('redirects to /dashboard when user is not the customer', async () => {
        Booking.findById.mockResolvedValue({ id: 'booking-1', customer_id: 'other-customer', status: 'accepted' });
        const req = makeReq({ user: { id: 'user-1' } });
        const res = makeRes();

        await controller.showAgreement(req, res);

        expect(res.redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('redirects to booking detail when status is not accepted/awaiting_agreement', async () => {
        Booking.findById.mockResolvedValue({ id: 'booking-1', customer_id: 'user-1', status: 'pending' });
        const req = makeReq();
        const res = makeRes();

        await controller.showAgreement(req, res);

        expect(res.redirect).toHaveBeenCalledWith('/bookings/booking-1');
    });

    it('renders the agreement page when booking is in "accepted" status', async () => {
        Booking.findById.mockResolvedValue({ id: 'booking-1', customer_id: 'user-1', status: 'accepted' });
        const req = makeReq();
        const res = makeRes();

        await controller.showAgreement(req, res);

        expect(res.render).toHaveBeenCalledWith('pages/booking-agreement', expect.objectContaining({
            agreement: expect.objectContaining({ version: 'v1.0' }),
        }));
    });

    it('renders the agreement page when booking is in "awaiting_agreement" status', async () => {
        Booking.findById.mockResolvedValue({ id: 'booking-1', customer_id: 'user-1', status: 'awaiting_agreement' });
        const req = makeReq();
        const res = makeRes();

        await controller.showAgreement(req, res);

        expect(res.render).toHaveBeenCalledWith('pages/booking-agreement', expect.anything());
    });
});

// ─── acceptAgreement() ──────────────────────────────────────

describe('bookingController.acceptAgreement', () => {
    beforeEach(() => {
        Booking.findById = jest.fn();
        Booking.updateFields = jest.fn().mockResolvedValue({});
        pool.query = jest.fn().mockResolvedValue({ rows: [] });
    });

    it('returns 403 when booking is not found', async () => {
        Booking.findById.mockResolvedValue(null);
        const req = makeReq();
        const res = makeRes();

        await controller.acceptAgreement(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.send).toHaveBeenCalledWith('Forbidden');
    });

    it('returns 403 when user is not the customer', async () => {
        Booking.findById.mockResolvedValue({ id: 'booking-1', customer_id: 'other-user', status: 'accepted' });
        const req = makeReq({ user: { id: 'user-1' } });
        const res = makeRes();

        await controller.acceptAgreement(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('redirects to booking when status is not accepted/awaiting_agreement', async () => {
        Booking.findById.mockResolvedValue({ id: 'booking-1', customer_id: 'user-1', status: 'pending' });
        const req = makeReq();
        const res = makeRes();

        await controller.acceptAgreement(req, res);

        expect(res.redirect).toHaveBeenCalledWith('/bookings/booking-1');
    });

    it('inserts a booking_agreements record', async () => {
        Booking.findById.mockResolvedValue({
            id: 'booking-1',
            customer_id: 'user-1',
            status: 'accepted',
            total_amount: 1000,
            advance_amount: 300,
            final_amount: 700,
        });
        const req = makeReq({
            headers: { 'user-agent': 'TestBrowser/1.0', 'x-forwarded-for': '192.168.1.1' },
        });
        const res = makeRes();

        await controller.acceptAgreement(req, res);

        expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO booking_agreements'),
            expect.arrayContaining(['booking-1', 'user-1', 'v1.0'])
        );
    });

    it('uses x-forwarded-for header for IP address when present', async () => {
        Booking.findById.mockResolvedValue({
            id: 'booking-1',
            customer_id: 'user-1',
            status: 'accepted',
            total_amount: 1000,
        });
        const req = makeReq({
            headers: { 'x-forwarded-for': '10.0.0.5, 10.0.0.1', 'user-agent': 'Agent' },
        });
        const res = makeRes();

        await controller.acceptAgreement(req, res);

        const insertParams = pool.query.mock.calls[0][1];
        expect(insertParams[4]).toBe('10.0.0.5'); // first IP in forwarded-for
    });

    it('falls back to socket.remoteAddress when x-forwarded-for is absent', async () => {
        Booking.findById.mockResolvedValue({
            id: 'booking-1',
            customer_id: 'user-1',
            status: 'accepted',
            total_amount: 1000,
        });
        const req = makeReq({
            headers: { 'user-agent': 'Agent' },
            socket: { remoteAddress: '::1' },
        });
        const res = makeRes();

        await controller.acceptAgreement(req, res);

        const insertParams = pool.query.mock.calls[0][1];
        expect(insertParams[4]).toBe('::1');
    });

    it('redirects to pay-advance page on success', async () => {
        Booking.findById.mockResolvedValue({
            id: 'booking-1',
            customer_id: 'user-1',
            status: 'accepted',
            total_amount: 1000,
        });
        const req = makeReq();
        const res = makeRes();

        await controller.acceptAgreement(req, res);

        expect(res.redirect).toHaveBeenCalledWith('/bookings/booking-1/pay-advance');
    });

    it('updates booking status to awaiting_agreement', async () => {
        Booking.findById.mockResolvedValue({
            id: 'booking-1',
            customer_id: 'user-1',
            status: 'accepted',
            total_amount: 1000,
        });
        const req = makeReq();
        const res = makeRes();

        await controller.acceptAgreement(req, res);

        expect(Booking.updateFields).toHaveBeenCalledWith(
            'booking-1',
            expect.objectContaining({ status: 'awaiting_agreement' })
        );
    });
});

// ─── showAdvancePayment() ────────────────────────────────────

describe('bookingController.showAdvancePayment', () => {
    beforeEach(() => {
        Booking.findById = jest.fn();
        Booking.updateFields = jest.fn().mockResolvedValue({});
        Booking.cancel = jest.fn().mockResolvedValue({});
    });

    it('redirects to /dashboard when booking not found', async () => {
        Booking.findById.mockResolvedValue(null);
        const req = makeReq();
        const res = makeRes();

        await controller.showAdvancePayment(req, res);

        expect(res.redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('redirects to /dashboard when user is not the customer', async () => {
        Booking.findById.mockResolvedValue({ id: 'booking-1', customer_id: 'other', status: 'accepted', legal_agreed_at: new Date() });
        const req = makeReq({ user: { id: 'user-1' } });
        const res = makeRes();

        await controller.showAdvancePayment(req, res);

        expect(res.redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('redirects to agreement page when legal_agreed_at is missing', async () => {
        Booking.findById.mockResolvedValue({
            id: 'booking-1',
            customer_id: 'user-1',
            status: 'accepted',
            legal_agreed_at: null,
        });
        const req = makeReq();
        const res = makeRes();

        await controller.showAdvancePayment(req, res);

        expect(res.redirect).toHaveBeenCalledWith('/bookings/booking-1/agreement');
    });

    it('cancels booking and redirects when advance deadline has expired', async () => {
        const expiredDeadline = new Date(Date.now() - 1000); // 1 second ago
        Booking.findById.mockResolvedValue({
            id: 'booking-1',
            customer_id: 'user-1',
            status: 'accepted',
            legal_agreed_at: new Date(),
            advance_deadline: expiredDeadline,
        });
        const req = makeReq();
        const res = makeRes();

        await controller.showAdvancePayment(req, res);

        expect(Booking.cancel).toHaveBeenCalledWith('booking-1');
        expect(req.flash).toHaveBeenCalledWith('error', expect.stringContaining('deadline has expired'));
        expect(res.redirect).toHaveBeenCalledWith('/bookings');
    });

    it('flashes error and redirects when ESEWA_MERCHANT_CODE is not configured', async () => {
        delete process.env.ESEWA_MERCHANT_CODE;
        Booking.findById.mockResolvedValue({
            id: 'booking-1',
            customer_id: 'user-1',
            status: 'accepted',
            legal_agreed_at: new Date(),
            advance_deadline: new Date(Date.now() + 86400000),
            advance_amount: 300,
            total_amount: 1000,
        });
        const req = makeReq();
        const res = makeRes();

        await controller.showAdvancePayment(req, res);

        expect(req.flash).toHaveBeenCalledWith('error', expect.stringContaining('merchant code'));
        expect(res.redirect).toHaveBeenCalledWith('/bookings/booking-1');
    });

    it('flashes error and redirects when ESEWA_SECRET_KEY is not configured', async () => {
        delete process.env.ESEWA_SECRET_KEY;
        Booking.findById.mockResolvedValue({
            id: 'booking-1',
            customer_id: 'user-1',
            status: 'accepted',
            legal_agreed_at: new Date(),
            advance_deadline: new Date(Date.now() + 86400000),
            advance_amount: 300,
            total_amount: 1000,
        });
        const req = makeReq();
        const res = makeRes();

        await controller.showAdvancePayment(req, res);

        expect(req.flash).toHaveBeenCalledWith('error', expect.stringContaining('secret key'));
        expect(res.redirect).toHaveBeenCalledWith('/bookings/booking-1');
    });
});

// ─── handleAdvanceFailure() ──────────────────────────────────

describe('bookingController.handleAdvanceFailure', () => {
    it('flashes error and redirects to pay-advance page', async () => {
        const req = makeReq({ params: { id: 'booking-99' } });
        const res = makeRes();

        await controller.handleAdvanceFailure(req, res);

        expect(req.flash).toHaveBeenCalledWith('error', 'Payment failed or was cancelled');
        expect(res.redirect).toHaveBeenCalledWith('/bookings/booking-99/pay-advance');
    });
});

// ─── handleFinalFailure() ────────────────────────────────────

describe('bookingController.handleFinalFailure', () => {
    it('flashes error and redirects to pay-final page', async () => {
        const req = makeReq({ params: { id: 'booking-50' } });
        const res = makeRes();

        await controller.handleFinalFailure(req, res);

        expect(req.flash).toHaveBeenCalledWith('error', 'Payment failed or was cancelled. Please try again.');
        expect(res.redirect).toHaveBeenCalledWith('/bookings/booking-50/pay-final');
    });
});

// ─── raiseDispute() ─────────────────────────────────────────

describe('bookingController.raiseDispute', () => {
    const validBooking = {
        id: 'booking-1',
        customer_id: 'user-1',
        worker_id: 'worker-1',
        status: 'work_done',
        gig_title: 'Photography',
        dispute_window_expires_at: new Date(Date.now() + 86400000), // future
    };

    beforeEach(() => {
        Booking.findById = jest.fn().mockResolvedValue(validBooking);
        Booking.updateFields = jest.fn().mockResolvedValue({});
        // Mock Dispute model
        jest.doMock('../models/Dispute', () => ({ create: jest.fn().mockResolvedValue({}) }));
    });

    it('returns 403 when booking is not found', async () => {
        Booking.findById.mockResolvedValue(null);
        const req = makeReq();
        const res = makeRes();

        await controller.raiseDispute(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.send).toHaveBeenCalledWith('Forbidden');
    });

    it('returns 403 when user is not the customer', async () => {
        Booking.findById.mockResolvedValue({ ...validBooking, customer_id: 'someone-else' });
        const req = makeReq({ user: { id: 'user-1' } });
        const res = makeRes();

        await controller.raiseDispute(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('redirects to pay-final when dispute window has closed', async () => {
        Booking.findById.mockResolvedValue({
            ...validBooking,
            dispute_window_expires_at: new Date(Date.now() - 1000), // expired
        });
        const req = makeReq();
        const res = makeRes();

        await controller.raiseDispute(req, res);

        expect(req.flash).toHaveBeenCalledWith('error', expect.stringContaining('Dispute window has closed'));
        expect(res.redirect).toHaveBeenCalledWith('/bookings/booking-1/pay-final');
    });

    it('redirects to pay-final when dispute_window_expires_at is null', async () => {
        Booking.findById.mockResolvedValue({
            ...validBooking,
            dispute_window_expires_at: null,
        });
        const req = makeReq();
        const res = makeRes();

        await controller.raiseDispute(req, res);

        expect(res.redirect).toHaveBeenCalledWith('/bookings/booking-1/pay-final');
    });

    it('updates booking status to dispute_raised when window is open', async () => {
        const req = makeReq({ body: { reason: 'Service not delivered' } });
        const res = makeRes();

        await controller.raiseDispute(req, res);

        expect(Booking.updateFields).toHaveBeenCalledWith(
            'booking-1',
            expect.objectContaining({ status: 'dispute_raised', dispute_raised_at: expect.any(Date) })
        );
    });

    it('sends notification to worker when dispute is raised', async () => {
        const req = makeReq({ body: { reason: 'Service not delivered' } });
        const res = makeRes();

        await controller.raiseDispute(req, res);

        expect(createNotification).toHaveBeenCalledWith(
            expect.anything(),
            null,
            expect.objectContaining({
                userId: 'worker-1',
                type: 'dispute_raised',
            })
        );
    });

    it('redirects to booking detail on success', async () => {
        const req = makeReq({ body: { reason: 'Not satisfied' } });
        const res = makeRes();

        await controller.raiseDispute(req, res);

        expect(res.redirect).toHaveBeenCalledWith('/bookings/booking-1');
    });
});

// ─── moneyAmount / formatMoney (via showAdvancePayment rendering) ─

describe('moneyAmount and formatMoney logic (indirect via showAdvancePayment)', () => {
    // These helpers determine the advance amount passed to signEsewaPayload

    const { signEsewaPayload } = require('../utils/esewa');

    beforeEach(() => {
        Booking.findById = jest.fn();
        Booking.updateFields = jest.fn().mockResolvedValue({});
    });

    it('uses booking.advance_amount when present and numeric', async () => {
        Booking.findById.mockResolvedValue({
            id: 'booking-1',
            customer_id: 'user-1',
            status: 'accepted',
            legal_agreed_at: new Date(),
            advance_deadline: new Date(Date.now() + 86400000),
            advance_amount: 350,
            total_amount: 1000,
        });

        const req = makeReq();
        const res = makeRes();
        await controller.showAdvancePayment(req, res);

        // signEsewaPayload receives formatted advance amount
        expect(signEsewaPayload).toHaveBeenCalledWith('350.00', expect.any(String), 'TEST_MERCHANT');
    });

    it('falls back to 30% of total_amount when advance_amount is null', async () => {
        Booking.findById.mockResolvedValue({
            id: 'booking-1',
            customer_id: 'user-1',
            status: 'accepted',
            legal_agreed_at: new Date(),
            advance_deadline: new Date(Date.now() + 86400000),
            advance_amount: null,
            total_amount: 2000,
        });

        const req = makeReq();
        const res = makeRes();
        await controller.showAdvancePayment(req, res);

        // 30% of 2000 = 600
        expect(signEsewaPayload).toHaveBeenCalledWith('600.00', expect.any(String), 'TEST_MERCHANT');
    });

    it('produces "0.00" when both advance_amount and total_amount are absent', async () => {
        Booking.findById.mockResolvedValue({
            id: 'booking-1',
            customer_id: 'user-1',
            status: 'accepted',
            legal_agreed_at: new Date(),
            advance_deadline: new Date(Date.now() + 86400000),
            advance_amount: null,
            total_amount: null,
        });

        const req = makeReq();
        const res = makeRes();
        await controller.showAdvancePayment(req, res);

        expect(signEsewaPayload).toHaveBeenCalledWith('0.00', expect.any(String), 'TEST_MERCHANT');
    });
});