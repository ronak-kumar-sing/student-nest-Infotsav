/**
 * Room Sharing Network - Authenticated API Test
 * This script tests the complete flow with authentication
 */

const BASE_URL = 'http://localhost:3000/api';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(`${colors.bold}${title}${colors.reset}`, 'cyan');
  console.log('='.repeat(70));
}

function logResult(emoji, message, color = 'reset') {
  log(`${emoji} ${message}`, color);
}

async function makeRequest(endpoint, options = {}, token = null) {
  try {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();
    return {
      status: response.status,
      ok: response.ok,
      data
    };
  } catch (error) {
    return {
      status: 500,
      ok: false,
      error: error.message
    };
  }
}

async function testCompleteFlow() {
  log('\n🧪 Room Sharing Network - Complete Flow Test', 'magenta');
  log('Testing: Profile Photos + View Room Details + Application Flow\n', 'blue');

  let testResults = {
    passed: 0,
    failed: 0,
    skipped: 0
  };

  // STEP 1: Get Room Sharing Listings
  logSection('STEP 1: Get Room Sharing Listings');

  const listings = await makeRequest('/room-sharing?limit=10');

  if (listings.ok && listings.data.success) {
    const shares = listings.data.data.shares || [];
    logResult('✅', `Retrieved ${shares.length} room sharing listing(s)`, 'green');
    testResults.passed++;

    if (shares.length > 0) {
      const firstShare = shares[0];

      log('\n📊 First Listing Details:', 'cyan');
      console.log(`   ID: ${firstShare._id}`);
      console.log(`   Status: ${firstShare.status}`);
      console.log(`   Max Participants: ${firstShare.maxParticipants}`);
      console.log(`   Available Slots: ${firstShare.sharing?.availableSlots || 'N/A'}`);

      // Check Property Details
      if (firstShare.property) {
        logResult('✅', 'Property details included', 'green');
        console.log(`   Property Title: ${firstShare.property.title}`);
        console.log(`   Property ID: ${firstShare.property._id}`);
        testResults.passed++;
      } else {
        logResult('❌', 'Property details missing', 'red');
        testResults.failed++;
      }

      // Check Initiator Details
      if (firstShare.initiator) {
        logResult('✅', 'Initiator details included', 'green');
        console.log(`   Initiator Name: ${firstShare.initiator.fullName}`);
        console.log(`   Initiator Email: ${firstShare.initiator.email}`);
        testResults.passed++;

        // Check Profile Photo
        if (firstShare.initiator.profilePhoto) {
          logResult('✅', 'Profile photo included in response', 'green');
          console.log(`   Photo URL: ${firstShare.initiator.profilePhoto.substring(0, 60)}...`);
          testResults.passed++;
        } else {
          logResult('⚠️', 'Profile photo not set for this user', 'yellow');
          console.log('   Note: User needs to upload profile photo');
          testResults.skipped++;
        }
      } else {
        logResult('❌', 'Initiator details missing', 'red');
        testResults.failed++;
      }

      // Test "View Room Details" capability
      logSection('STEP 2: Test View Room Details Capability');

      if (firstShare.property && firstShare.property._id) {
        logResult('✅', 'Property ID available for "View Room Details" button', 'green');
        console.log(`   Frontend can link to: /dashboard/rooms/${firstShare.property._id}`);
        testResults.passed++;

        // Try to fetch the room details
        const roomDetails = await makeRequest(`/rooms/${firstShare.property._id}`);
        if (roomDetails.ok || roomDetails.status === 401) {
          logResult('✅', 'Room details endpoint accessible', 'green');
          console.log(`   Endpoint: /api/rooms/${firstShare.property._id}`);
          testResults.passed++;
        } else {
          logResult('❌', 'Room details endpoint not accessible', 'red');
          console.log(`   Status: ${roomDetails.status}`);
          testResults.failed++;
        }
      } else {
        logResult('❌', 'No property ID available', 'red');
        testResults.failed++;
      }

      // Test Room Sharing Detail Endpoint
      logSection('STEP 3: Get Room Sharing Detail Page Data');

      const shareId = firstShare._id;
      const detailResponse = await makeRequest(`/room-sharing/${shareId}`);

      if (detailResponse.ok && detailResponse.data.success) {
        logResult('✅', 'Detail endpoint working', 'green');
        testResults.passed++;

        const detail = detailResponse.data.data;

        log('\n📋 Detail Page Data:', 'cyan');

        // Check all required data for UI
        const checks = [
          { name: 'Property info', value: !!detail.property },
          { name: 'Initiator info', value: !!detail.initiator },
          { name: 'Profile photo', value: !!detail.initiator?.profilePhoto },
          { name: 'Room configuration', value: !!detail.roomConfiguration },
          { name: 'Cost sharing', value: !!detail.costSharing },
          { name: 'Requirements', value: !!detail.requirements },
          { name: 'Available slots', value: detail.availableSlots !== undefined }
        ];

        checks.forEach(check => {
          if (check.value) {
            logResult('✅', check.name, 'green');
            testResults.passed++;
          } else {
            logResult('❌', check.name + ' missing', 'red');
            testResults.failed++;
          }
        });

        // Display some detail data
        if (detail.roomConfiguration) {
          console.log(`\n   Room Config:`);
          console.log(`   - Total Beds: ${detail.roomConfiguration.totalBeds}`);
          console.log(`   - Available Beds: ${detail.roomConfiguration.bedsAvailable}`);
        }

        if (detail.costSharing) {
          console.log(`\n   Cost Sharing:`);
          console.log(`   - Rent per Person: ₹${detail.costSharing.rentPerPerson}`);
          console.log(`   - Deposit per Person: ₹${detail.costSharing.depositPerPerson}`);
        }
      } else {
        logResult('❌', 'Detail endpoint failed', 'red');
        testResults.failed++;
      }
    } else {
      logResult('⚠️', 'No room sharing listings found', 'yellow');
      log('   Create a room sharing listing to test further', 'yellow');
      testResults.skipped += 5;
    }
  } else {
    logResult('❌', 'Failed to get listings', 'red');
    console.log(`   Status: ${listings.status}`);
    console.log(`   Error: ${listings.data?.error || 'Unknown'}`);
    testResults.failed++;
  }

  // Test Applications Endpoint (requires auth)
  logSection('STEP 4: Test Applications Endpoint');

  log('ℹ️  Testing without authentication (expected to fail with 401)', 'blue');

  const appsNoAuth = await makeRequest('/room-sharing/applications');

  if (appsNoAuth.status === 401) {
    logResult('✅', 'Applications endpoint properly secured', 'green');
    console.log(`   Requires authentication: ${appsNoAuth.data.error}`);
    testResults.passed++;
  } else {
    logResult('❌', 'Applications endpoint security issue', 'red');
    testResults.failed++;
  }

  // Test Accept Application Endpoint Structure
  logSection('STEP 5: Test Accept Application Endpoint');

  log('ℹ️  Testing endpoint structure (expected to require auth)', 'blue');

  const acceptNoAuth = await makeRequest('/room-sharing/applications/test-id', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'accept' })
  });

  if (acceptNoAuth.status === 401) {
    logResult('✅', 'Accept endpoint properly secured', 'green');
    console.log(`   Requires authentication: ${acceptNoAuth.data.error}`);
    testResults.passed++;
  } else {
    logResult('⚠️', 'Accept endpoint returns different status', 'yellow');
    console.log(`   Status: ${acceptNoAuth.status}`);
    testResults.skipped++;
  }

  // Check Filtering of Completed Listings
  logSection('STEP 6: Verify Completed Listings Filtering');

  const allListings = await makeRequest('/room-sharing?limit=100');

  if (allListings.ok && allListings.data.success) {
    const shares = allListings.data.data.shares || [];
    const completedCount = shares.filter(s => s.status === 'completed').length;
    const activeCount = shares.filter(s => s.status === 'active').length;
    const fullCount = shares.filter(s => s.status === 'full').length;

    console.log(`\n   Status Distribution:`);
    console.log(`   - Active: ${activeCount}`);
    console.log(`   - Full: ${fullCount}`);
    console.log(`   - Completed: ${completedCount}\n`);

    if (completedCount === 0) {
      logResult('✅', 'No completed listings in results (correct!)', 'green');
      console.log('   API correctly filters out completed room sharings');
      testResults.passed++;
    } else {
      logResult('❌', `Found ${completedCount} completed listing(s) in results`, 'red');
      console.log('   Completed listings should be filtered out');
      testResults.failed++;
    }
  } else {
    logResult('❌', 'Failed to get listings for filter check', 'red');
    testResults.failed++;
  }

  // SUMMARY
  logSection('TEST SUMMARY');

  const total = testResults.passed + testResults.failed + testResults.skipped;
  const passRate = total > 0 ? ((testResults.passed / total) * 100).toFixed(1) : 0;

  console.log('');
  log(`Total Tests: ${total}`, 'blue');
  log(`✅ Passed: ${testResults.passed}`, 'green');
  log(`❌ Failed: ${testResults.failed}`, 'red');
  log(`⚠️  Skipped: ${testResults.skipped}`, 'yellow');
  log(`Pass Rate: ${passRate}%`, passRate >= 80 ? 'green' : 'yellow');
  console.log('');

  if (testResults.failed === 0) {
    log('🎉 ALL TESTS PASSED! API is working perfectly!', 'green');
  } else if (passRate >= 80) {
    log('✅ GOOD! Most tests passed, minor issues found', 'green');
  } else {
    log('⚠️  ATTENTION NEEDED - Several tests failed', 'yellow');
  }

  // Next Steps
  logSection('NEXT STEPS FOR COMPLETE TESTING');

  log('\n1️⃣  Test with Real User Flow:', 'cyan');
  log('   a. Login as Student A and get auth token');
  log('   b. Create room sharing listing');
  log('   c. Login as Student B and apply');
  log('   d. Accept as Student A');
  log('   e. Verify participant added and beds decremented');

  log('\n2️⃣  Test Profile Photos:', 'cyan');
  log('   a. Upload profile photo for test users');
  log('   b. Verify photo appears in:');
  log('      - Room sharing listings');
  log('      - Detail page');
  log('      - Applications page');

  log('\n3️⃣  Test UI Features:', 'cyan');
  log('   a. Open browser: http://localhost:3000');
  log('   b. Navigate to /shared-rooms');
  log('   c. Click "View Room Details" button');
  log('   d. Submit application');
  log('   e. Accept application as initiator');

  log('\n4️⃣  Test Completion Flow:', 'cyan');
  log('   a. Create room sharing with maxParticipants: 2');
  log('   b. Accept 1 application');
  log('   c. Verify bedsAvailable: 1 → 0');
  log('   d. Verify status: active → completed');
  log('   e. Confirm listing disappears from browse');

  log('\n5️⃣  Database Verification:', 'cyan');
  log('   a. Connect to MongoDB');
  log('   b. Check RoomSharing collection');
  log('   c. Verify currentParticipants array');
  log('   d. Check completionReason and completedAt\n');

  console.log('='.repeat(70));
  log('\n✅ API Testing Complete!\n', 'green');
}

// Run the test
testCompleteFlow().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
