// ============================================================
// Tests for config/mailer.js — sendBookingAcceptedEmail (new function)
// ============================================================

// Capture sendMail mock before module load
const mockSendMail = jest.fn();

jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({
        sendMail: mockSendMail,
    }),
}));

const { sendBookingAcceptedEmail } = require('../config/mailer');

describe('sendBookingAcceptedEmail', () => {
    beforeEach(() => {
        mockSendMail.mockReset();
        mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
        process.env.SMTP_FROM = '"EventKraft" <noreply@eventkraft.com>';
        process.env.APP_URL = 'http://localhost:3000';
    });

    afterEach(() => {
        delete process.env.SMTP_FROM;
        delete process.env.APP_URL;
    });

    const baseBooking = {
        id: 'booking-123',
        total_amount: 1000,
        worker_first_name: 'Ram',
        worker_last_name: 'Bahadur',
        gig_title: 'Wedding Photography',
    };

    const deadline = new Date('2026-06-01T12:00:00Z');

    it('calls sendMail with the correct recipient', async () => {
        await sendBookingAcceptedEmail('customer@example.com', baseBooking, deadline);

        expect(mockSendMail).toHaveBeenCalledWith(
            expect.objectContaining({ to: 'customer@example.com' })
        );
    });

    it('uses the configured SMTP_FROM address', async () => {
        await sendBookingAcceptedEmail('customer@example.com', baseBooking, deadline);

        expect(mockSendMail).toHaveBeenCalledWith(
            expect.objectContaining({ from: '"EventKraft" <noreply@eventkraft.com>' })
        );
    });

    it('falls back to default "from" address when SMTP_FROM is not set', async () => {
        delete process.env.SMTP_FROM;
        await sendBookingAcceptedEmail('customer@example.com', baseBooking, deadline);

        const { from } = mockSendMail.mock.calls[0][0];
        expect(from).toBe('"EventKraft" <noreply@eventkraft.com>');
    });

    it('includes the worker name in the email body', async () => {
        await sendBookingAcceptedEmail('customer@example.com', baseBooking, deadline);

        const { html } = mockSendMail.mock.calls[0][0];
        expect(html).toContain('Ram Bahadur');
    });

    it('falls back to "the worker" when worker name is missing', async () => {
        const booking = { ...baseBooking, worker_first_name: '', worker_last_name: '' };
        await sendBookingAcceptedEmail('customer@example.com', booking, deadline);

        const { html } = mockSendMail.mock.calls[0][0];
        expect(html).toContain('the worker');
    });

    it('includes the gig title in the email body', async () => {
        await sendBookingAcceptedEmail('customer@example.com', baseBooking, deadline);

        const { html } = mockSendMail.mock.calls[0][0];
        expect(html).toContain('Wedding Photography');
    });

    it('falls back to "your booked service" when gig_title is missing', async () => {
        const booking = { ...baseBooking, gig_title: null };
        await sendBookingAcceptedEmail('customer@example.com', booking, deadline);

        const { html } = mockSendMail.mock.calls[0][0];
        expect(html).toContain('your booked service');
    });

    it('includes the advance amount (30% of total) in the email', async () => {
        const booking = { ...baseBooking, total_amount: 2000 }; // 30% = 600
        await sendBookingAcceptedEmail('customer@example.com', booking, deadline);

        const { html } = mockSendMail.mock.calls[0][0];
        // 30% of 2000 = 600
        expect(html).toContain('600');
    });

    it('includes the booking agreement link using APP_URL', async () => {
        await sendBookingAcceptedEmail('customer@example.com', baseBooking, deadline);

        const { html } = mockSendMail.mock.calls[0][0];
        expect(html).toContain('http://localhost:3000/bookings/booking-123/agreement');
    });

    it('includes the formatted deadline in the email body', async () => {
        await sendBookingAcceptedEmail('customer@example.com', baseBooking, deadline);

        const { html } = mockSendMail.mock.calls[0][0];
        // The deadline should appear somewhere in the HTML (timezone-formatted)
        expect(html).toContain('Nepal Time');
    });

    it('returns the result from sendMail', async () => {
        const expected = { messageId: 'returned-id' };
        mockSendMail.mockResolvedValue(expected);

        const result = await sendBookingAcceptedEmail('customer@example.com', baseBooking, deadline);
        expect(result).toEqual(expected);
    });

    it('includes an action button/link in the HTML', async () => {
        await sendBookingAcceptedEmail('customer@example.com', baseBooking, deadline);

        const { html } = mockSendMail.mock.calls[0][0];
        expect(html).toContain('Review Terms');
    });

    it('propagates sendMail errors to the caller', async () => {
        mockSendMail.mockRejectedValue(new Error('SMTP connection refused'));

        await expect(
            sendBookingAcceptedEmail('customer@example.com', baseBooking, deadline)
        ).rejects.toThrow('SMTP connection refused');
    });

    it('handles a booking with only worker_first_name provided', async () => {
        const booking = { ...baseBooking, worker_last_name: undefined };
        await sendBookingAcceptedEmail('customer@example.com', booking, deadline);

        const { html } = mockSendMail.mock.calls[0][0];
        expect(html).toContain('Ram'); // first name present
    });
});