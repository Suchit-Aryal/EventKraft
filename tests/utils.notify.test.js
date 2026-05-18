// ============================================================
// Tests for utils/notify.js
// ============================================================

const { createNotification } = require('../utils/notify');

describe('createNotification', () => {
    let mockDb;
    let mockIo;

    beforeEach(() => {
        mockDb = { query: jest.fn().mockResolvedValue({ rows: [] }) };
        mockIo = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) };
    });

    it('inserts a notification record into the database', async () => {
        await createNotification(mockDb, null, {
            userId: 'user-1',
            type: 'booking_accepted',
            title: 'Booking Accepted',
            message: 'Your booking was accepted.',
            link: '/bookings/123',
        });

        expect(mockDb.query).toHaveBeenCalledTimes(1);
        const [sql, params] = mockDb.query.mock.calls[0];
        expect(sql).toContain('INSERT INTO notifications');
        expect(params).toEqual(['user-1', 'booking_accepted', 'Booking Accepted', 'Your booking was accepted.', '/bookings/123']);
    });

    it('emits a new-notification socket event when io is provided', async () => {
        const emitMock = jest.fn();
        mockIo.to.mockReturnValue({ emit: emitMock });

        await createNotification(mockDb, mockIo, {
            userId: 'user-2',
            type: 'work_completed',
            title: 'Work Done',
            message: 'Service completed.',
            link: '/bookings/456/pay-final',
        });

        expect(mockIo.to).toHaveBeenCalledWith('user_user-2');
        expect(emitMock).toHaveBeenCalledWith('new-notification', {
            type: 'work_completed',
            title: 'Work Done',
            message: 'Service completed.',
            link: '/bookings/456/pay-final',
        });
    });

    it('does not emit socket event when io is null', async () => {
        await createNotification(mockDb, null, {
            userId: 'user-3',
            type: 'test',
            title: 'Test',
            message: 'Test message',
            link: null,
        });

        // No socket error thrown; query was still called
        expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('inserts null for message when message is not provided', async () => {
        await createNotification(mockDb, null, {
            userId: 'user-4',
            type: 'advance_received',
            title: 'Payment',
            link: '/bookings/789',
        });

        const params = mockDb.query.mock.calls[0][1];
        expect(params[3]).toBeNull(); // message slot
    });

    it('inserts null for link when link is not provided', async () => {
        await createNotification(mockDb, null, {
            userId: 'user-5',
            type: 'payout_pending',
            title: 'Payout',
            message: 'Your payout is pending.',
        });

        const params = mockDb.query.mock.calls[0][1];
        expect(params[4]).toBeNull(); // link slot
    });

    it('does not throw when database query fails — silently logs', async () => {
        mockDb.query.mockRejectedValue(new Error('DB connection lost'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(
            createNotification(mockDb, null, {
                userId: 'user-6',
                type: 'test',
                title: 'Test',
                message: 'msg',
                link: null,
            })
        ).resolves.not.toThrow();

        consoleSpy.mockRestore();
    });
});
