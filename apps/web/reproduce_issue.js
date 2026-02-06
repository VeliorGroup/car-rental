
async function reproduce() {
    const timestamp = Date.now();
    const loginPayload = {
        email: 'admin@example.com',
        password: 'password123',
        totpCode: ''
    };

    try {
        console.log('Logging in...');
        const loginRes = await fetch('http://localhost:3001/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginPayload)
        });
        
        if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
        const loginData = await loginRes.json();
        const token = loginData.access_token;
        console.log('Login successful.');

        const customerPayload = {
            firstName: 'Debug',
            lastName: 'User',
            email: `debug.${timestamp}@example.com`,
            phone: '+355691234567',
            dateOfBirth: '1990-01-01',
            idCardNumber: `ID_${timestamp}`,
            licenseNumber: `LIC_${timestamp}`,
            licenseExpiry: '2030-01-01',
            country: 'Albania',
            category: 'STANDARD'
        };

        console.log('Creating customer with payload:', customerPayload);
        const createRes = await fetch('http://localhost:3001/api/v1/customers', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(customerPayload)
        });

        if (!createRes.ok) {
            console.error(`Create failed: ${createRes.status}`);
            console.error(await createRes.text());
        } else {
            console.log('Customer created successfully:', await createRes.json());
        }
    } catch (error) {
        console.error('Script error:', error);
    }
}

reproduce();
