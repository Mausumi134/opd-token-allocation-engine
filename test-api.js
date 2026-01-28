// Simple API Test Script
const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test the API
async function testAPI() {
  console.log('🧪 Testing OPD Token Allocation Engine API\n');

  try {
    // 1. Health Check
    console.log('1. Health Check...');
    const health = await makeRequest('GET', '/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   Response: ${health.data.message}\n`);

    // 2. Add Doctors
    console.log('2. Adding Doctors...');
    const doctors = [
      {
        id: 'DOC001',
        name: 'Dr. Sarah Johnson',
        specialization: 'General Medicine',
        workingHours: { start: '09:00', end: '17:00' }
      },
      {
        id: 'DOC002',
        name: 'Dr. Michael Chen',
        specialization: 'Cardiology',
        workingHours: { start: '10:00', end: '16:00' }
      }
    ];

    for (const doctor of doctors) {
      const result = await makeRequest('POST', '/api/doctors', doctor);
      console.log(`   Added: ${doctor.name} - Status: ${result.status}`);
    }
    console.log();

    // 3. Get All Doctors
    console.log('3. Getting All Doctors...');
    const allDoctors = await makeRequest('GET', '/api/doctors');
    console.log(`   Found ${allDoctors.data.doctors.length} doctors`);
    allDoctors.data.doctors.forEach(doc => {
      console.log(`   - ${doc.name} (${doc.specialization})`);
    });
    console.log();

    // 4. Allocate Tokens
    console.log('4. Allocating Tokens...');
    const tokenRequests = [
      { patientId: 'P001', doctorId: 'DOC001', preferredTime: '10:00', source: 'online' },
      { patientId: 'P002', doctorId: 'DOC001', preferredTime: '10:00', source: 'priority' },
      { patientId: 'P003', doctorId: 'DOC002', preferredTime: '11:00', source: 'walkin' }
    ];

    const allocatedTokens = [];
    for (const request of tokenRequests) {
      const result = await makeRequest('POST', '/api/tokens/allocate', request);
      console.log(`   Patient ${request.patientId}: ${result.data.message}`);
      if (result.data.token) {
        allocatedTokens.push(result.data.token);
      }
    }
    console.log();

    // 5. Insert Emergency Token
    console.log('5. Inserting Emergency Token...');
    const emergency = await makeRequest('POST', '/api/tokens/emergency', {
      patientId: 'P004',
      doctorId: 'DOC001',
      urgentTime: '10:00'
    });
    console.log(`   Emergency: ${emergency.data.message}\n`);

    // 6. Get Doctor Schedule
    console.log('6. Getting Doctor Schedules...');
    for (const doctorId of ['DOC001', 'DOC002']) {
      const schedule = await makeRequest('GET', `/api/doctors/${doctorId}/schedule`);
      if (schedule.data.schedule) {
        console.log(`   ${schedule.data.schedule.doctor.name}:`);
        schedule.data.schedule.schedule.forEach(slot => {
          if (slot.allocated > 0) {
            console.log(`     ${slot.time}: ${slot.allocated}/${slot.capacity} patients`);
            slot.tokens.forEach(token => {
              console.log(`       - Patient ${token.patientId} (${token.source}, priority: ${token.priority})`);
            });
          }
        });
      }
    }
    console.log();

    // 7. Cancel a Token
    if (allocatedTokens.length > 0) {
      console.log('7. Cancelling a Token...');
      const tokenToCancel = allocatedTokens[0];
      const cancel = await makeRequest('DELETE', `/api/tokens/${tokenToCancel.id}`);
      console.log(`   Cancelled token ${tokenToCancel.id}: ${cancel.data.message}\n`);
    }

    // 8. Get System Stats
    console.log('8. System Statistics...');
    const stats = await makeRequest('GET', '/api/stats');
    console.log('   System Stats:');
    Object.entries(stats.data.stats).forEach(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`     ${label}: ${value}`);
    });
    console.log();

    // 9. Get Token Sources
    console.log('9. Available Token Sources...');
    const sources = await makeRequest('GET', '/api/token-sources');
    console.log('   Token Sources:');
    Object.entries(sources.data.sources).forEach(([key, source]) => {
      console.log(`     ${source.name}: Priority ${source.priority}`);
    });

    console.log('\n✅ API Test Completed Successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAPI();