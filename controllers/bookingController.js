// ============================================================
// Booking Controller
// ============================================================

const Booking = require('../models/Booking');
const pool = require('../config/db');
const Message = require('../models/Message');
const { createNotification } = require('../utils/notify');

module.exports = {

    async index(req, res) {
        try {
            let bookings;
            if (req.user.role === 'customer') {
                bookings = await Booking.findByCustomer(req.user.id);
            } else {
                bookings = await Booking.findByWorker(req.user.id);
            }
            res.render('pages/bookings', { title: 'My Bookings', layout: 'dashboard', activePage: 'bookings', bookings });
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to load bookings');
            res.redirect('/dashboard');
        }
    },

    async store(req, res) {
        try {
            const { customer_note, event_date, event_location, requirements, ...rest } = req.body;

            // Validate required booking details
            if (!event_date) {
                req.flash('error', 'Please select an event date');
                return res.redirect('back');
            }
            if (!event_location || !event_location.trim()) {
                req.flash('error', 'Please enter the event location');
                return res.redirect('back');
            }

            // Server-side concurrency check
            if (rest.gig_id) {
                const alreadyBooked = await Booking.hasActiveBooking(rest.gig_id, req.user.id);
                if (alreadyBooked) {
                    req.flash('error', 'You already have an active booking for this service. Please cancel it before making a new one.');
                    return res.redirect('back');
                }
            }

            const booking = await Booking.create({
                ...rest,
                customer_id: req.user.id,
                customer_note: customer_note || null,
                event_date,
                event_location: event_location.trim(),
                requirements: (requirements || '').trim() || null,
            });

            // Emit booking card to worker via chat (non-fatal)
            try {
                const gigResult = await pool.query(
                    `SELECT sg.title AS gig_title, gp.title AS package_name
                     FROM service_gigs sg
                     LEFT JOIN gig_packages gp ON gp.id = $1
                     WHERE sg.id = $2`,
                    [booking.package_id, booking.gig_id]
                );
                const gigInfo = gigResult.rows[0] || {};

                const customerResult = await pool.query(
                    'SELECT first_name, last_name FROM profiles WHERE user_id = $1',
                    [req.user.id]
                );
                const cp = customerResult.rows[0] || {};
                const customerName = `${cp.first_name || ''} ${cp.last_name || ''}`.trim();

                const conversation = await Message.getOrCreateConversation(req.user.id, booking.worker_id, booking.id, null);

                await Message.send({
                    conversationId: conversation.id,
                    senderId: req.user.id,
                    receiverId: booking.worker_id,
                    content: JSON.stringify({
                        type: 'booking_request',
                        booking_id: booking.id,
                        gig_title: gigInfo.gig_title || 'Service Booking',
                        package_name: gigInfo.package_name || 'Package',
                        total_price: booking.total_amount,
                        event_date: booking.event_date,
                        event_venue: booking.event_location,
                        customer_note: booking.customer_note || null,
                    }),
                    messageType: 'booking_request',
                });

                const io = req.app.get('io');
                if (io) {
                    io.to(`user_${booking.worker_id}`).emit('booking_request_card', {
                        conversation_id: conversation.id,
                        booking_id: booking.id,
                        customer_id: booking.customer_id,
                        worker_id: booking.worker_id,
                        receiver_id: booking.worker_id,
                        booking_status: booking.status,
                        can_decide: true,
                        gig_title: gigInfo.gig_title || 'Service Booking',
                        package_name: gigInfo.package_name || 'Package',
                        total_price: booking.total_amount,
                        total_amount: booking.total_amount,
                        event_date: booking.event_date,
                        event_venue: booking.event_location,
                        event_location: booking.event_location,
                        customer_note: booking.customer_note || null,
                        customer_name: customerName,
                    });
                }
            } catch (chatErr) {
                console.error('Chat card emit error (non-fatal):', chatErr.message);
            }

            req.flash('success', 'Booking created! The worker will be notified.');
            res.redirect(`/bookings/${booking.id}`);
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to create booking');
            res.redirect('back');
        }
    },

    async show(req, res) {
        try {
            const booking = await Booking.findById(req.params.id);
            if (!booking) return res.status(404).render('pages/404', { title: 'Booking Not Found' });
            res.render('pages/booking-detail', { title: 'Booking Details', layout: 'dashboard', activePage: 'bookings', booking });
        } catch (err) {
            console.error(err);
            res.redirect('/bookings');
        }
    },

    async update(req, res) {
        try {
            await Booking.updateStatus(req.params.id, req.body.status);
            req.flash('success', 'Booking updated');
            res.redirect(`/bookings/${req.params.id}`);
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to update booking');
            res.redirect(`/bookings/${req.params.id}`);
        }
    },

    async accept(req, res) {
        try {
            const booking = await Booking.findById(req.params.id);
            if (!booking) return res.status(404).render('pages/404', { title: 'Booking Not Found' });
            if (booking.worker_id !== req.user.id) {
                req.flash('error', 'Only the assigned worker can accept this booking');
                return res.redirect('/bookings');
            }
            await Booking.accept(req.params.id);
            req.flash('success', 'Booking accepted!');
            res.redirect(`/bookings/${req.params.id}`);
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to accept booking');
            res.redirect(`/bookings/${req.params.id}`);
        }
    },

    async complete(req, res) {
        try {
            const booking = await Booking.findById(req.params.id);
            if (!booking) return res.status(404).render('pages/404', { title: 'Booking Not Found' });
            if (booking.worker_id !== req.user.id) {
                req.flash('error', 'Only the assigned worker can complete this booking');
                return res.redirect('/bookings');
            }
            await Booking.complete(req.params.id);
            req.flash('success', 'Booking marked as completed!');
            res.redirect(`/bookings/${req.params.id}`);
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to complete booking');
            res.redirect(`/bookings/${req.params.id}`);
        }
    },

    async cancel(req, res) {
        try {
            const booking = await Booking.findById(req.params.id);
            if (!booking) return res.status(404).render('pages/404', { title: 'Booking Not Found' });
            if (booking.customer_id !== req.user.id && booking.worker_id !== req.user.id) {
                req.flash('error', 'You are not authorized to cancel this booking');
                return res.redirect('/bookings');
            }
            await Booking.cancel(req.params.id);
            req.flash('success', 'Booking cancelled');
            res.redirect(`/bookings/${req.params.id}`);
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to cancel booking');
            res.redirect(`/bookings/${req.params.id}`);
        }
    },

    async decide(req, res) {
        try {
            const { decision } = req.body;
            if (!['accepted', 'declined'].includes(decision)) {
                return res.status(400).json({ error: 'Invalid booking decision' });
            }

            const booking = await Booking.findById(req.params.id);
            if (!booking) return res.status(404).json({ error: 'Booking not found' });
            if (booking.worker_id !== req.user.id) {
                return res.status(403).json({ error: 'Only the assigned worker can decide this booking' });
            }
            if (booking.status !== 'pending') {
                return res.status(409).json({
                    error: 'This booking has already been decided',
                    status: booking.status,
                });
            }

            const io = req.app.get('io');
            let status;
            let redirect = null;
            let message;
            let updatedBooking;

            if (decision === 'declined') {
                status = 'cancelled';
                updatedBooking = await Booking.updateFieldsIfStatus(booking.id, 'pending', { status });
                if (!updatedBooking) {
                    const latest = await Booking.findById(booking.id);
                    return res.status(409).json({
                        error: 'This booking has already been decided',
                        status: latest ? latest.status : booking.status,
                    });
                }
                message = 'Your booking was declined.';

                await createNotification(pool, io, {
                    userId: booking.customer_id,
                    type: 'booking_declined',
                    title: 'Booking Declined',
                    message: `Your booking for "${booking.gig_title || 'the service'}" was declined by the worker.`,
                    link: `/bookings/${booking.id}`,
                });
            } else {
                status = 'accepted';
                const acceptedAt = new Date();
                const advanceDeadline = new Date(acceptedAt.getTime() + 24 * 60 * 60 * 1000);
                const advanceAmount = parseFloat((Number(booking.total_amount) * 0.30).toFixed(2));
                const finalAmount = parseFloat((Number(booking.total_amount) * 0.70).toFixed(2));

                updatedBooking = await Booking.updateFieldsIfStatus(booking.id, 'pending', {
                    status,
                    accepted_at: acceptedAt,
                    advance_deadline: advanceDeadline,
                    advance_amount: advanceAmount,
                    final_amount: finalAmount,
                });
                if (!updatedBooking) {
                    const latest = await Booking.findById(booking.id);
                    return res.status(409).json({
                        error: 'This booking has already been decided',
                        status: latest ? latest.status : booking.status,
                    });
                }

                redirect = `/bookings/${booking.id}/agreement`;
                message = 'Your booking was accepted. Please review the agreement and pay the advance to confirm.';

                await createNotification(pool, io, {
                    userId: booking.customer_id,
                    type: 'booking_accepted',
                    title: 'Booking Accepted — Action Required',
                    message: `Your booking for "${booking.gig_title || 'the service'}" was accepted. Pay the advance of NPR ${Math.round(advanceAmount).toLocaleString()} within 24 hours to confirm.`,
                    link: redirect,
                });

                try {
                    const { sendBookingAcceptedEmail } = require('../config/mailer');
                    const customerResult = await pool.query('SELECT email FROM users WHERE id = $1', [booking.customer_id]);
                    if (customerResult.rows[0]) {
                        await sendBookingAcceptedEmail(customerResult.rows[0].email, booking, advanceDeadline);
                    }
                } catch (emailErr) {
                    console.error('Booking accepted email error:', emailErr.message);
                }
            }

            const conversation = await Message.getOrCreateConversation(booking.customer_id, booking.worker_id, booking.id, null);
            const updatePayload = {
                booking_id: booking.id,
                conversation_id: conversation.id,
                decision,
                status,
                redirect,
                message,
            };

            if (io) {
                io.to(`conversation_${conversation.id}`).emit('booking_card_decided', updatePayload);
                io.to(`user_${booking.worker_id}`).emit('booking_card_decided', updatePayload);
                io.to(`user_${booking.customer_id}`).emit('booking_card_decided', updatePayload);
                io.to(`user_${booking.customer_id}`).emit('booking_status_update', updatePayload);
            }

            res.json(updatePayload);
        } catch (err) {
            console.error('Booking decision error:', err);
            res.status(500).json({ error: 'Failed to update booking decision' });
        }
    },

    async showAgreement(req, res) {
        try {
            const booking = await Booking.findById(req.params.id);
            if (!booking || booking.customer_id !== req.user.id) return res.redirect('/dashboard');
            if (!['accepted', 'awaiting_agreement'].includes(booking.status)) {
                return res.redirect(`/bookings/${booking.id}`);
            }
            const { AGREEMENT_VERSIONS } = require('../config/agreements');
            res.render('pages/booking-agreement', {
                title: 'Booking Agreement — EventKraft',
                layout: 'dashboard',
                activePage: 'bookings',
                booking,
                agreement: AGREEMENT_VERSIONS['v1.0'],
            });
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to load agreement page');
            res.redirect('/bookings');
        }
    },

    async acceptAgreement(req, res) {
        try {
            const booking = await Booking.findById(req.params.id);
            if (!booking || booking.customer_id !== req.user.id) return res.status(403).send('Forbidden');
            if (!['accepted', 'awaiting_agreement'].includes(booking.status)) {
                return res.redirect(`/bookings/${booking.id}`);
            }

            const { getAgreementHash } = require('../config/agreements');
            const version = 'v1.0';
            const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
            const userAgent = req.headers['user-agent'];

            await pool.query(
                `INSERT INTO booking_agreements
                 (booking_id, user_id, agreement_version, agreement_text_hash, ip_address, user_agent, advance_amount, final_amount, total_amount)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                 ON CONFLICT (booking_id, user_id) DO NOTHING`,
                [
                    booking.id, req.user.id, version, getAgreementHash(version),
                    ip, userAgent,
                    booking.advance_amount || parseFloat((booking.total_amount * 0.30).toFixed(2)),
                    booking.final_amount || parseFloat((booking.total_amount * 0.70).toFixed(2)),
                    booking.total_amount,
                ]
            );

            await Booking.updateFields(booking.id, {
                legal_agreed_at: new Date(),
                legal_agreed_ip: ip,
                legal_agreed_user_agent: userAgent,
                status: 'awaiting_agreement',
            });

            res.redirect(`/bookings/${booking.id}/pay-advance`);
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to record agreement');
            res.redirect(`/bookings/${req.params.id}/agreement`);
        }
    },

    async showAdvancePayment(req, res) {
        try {
            const booking = await Booking.findById(req.params.id);
            if (!booking || booking.customer_id !== req.user.id) return res.redirect('/dashboard');

            if (!booking.legal_agreed_at) {
                return res.redirect(`/bookings/${booking.id}/agreement`);
            }

            if (!['accepted', 'awaiting_agreement'].includes(booking.status)) {
                return res.redirect(`/bookings/${booking.id}`);
            }

            if (booking.advance_deadline && new Date(booking.advance_deadline) < new Date()) {
                await Booking.cancel(booking.id);
                req.flash('error', 'Your advance payment deadline has expired. The booking has been cancelled.');
                return res.redirect('/bookings');
            }

            const { generateTransactionUUID, signEsewaPayload, getEsewaEndpoint } = require('../utils/esewa');

            let uuid = booking.advance_transaction_uuid;
            const advanceAmount = moneyAmount(booking.advance_amount, Number(booking.total_amount) * 0.30);

            if (!uuid) {
                uuid = generateTransactionUUID();
                await Booking.updateFields(booking.id, { advance_transaction_uuid: uuid });
            }

            const productCode = process.env.ESEWA_MERCHANT_CODE;
            if (!productCode) {
                req.flash('error', 'eSewa merchant code is not configured.');
                return res.redirect(`/bookings/${booking.id}`);
            }
            if (!process.env.ESEWA_SECRET_KEY) {
                req.flash('error', 'eSewa secret key is not configured.');
                return res.redirect(`/bookings/${booking.id}`);
            }

            const esewaPayload = {
                amount: formatMoney(advanceAmount),
                tax_amount: '0',
                total_amount: formatMoney(advanceAmount),
                transaction_uuid: uuid,
                product_code: productCode,
                product_service_charge: '0',
                product_delivery_charge: '0',
                success_url: `${req.protocol}://${req.get('host')}/bookings/${booking.id}/payment/advance/success`,
                failure_url: `${req.protocol}://${req.get('host')}/bookings/${booking.id}/payment/advance/failure`,
                signed_field_names: 'total_amount,transaction_uuid,product_code',
                signature: signEsewaPayload(formatMoney(advanceAmount), uuid, productCode),
            };

            const esewaEndpoint = getEsewaEndpoint();

            res.render('pages/booking-pay-advance', {
                title: 'Pay Advance — EventKraft',
                layout: 'dashboard',
                activePage: 'bookings',
                booking,
                esewaEndpoint,
                esewaPayload,
            });
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to load payment page');
            res.redirect('/bookings');
        }
    },

    async handleAdvanceSuccess(req, res) {
        try {
            const booking = await Booking.findById(req.params.id);
            if (!booking) {
                req.flash('error', 'Booking not found');
                return res.redirect('/dashboard');
            }

            const Transaction = require('../models/Transaction');
            const existingTxns = await Transaction.findByBooking(booking.id);
            const hasAdvancePayment = existingTxns.some(
                t => t.type === 'advance_payment' && t.status === 'completed'
            );
            if (hasAdvancePayment) {
                req.flash('success', 'Advance payment already processed.');
                return res.redirect(`/bookings/${booking.id}`);
            }

            const { verifyEsewaPayment } = require('../utils/esewa');
            const encodedData = req.query.data;
            if (!encodedData) {
                req.flash('error', 'No payment data received from eSewa');
                return res.redirect(`/bookings/${booking.id}/pay-advance`);
            }

            const decoded = JSON.parse(Buffer.from(encodedData, 'base64').toString('utf-8'));

            const verified = await verifyEsewaPayment(
                booking.advance_transaction_uuid,
                formatMoney(moneyAmount(booking.advance_amount, Number(booking.total_amount) * 0.30))
            );

            if (!verified) {
                req.flash('error', 'Payment verification failed. Please try again.');
                return res.redirect(`/bookings/${booking.id}/pay-advance`);
            }

            const payerId = booking.customer_id || req.user.id;

            await Booking.updateFields(booking.id, {
                status: 'paid_advance',
                advance_esewa_ref_id: decoded.ref_id || verified.ref_id || null,
                advance_paid_at: new Date(),
            });

            const advanceAmount = moneyAmount(booking.advance_amount, Number(booking.total_amount) * 0.30);
            await Transaction.create({
                booking_id: booking.id,
                payer_id: payerId,
                payee_id: booking.worker_id,
                amount: advanceAmount,
                commission: 0,
                net_amount: advanceAmount,
                type: 'advance_payment',
                status: 'completed',
                payment_method: 'esewa',
            });

            const io = req.app.get('io');
            await createNotification(pool, io, {
                userId: booking.worker_id,
                type: 'advance_received',
                title: 'Advance Payment Received',
                message: `Advance payment of NPR ${Number(advanceAmount).toLocaleString('en-IN')} has been received for booking #${booking.id}.`,
                link: `/bookings/${booking.id}`,
            });

            req.flash('success', 'Advance payment successful!');
            res.redirect(`/bookings/${booking.id}`);
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to process advance payment');
            res.redirect(`/bookings/${req.params.id}/pay-advance`);
        }
    },

    async handleAdvanceFailure(req, res) {
        req.flash('error', 'Payment failed or was cancelled');
        res.redirect(`/bookings/${req.params.id}/pay-advance`);
    },

    // ─── PHASE 7: Worker Completion ─────────────────────────

    async submitCompletion(req, res) {
        try {
            const booking = await Booking.findById(req.params.id);
            if (!booking || booking.worker_id !== req.user.id) return res.status(403).send('Forbidden');
            if (booking.status !== 'paid_advance') {
                req.flash('error', 'Cannot submit completion at this stage.');
                return res.redirect(`/bookings/${booking.id}`);
            }

            const cloudinary = require('../config/cloudinary');
            const proofUrls = [];
            for (const file of (req.files || [])) {
                const result = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { folder: `eventkraft/proof/${booking.id}` },
                        (err, result) => err ? reject(err) : resolve(result)
                    );
                    stream.end(file.buffer);
                });
                proofUrls.push({ url: result.secure_url, public_id: result.public_id });
            }

            const completedAt = new Date();
            const disputeWindowExpires = new Date(completedAt.getTime() + 24 * 60 * 60 * 1000);
            const finalDeadline = new Date(completedAt.getTime() + 48 * 60 * 60 * 1000);

            await Booking.updateFields(booking.id, {
                status: 'work_done',
                completion_proof: JSON.stringify(proofUrls),
                completion_note: req.body.completion_note || '',
                completed_at: completedAt,
                dispute_window_expires_at: disputeWindowExpires,
                final_deadline: finalDeadline,
            });

            const io = req.app.get('io');
            await createNotification(pool, io, {
                userId: booking.customer_id,
                type: 'work_completed',
                title: 'Work Completed — Payment Due',
                message: `Your service "${booking.gig_title || 'booking'}" has been completed. Pay the remaining amount within 48 hours. You have 24 hours to raise a dispute.`,
                link: `/bookings/${booking.id}/pay-final`,
            });

            req.flash('success', 'Completion submitted. The customer has been notified.');
            res.redirect(`/bookings/${booking.id}`);
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to submit completion');
            res.redirect(`/bookings/${req.params.id}`);
        }
    },

    // ─── PHASE 8: Final Payment + Dispute ───────────────────

    async showFinalPayment(req, res) {
        try {
            const booking = await Booking.findById(req.params.id);
            if (!booking || booking.customer_id !== req.user.id) return res.redirect('/dashboard');
            if (booking.status !== 'work_done') return res.redirect(`/bookings/${booking.id}`);

            // Check if final deadline expired
            if (booking.final_deadline && new Date() > new Date(booking.final_deadline) && !booking.final_paid_at) {
                await Booking.updateFields(booking.id, { status: 'overdue_final', overdue_flagged_at: new Date() });
                req.flash('error', 'Final payment deadline has passed.');
                return res.redirect(`/bookings/${booking.id}`);
            }

            const disputeWindowOpen = booking.dispute_window_expires_at && new Date() < new Date(booking.dispute_window_expires_at);

            const { generateTransactionUUID, signEsewaPayload, getEsewaEndpoint } = require('../utils/esewa');
            let transactionUuid = booking.final_transaction_uuid;
            const finalAmount = parseFloat(booking.final_amount || (booking.total_amount * 0.70)).toFixed(2);
            const productCode = process.env.ESEWA_MERCHANT_CODE;
            if (!transactionUuid) {
                transactionUuid = generateTransactionUUID();
                await Booking.updateFields(booking.id, { final_transaction_uuid: transactionUuid });
            }
            const signature = signEsewaPayload(finalAmount, transactionUuid, productCode);

            const proof = safeJsonArray(booking.completion_proof);

            res.render('pages/booking-pay-final', {
                title: 'Pay Final Balance — EventKraft',
                layout: 'dashboard',
                activePage: 'bookings',
                booking,
                proof,
                disputeWindowOpen,
                esewaEndpoint: getEsewaEndpoint(),
                esewaPayload: {
                    amount: finalAmount,
                    tax_amount: '0',
                    total_amount: finalAmount,
                    transaction_uuid: transactionUuid,
                    product_code: productCode,
                    product_service_charge: '0',
                    product_delivery_charge: '0',
                    success_url: `${process.env.APP_URL}/bookings/${booking.id}/payment/final/success`,
                    failure_url: `${process.env.APP_URL}/bookings/${booking.id}/payment/final/failure`,
                    signed_field_names: 'total_amount,transaction_uuid,product_code',
                    signature,
                },
            });
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to load payment page');
            res.redirect('/bookings');
        }
    },

    async handleFinalSuccess(req, res) {
        try {
            const booking = await Booking.findById(req.params.id);
            if (!booking) return res.redirect('/dashboard');

            if (booking.final_paid_at || booking.status === 'paid_final') {
                req.flash('success', 'Final payment already processed.');
                return res.redirect(`/bookings/${booking.id}`);
            }

            const Transaction = require('../models/Transaction');
            const existingTxns = await Transaction.findByBooking(booking.id);
            const hasFinalPayment = existingTxns.some(
                t => t.type === 'final_payment' && t.status === 'completed'
            );
            if (hasFinalPayment) {
                req.flash('success', 'Final payment already processed.');
                return res.redirect(`/bookings/${booking.id}`);
            }

            const rawData = req.query.data;
            let esewaData = {};
            if (rawData) {
                try { esewaData = JSON.parse(Buffer.from(rawData, 'base64').toString('utf8')); } catch (e) {}
            }

            const { verifyEsewaPayment } = require('../utils/esewa');
            const finalAmount = formatMoney(moneyAmount(booking.final_amount, Number(booking.total_amount) * 0.70));
            const verified = await verifyEsewaPayment(booking.final_transaction_uuid, finalAmount);

            if (!verified) {
                req.flash('error', 'Payment could not be verified. Please contact support.');
                return res.redirect(`/bookings/${booking.id}/pay-final`);
            }

            try {
                await processCommissionAndPayout(booking, pool, req.app.get('io'));
            } catch (settlementErr) {
                await Booking.updateFields(booking.id, { status: 'payment_settlement_failed' });
                throw settlementErr;
            }

            await Booking.updateFields(booking.id, {
                status: 'paid_final',
                final_esewa_ref_id: esewaData.transaction_code || esewaData.ref_id || 'verified',
                final_paid_at: new Date(),
            });

            req.flash('success', 'Final payment successful! The booking is now complete.');
            res.redirect(`/bookings/${booking.id}`);
        } catch (err) {
            console.error(err);
            req.flash('error', 'Payment processing failed. Please contact support.');
            res.redirect('/bookings');
        }
    },

    async handleFinalFailure(req, res) {
        req.flash('error', 'Payment failed or was cancelled. Please try again.');
        res.redirect(`/bookings/${req.params.id}/pay-final`);
    },

    async raiseDispute(req, res) {
        try {
            const booking = await Booking.findById(req.params.id);
            if (!booking || booking.customer_id !== req.user.id) return res.status(403).send('Forbidden');

            if (!booking.dispute_window_expires_at || new Date() > new Date(booking.dispute_window_expires_at)) {
                req.flash('error', 'Dispute window has closed. Final payment is now due.');
                return res.redirect(`/bookings/${booking.id}/pay-final`);
            }

            await Booking.updateFields(booking.id, {
                status: 'dispute_raised',
                dispute_raised_at: new Date(),
            });

            const Dispute = require('../models/Dispute');
            await Dispute.create({
                booking_id: booking.id,
                raised_by: req.user.id,
                reason: req.body.reason || 'No reason provided',
                evidence: [],
            });

            const io = req.app.get('io');
            await createNotification(pool, io, {
                userId: booking.worker_id,
                type: 'dispute_raised',
                title: 'Dispute Raised',
                message: `A dispute has been raised for booking "${booking.gig_title || 'your booking'}". An admin will review.`,
                link: `/bookings/${booking.id}`,
            });

            req.flash('info', 'Dispute raised. An admin will review within 48 hours.');
            res.redirect(`/bookings/${booking.id}`);
        } catch (err) {
            console.error(err);
            req.flash('error', 'Failed to raise dispute');
            res.redirect(`/bookings/${req.params.id}`);
        }
    },
};

// ─── Commission & Payout Helper ─────────────────────────────
async function processCommissionAndPayout(booking, pool, io) {
    const CommissionSetting = require('../models/CommissionSetting');
    const Transaction = require('../models/Transaction');
    const { createNotification } = require('../utils/notify');

    const commissionRate = await CommissionSetting.getRateForAmount(booking.total_amount);
    const commissionAmount = parseFloat((booking.total_amount * commissionRate / 100).toFixed(2));
    const finalAmount = parseFloat(booking.final_amount || (booking.total_amount * 0.70).toFixed(2));
    const finalNetToWorker = parseFloat((finalAmount - commissionAmount).toFixed(2));

    await Transaction.create({
        booking_id: booking.id,
        payer_id: booking.customer_id,
        payee_id: booking.worker_id,
        amount: finalAmount,
        commission: commissionAmount,
        net_amount: finalNetToWorker,
        type: 'final_payment',
        status: 'completed',
        payment_method: 'esewa',
    });

    await createNotification(pool, io, {
        userId: booking.worker_id,
        type: 'payout_pending',
        title: 'Final Payment Received',
        message: `Final payment for "${booking.gig_title || 'booking'}" received. NPR ${Math.round(finalNetToWorker).toLocaleString()} (after ${commissionRate}% commission) will be transferred.`,
        link: '/earnings',
    });
}

function moneyAmount(value, fallback) {
    const numberValue = Number(value ?? fallback);
    return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatMoney(value) {
    return moneyAmount(value, 0).toFixed(2);
}

function safeJsonArray(value) {
    if (Array.isArray(value)) return value;
    try {
        const parsed = typeof value === 'string' ? JSON.parse(value || '[]') : (value || []);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        return [];
    }
}
