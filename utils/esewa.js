const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

function generateTransactionUUID() {
  return `EK-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
}

function signEsewaPayload(totalAmount, transactionUuid, productCode) {
  const secretKey = process.env.ESEWA_SECRET_KEY;
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
}

function getEsewaEndpoint() {
  return process.env.ESEWA_ENV === 'live'
    ? 'https://epay.esewa.com.np/api/epay/main/v2/form'
    : 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
}

async function verifyEsewaPayment(transactionUuid, totalAmount) {
  const productCode = process.env.ESEWA_MERCHANT_CODE;
  const baseUrl = process.env.ESEWA_ENV === 'live'
    ? 'https://epay.esewa.com.np/api/epay/transaction/status/'
    : 'https://rc.esewa.com.np/api/epay/transaction/status/';

  const url = `${baseUrl}?product_code=${productCode}&total_amount=${totalAmount}&transaction_uuid=${transactionUuid}`;

  const response = await fetch(url);
  const data = await response.json();
  return data.status === 'COMPLETE' ? data : null;
}

module.exports = { generateTransactionUUID, signEsewaPayload, getEsewaEndpoint, verifyEsewaPayment };
