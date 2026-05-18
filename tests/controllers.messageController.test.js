// ============================================================
// Tests for controllers/messageController.js
// Changed in this PR:
//   - show(): added conversation membership check
//   - getHistoryApi(): added conversation membership check
//   - sendFile(): added membership check + server-derived receiverId
//   - normalizeBookingRequestMessages() (private helper, tested via getHistoryApi)
// ============================================================

jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('../models/Message');

const Message = require('../models/Message');
const controller = require('../controllers/messageController');

// ─── Helpers ────────────────────────────────────────────────

function makeReq(overrides = {}) {
    return {
        params: { conversationId: 'conv-1', messageId: 'msg-1' },
        body: {},
        user: { id: 'user-1', first_name: 'Alice' },
        app: { get: jest.fn().mockReturnValue(null) },
        flash: jest.fn(),
        is: jest.fn().mockReturnValue(false),
        headers: {},
        file: null,
        ...overrides,
    };
}

function makeRes() {
    const res = {
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        render: jest.fn(),
        send: jest.fn(),
    };
    return res;
}

const BASE_CONVERSATION = {
    id: 'conv-1',
    participant_1: 'user-1',
    participant_2: 'user-2',
    p1_name: 'Alice',
    p2_name: 'Bob',
};

// ─── show() ─────────────────────────────────────────────────

describe('messageController.show', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Message.getConversationById = jest.fn();
        Message.getByConversation = jest.fn();
        Message.markAsRead = jest.fn();
    });

    it('redirects to /messages when conversation is not found', async () => {
        Message.getConversationById.mockResolvedValue(null);
        const req = makeReq();
        const res = makeRes();

        await controller.show(req, res);

        expect(res.redirect).toHaveBeenCalledWith('/messages');
    });

    it('flashes error and redirects when user is not a participant', async () => {
        Message.getConversationById.mockResolvedValue({
            ...BASE_CONVERSATION,
            participant_1: 'other-user-1',
            participant_2: 'other-user-2',
        });
        const req = makeReq({ user: { id: 'intruder-user', first_name: 'Hacker' } });
        const res = makeRes();

        await controller.show(req, res);

        expect(req.flash).toHaveBeenCalledWith('error', 'You do not have access to that conversation');
        expect(res.redirect).toHaveBeenCalledWith('/messages');
    });

    it('renders the conversation when user is participant_1', async () => {
        Message.getConversationById.mockResolvedValue(BASE_CONVERSATION);
        Message.getByConversation.mockResolvedValue([]);
        Message.markAsRead.mockResolvedValue();

        const req = makeReq({ user: { id: 'user-1', first_name: 'Alice' } });
        const res = makeRes();

        await controller.show(req, res);

        expect(res.render).toHaveBeenCalledWith('pages/conversation', expect.objectContaining({
            conversation: BASE_CONVERSATION,
        }));
    });

    it('renders the conversation when user is participant_2', async () => {
        Message.getConversationById.mockResolvedValue(BASE_CONVERSATION);
        Message.getByConversation.mockResolvedValue([]);
        Message.markAsRead.mockResolvedValue();

        const req = makeReq({ user: { id: 'user-2', first_name: 'Bob' } });
        const res = makeRes();

        await controller.show(req, res);

        expect(res.render).toHaveBeenCalledWith('pages/conversation', expect.objectContaining({
            conversation: BASE_CONVERSATION,
        }));
    });

    it('normalizes booking_request messages before rendering', async () => {
        Message.getConversationById.mockResolvedValue(BASE_CONVERSATION);
        Message.markAsRead.mockResolvedValue();

        const rawMessage = {
            id: 'msg-1',
            message_type: 'text',
            content: JSON.stringify({ type: 'booking_request', booking_id: 'b-1', gig_title: 'Photography', package_name: 'Basic', total_price: 500, event_venue: 'Hall A' }),
        };
        Message.getByConversation.mockResolvedValue([rawMessage]);

        const req = makeReq();
        const res = makeRes();

        await controller.show(req, res);

        const renderArgs = res.render.mock.calls[0][1];
        const messages = renderArgs.messages;
        expect(messages[0].message_type).toBe('booking_request');
        expect(messages[0].gig_title).toBe('Photography');
        expect(messages[0].package_name).toBe('Basic');
        expect(messages[0].event_location).toBe('Hall A');
    });
});

// ─── getHistoryApi() ─────────────────────────────────────────

describe('messageController.getHistoryApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Message.getConversationById = jest.fn();
        Message.getByConversation = jest.fn();
        Message.markAsRead = jest.fn();
    });

    it('returns 404 when conversation is not found', async () => {
        Message.getConversationById.mockResolvedValue(null);
        const req = makeReq();
        const res = makeRes();

        await controller.getHistoryApi(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Conversation not found' });
    });

    it('returns 403 when user is not a participant', async () => {
        Message.getConversationById.mockResolvedValue({
            ...BASE_CONVERSATION,
            participant_1: 'someone-else',
            participant_2: 'another-person',
        });
        const req = makeReq({ user: { id: 'intruder', first_name: 'Hacker' } });
        const res = makeRes();

        await controller.getHistoryApi(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Not a member of this conversation' });
    });

    it('returns messages as JSON when user is a participant', async () => {
        Message.getConversationById.mockResolvedValue(BASE_CONVERSATION);
        const mockMessages = [{ id: 'msg-1', content: 'Hello', message_type: 'text' }];
        Message.getByConversation.mockResolvedValue(mockMessages);
        Message.markAsRead.mockResolvedValue();

        const req = makeReq();
        const res = makeRes();

        await controller.getHistoryApi(req, res);

        expect(res.json).toHaveBeenCalledWith(mockMessages);
    });

    it('marks messages as read after fetching', async () => {
        Message.getConversationById.mockResolvedValue(BASE_CONVERSATION);
        Message.getByConversation.mockResolvedValue([]);
        Message.markAsRead.mockResolvedValue();

        const req = makeReq({ user: { id: 'user-2', first_name: 'Bob' } });
        const res = makeRes();

        await controller.getHistoryApi(req, res);

        expect(Message.markAsRead).toHaveBeenCalledWith('conv-1', 'user-2');
    });

    it('returns 500 on unexpected error', async () => {
        Message.getConversationById.mockRejectedValue(new Error('DB down'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const req = makeReq();
        const res = makeRes();

        await controller.getHistoryApi(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch history' });
        consoleSpy.mockRestore();
    });
});

// ─── normalizeBookingRequestMessages (via getHistoryApi) ─────

describe('normalizeBookingRequestMessages (via getHistoryApi)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Message.getConversationById = jest.fn().mockResolvedValue(BASE_CONVERSATION);
        Message.markAsRead = jest.fn().mockResolvedValue();
    });

    async function normalizeViaApi(messages) {
        Message.getByConversation = jest.fn().mockResolvedValue(messages);
        const req = makeReq();
        const res = makeRes();
        await controller.getHistoryApi(req, res);
        return res.json.mock.calls[0][0];
    }

    it('leaves non-booking messages unchanged', async () => {
        const input = [{ id: 'm-1', message_type: 'text', content: 'Hello there' }];
        const result = await normalizeViaApi(input);
        expect(result[0].message_type).toBe('text');
        expect(result[0].content).toBe('Hello there');
    });

    it('passes through messages already typed as booking_request', async () => {
        const input = [{
            id: 'm-2',
            message_type: 'booking_request',
            content: JSON.stringify({ type: 'booking_request', booking_id: 'b-1' }),
            gig_title: 'Already Populated',
        }];
        const result = await normalizeViaApi(input);
        expect(result[0].message_type).toBe('booking_request');
        expect(result[0].gig_title).toBe('Already Populated'); // untouched
    });

    it('sets message_type = "booking_request" for messages with JSON booking_request payload', async () => {
        const input = [{
            id: 'm-3',
            message_type: 'text',
            content: JSON.stringify({ type: 'booking_request', booking_id: 'b-5', gig_title: 'DJ Set' }),
        }];
        const result = await normalizeViaApi(input);
        expect(result[0].message_type).toBe('booking_request');
    });

    it('extracts booking_id, gig_title, package_name from payload', async () => {
        const input = [{
            id: 'm-4',
            message_type: 'text',
            content: JSON.stringify({
                type: 'booking_request',
                booking_id: 'b-10',
                gig_title: 'Wedding Photo',
                package_name: 'Premium',
            }),
        }];
        const result = await normalizeViaApi(input);
        expect(result[0].booking_id).toBe('b-10');
        expect(result[0].gig_title).toBe('Wedding Photo');
        expect(result[0].package_name).toBe('Premium');
    });

    it('uses total_price as fallback for total_amount when total_amount is missing', async () => {
        const input = [{
            id: 'm-5',
            message_type: 'text',
            content: JSON.stringify({
                type: 'booking_request',
                total_price: 800,
            }),
        }];
        const result = await normalizeViaApi(input);
        expect(result[0].total_amount).toBe(800);
    });

    it('uses event_venue as fallback for event_location', async () => {
        const input = [{
            id: 'm-6',
            message_type: 'text',
            content: JSON.stringify({
                type: 'booking_request',
                event_venue: 'Grand Ballroom',
            }),
        }];
        const result = await normalizeViaApi(input);
        expect(result[0].event_location).toBe('Grand Ballroom');
    });

    it('prioritizes existing message fields over payload fields', async () => {
        const input = [{
            id: 'm-7',
            message_type: 'text',
            content: JSON.stringify({
                type: 'booking_request',
                gig_title: 'From Payload',
                booking_id: 'payload-booking',
            }),
            gig_title: 'From DB',
            booking_id: 'db-booking',
        }];
        const result = await normalizeViaApi(input);
        expect(result[0].gig_title).toBe('From DB');
        expect(result[0].booking_id).toBe('db-booking');
    });

    it('gracefully handles malformed JSON content (no mutation, no throw)', async () => {
        const input = [{
            id: 'm-8',
            message_type: 'text',
            content: '{not valid json{{',
        }];
        const result = await normalizeViaApi(input);
        expect(result[0].message_type).toBe('text'); // unchanged
        expect(result[0].content).toBe('{not valid json{{');
    });

    it('returns message unchanged when content is falsy', async () => {
        const input = [{
            id: 'm-9',
            message_type: 'text',
            content: null,
        }];
        const result = await normalizeViaApi(input);
        expect(result[0].message_type).toBe('text');
        expect(result[0].content).toBeNull();
    });

    it('extracts customer_note from payload', async () => {
        const input = [{
            id: 'm-10',
            message_type: 'text',
            content: JSON.stringify({
                type: 'booking_request',
                customer_note: 'Please wear formal attire',
            }),
        }];
        const result = await normalizeViaApi(input);
        expect(result[0].customer_note).toBe('Please wear formal attire');
    });
});

// ─── sendFile() ─────────────────────────────────────────────

describe('messageController.sendFile', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Message.getConversationById = jest.fn();
        Message.send = jest.fn();
    });

    it('returns 400 when no file is uploaded', async () => {
        const req = makeReq({ file: null });
        const res = makeRes();

        await controller.sendFile(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'No file uploaded' });
    });

    it('returns 404 when conversation is not found', async () => {
        Message.getConversationById.mockResolvedValue(null);
        const req = makeReq({
            file: { buffer: Buffer.from('test'), originalname: 'file.jpg', mimetype: 'image/jpeg' },
        });
        const res = makeRes();

        await controller.sendFile(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Conversation not found' });
    });

    it('returns 403 when user is not a participant', async () => {
        Message.getConversationById.mockResolvedValue({
            ...BASE_CONVERSATION,
            participant_1: 'stranger-1',
            participant_2: 'stranger-2',
        });
        const req = makeReq({
            user: { id: 'outsider', first_name: 'Nobody' },
            file: { buffer: Buffer.from('test'), originalname: 'file.jpg', mimetype: 'image/jpeg' },
        });
        const res = makeRes();

        await controller.sendFile(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Not a member of this conversation' });
    });
});