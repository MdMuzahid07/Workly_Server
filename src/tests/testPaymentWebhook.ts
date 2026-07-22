import axios from 'axios';

const BASE_URL = 'http://localhost:4000/api/v1';

async function testPaymentWebhook() {
  try {
    console.log('--- Section 6: Payment Webhook Integration Test ---\n');

    const testCases = [
      { tranId: `TEST-TRAN-${Date.now()}-1`, planId: 'emp_starter' },
      { tranId: `TEST-TRAN-${Date.now()}-2`, planId: 'emp_business' },
    ];

    for (const test of testCases) {
      console.log(`\nTesting IPN Callback for Plan Code: ${test.planId}`);

      const payload = {
        status: 'VALID',
        tran_id: test.tranId,
        val_id: 'VALIDATION-ID-12345',
        amount: '15000',
        card_type: 'VISA-Dutch Bangla',
        store_amount: '14500',
        currency: 'BDT',
        bank_tran_id: 'BANK-TRAN-123456',
        tran_date: new Date().toISOString(),
        // Extra payload properties to simulate SSLCommerz
        value_a: 'TEST_COMPANY_ID',
        value_b: test.planId,
        value_c: 'EMPLOYER_PLAN',
      };

      // In real scenario we'd create a pending transaction first to simulate the DB state before IPN.
      // Assuming the backend has a way to handle IPN if we seed the transaction, or we test the endpoint directly.
      console.log(`Sending IPN Payload for ${test.planId}...`);

      const res = await axios.post(`${BASE_URL}/payments/ipn`, payload, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        validateStatus: () => true,
      });

      console.log(`Status Code: ${res.status}`);
      if (res.status === 302 || res.status === 200) {
        console.log(`✅ IPN Endpoint Responded Successfully.`);
      } else {
        console.log(`❌ IPN Endpoint Failed: ${JSON.stringify(res.data)}`);
      }
    }
  } catch (err: any) {
    console.error('Error during webhook testing:', err.message);
  }
}

testPaymentWebhook();
