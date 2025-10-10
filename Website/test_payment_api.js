// Payment API Test Script
const API_BASE = 'http://localhost:3000/api';

// Test data
const testBookingId = '507f1f77bcf86cd799439011'; // Mock booking ID
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Mock JWT token

async function testPaymentAPI() {
  console.log('🧪 TESTING PAYMENT SYSTEM APIs...\n');

  // Test 1: Online Payment Processing
  console.log('1️⃣ Testing Online Payment (POST /api/bookings/[id]/payment)');
  try {
    const onlinePaymentResponse = await fetch(`${API_BASE}/bookings/${testBookingId}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify({
        paymentMethod: 'online',
        paymentDetails: {
          transactionId: 'TEST_TXN_' + Date.now(),
          method: 'UPI'
        }
      })
    });

    const onlineResult = await onlinePaymentResponse.json();
    console.log('✅ Online Payment Response:', onlineResult);
  } catch (error) {
    console.log('❌ Online Payment Error:', error.message);
  }

  console.log('\n');

  // Test 2: Offline Payment Request
  console.log('2️⃣ Testing Offline Payment Request');
  try {
    const offlinePaymentResponse = await fetch(`${API_BASE}/bookings/${testBookingId}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify({
        paymentMethod: 'offline'
      })
    });

    const offlineResult = await offlinePaymentResponse.json();
    console.log('✅ Offline Payment Response:', offlineResult);
  } catch (error) {
    console.log('❌ Offline Payment Error:', error.message);
  }

  console.log('\n');

  // Test 3: Owner Payment Confirmation
  console.log('3️⃣ Testing Owner Payment Confirmation (PATCH)');
  try {
    const confirmationResponse = await fetch(`${API_BASE}/bookings/${testBookingId}/payment`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      }
    });

    const confirmResult = await confirmationResponse.json();
    console.log('✅ Payment Confirmation Response:', confirmResult);
  } catch (error) {
    console.log('❌ Payment Confirmation Error:', error.message);
  }

  console.log('\n');

  // Test 4: Check API Endpoint Availability
  console.log('4️⃣ Testing API Endpoint Availability');
  try {
    const healthResponse = await fetch(`${API_BASE}/health`);
    console.log('Server Status:', healthResponse.status);
  } catch (error) {
    console.log('Server connection:', error.message);
  }
}

// Run tests
testPaymentAPI().then(() => {
  console.log('\n🎯 Payment API testing completed!');
  console.log('Check the responses above to verify functionality.');
}).catch(console.error);