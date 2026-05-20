const crypto = require('crypto');

const AGREEMENT_VERSIONS = {
  'v1.0': {
    version: 'v1.0',
    text: `EVENTKRAFT SERVICE BOOKING AGREEMENT

By proceeding with this booking, you ("Customer") agree to the following legally binding terms:

1. ADVANCE PAYMENT OBLIGATION
You are required to pay 30% of the total service fee as an advance payment within 24 hours of this booking being accepted by the service provider. Failure to pay within this window will result in automatic cancellation of this booking.

2. FINAL PAYMENT OBLIGATION
Upon satisfactory completion of the booked service and submission of completion proof by the service provider, you are required to pay the remaining 70% of the total service fee within 48 hours of notification.

3. CONSEQUENCES OF NON-PAYMENT
Failure to pay the final balance within the 48-hour window, without raising a legitimate dispute, constitutes a breach of contract. EventKraft reserves the right to:
(a) Pursue legal action against you for recovery of the owed amount plus associated legal costs.
(b) Share your agreement record (including this timestamp, IP address, and device information) as evidence in legal proceedings.
(c) Permanently restrict your access to the EventKraft platform.

4. DISPUTE PROCESS
You have 24 hours after receiving the completion notification to raise a dispute if you believe the service was not delivered as agreed. Disputes must be raised through the platform's dispute system with supporting evidence. Disputes raised after 24 hours will not be accepted and final payment will remain due.

5. REFUND POLICY
The advance payment is non-refundable if you cancel after the 24-hour window, except in cases where the worker fails to deliver the service, as determined by platform dispute resolution.

6. CONSENT TO RECORD
You consent to this agreement being electronically recorded along with your IP address, browser information, and timestamp as legally admissible evidence.

By clicking "I Agree and Proceed to Payment", you confirm you have read, understood, and agree to all terms above.`.trim(),
  },
};

function getAgreementHash(version) {
  if (!AGREEMENT_VERSIONS[version]) {
    throw new Error(`Unsupported agreement version: ${version}`);
  }
  const text = AGREEMENT_VERSIONS[version].text;
  return crypto.createHash('sha256').update(text).digest('hex');
}

module.exports = { AGREEMENT_VERSIONS, getAgreementHash };
