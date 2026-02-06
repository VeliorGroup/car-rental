
const axios = require('axios');

async function testBooking() {
  const payload = {
    customerId: "cmj45byx20005uawztglb3lby",
    vehicleId: "cmj4mks3g0001wdojfnet6lyw",
    startDate: "2024-12-20T10:00:00.000Z",
    endDate: "2024-12-25T10:00:00.000Z",
    depositAmount: "0",
    cautionAmount: 0,
    dailyPrice: 50,
    totalPrice: 250
  };

  try {
    // We need to login first to get a token, but for now let's assume we might hit a guard.
    // Actually, I'll bypass auth or check if I can grab a token.
    // Since I don't have a token handy, I'll rely on the backend logs or try to login via script first.
    // Let's try to login as admin first.
    
    const loginRes = await axios.post('http://localhost:3001/api/v1/auth/login', {
     email: 'admin@example.com',
     password: 'password123'
    });
    console.log('Login Response:', JSON.stringify(loginRes.data, null, 2)); // Log full response
    
    const token = loginRes.data.access_token; // Correct key
    console.log('Got token:', token ? 'Yes' : 'No');

    const res = await axios.post('http://localhost:3001/api/v1/bookings', payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Booking created successfully:', res.data);
  } catch (error) {
    console.error('Error creating booking:', error.response ? error.response.data : error.message);
  }
}

testBooking();
