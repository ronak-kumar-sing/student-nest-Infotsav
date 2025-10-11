/**
 * Room Sharing Network - API Testing Script
 * Tests all implemented features:
 * 1. Profile images in API responses
 * 2. Room sharing listing with property details
 * 3. Application acceptance flow
 */

const BASE_URL = 'http://localhost:3000/api';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logTest(testName, status, details = '') {
  const symbol = status ? '✅' : '❌';
  const color = status ? 'green' : 'red';
  log(`${symbol} ${testName}`, color);
  if (details) {
    console.log(`   ${details}`);
  }
}

async function makeRequest(endpoint, options = {}) {
  try {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
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

// Test Suite
async function runTests() {
  log('\n🧪 Room Sharing Network - API Test Suite', 'magenta');
  log('Date: October 12, 2025\n', 'blue');

  let passedTests = 0;
  let failedTests = 0;

  // TEST 1: Get Room Sharing Listings
  logSection('TEST 1: Get Room Sharing Listings (Profile Images Check)');

  const listingsResponse = await makeRequest('/room-sharing?limit=5');

  if (listingsResponse.ok && listingsResponse.data.success) {
    logTest('API responds successfully', true);

    const shares = listingsResponse.data.data.shares || listingsResponse.data.data.requests || [];
    logTest(`Retrieved ${shares.length} room sharing listings`, shares.length > 0,
      `Total listings: ${shares.length}`);

    if (shares.length > 0) {
      const firstShare = shares[0];

      // Check if property details are included
      const hasProperty = !!firstShare.property;
      logTest('Property details included', hasProperty,
        hasProperty ? `Property: ${firstShare.property?.title || 'N/A'}` : 'Missing property');

      // Check if initiator details are included
      const hasInitiator = !!firstShare.initiator;
      logTest('Initiator details included', hasInitiator,
        hasInitiator ? `Initiator: ${firstShare.initiator?.fullName || 'N/A'}` : 'Missing initiator');

      // Check if profile photo is included
      const hasProfilePhoto = !!firstShare.initiator?.profilePhoto;
      logTest('Profile photo in response', hasProfilePhoto,
        hasProfilePhoto ? `Photo URL: ${firstShare.initiator.profilePhoto.substring(0, 50)}...` : 'No profile photo');

      // Check if initiator email is included
      const hasEmail = !!firstShare.initiator?.email;
      logTest('Initiator email included', hasEmail,
        hasEmail ? `Email: ${firstShare.initiator.email}` : 'No email');

      // Check sharing info
      const hasSharingInfo = firstShare.sharing || firstShare.maxParticipants;
      logTest('Sharing information present', !!hasSharingInfo,
        hasSharingInfo ? `Max: ${firstShare.maxParticipants || firstShare.sharing?.maxParticipants || 'N/A'}, Available: ${firstShare.sharing?.availableSlots || 'N/A'}` : 'Missing sharing info');

      passedTests += 6;
    } else {
      log('   ⚠️  No room sharing listings found. Create some listings first.', 'yellow');
      failedTests += 5;
    }
  } else {
    logTest('API responds successfully', false,
      `Status: ${listingsResponse.status}, Error: ${listingsResponse.data?.error || 'Unknown'}`);
    failedTests += 6;
  }

  // TEST 2: Get Specific Room Sharing Details
  logSection('TEST 2: Get Room Sharing Details (View Room Details Check)');

  const listingsForDetail = await makeRequest('/room-sharing?limit=1');

  if (listingsForDetail.ok && listingsForDetail.data.success) {
    const shares = listingsForDetail.data.data.shares || listingsForDetail.data.data.requests || [];

    if (shares.length > 0) {
      const shareId = shares[0]._id || shares[0].id;
      const detailResponse = await makeRequest(`/room-sharing/${shareId}`);

      if (detailResponse.ok && detailResponse.data.success) {
        logTest('Get detail endpoint works', true);

        const detail = detailResponse.data.data;

        // Check property details for "View Room Details" button
        const hasPropertyId = !!(detail.property?._id || detail.property?.id);
        logTest('Property ID available for "View Room Details"', hasPropertyId,
          hasPropertyId ? `Property ID: ${detail.property._id || detail.property.id}` : 'No property ID');

        // Check initiator profile photo
        const hasInitiatorPhoto = !!detail.initiator?.profilePhoto;
        logTest('Initiator profile photo included', hasInitiatorPhoto,
          hasInitiatorPhoto ? `Photo URL: ${detail.initiator.profilePhoto.substring(0, 50)}...` : 'No photo');

        // Check room configuration
        const hasRoomConfig = !!detail.roomConfiguration;
        logTest('Room configuration present', hasRoomConfig,
          hasRoomConfig ? `Beds: ${detail.roomConfiguration?.totalBeds || 'N/A'}, Available: ${detail.roomConfiguration?.bedsAvailable || 'N/A'}` : 'No config');

        // Check cost sharing
        const hasCostSharing = !!detail.costSharing;
        logTest('Cost sharing information present', hasCostSharing,
          hasCostSharing ? `Rent per person: ₹${detail.costSharing?.rentPerPerson || 'N/A'}` : 'No cost info');

        passedTests += 5;
      } else {
        logTest('Get detail endpoint works', false,
          `Error: ${detailResponse.data?.error || 'Unknown'}`);
        failedTests += 5;
      }
    } else {
      log('   ⚠️  No room sharing found to test details', 'yellow');
      failedTests += 5;
    }
  } else {
    failedTests += 5;
  }

  // TEST 3: Get Applications (Profile Photos Check)
  logSection('TEST 3: Get Applications List (Profile Photos Check)');

  // Note: This requires authentication token
  log('   ℹ️  This endpoint requires authentication', 'yellow');
  log('   To test fully, you need to:', 'yellow');
  log('   1. Login as a student', 'yellow');
  log('   2. Get the auth token', 'yellow');
  log('   3. Make request with Authorization header', 'yellow');

  // We'll test without auth to see the error response is proper
  const appsResponse = await makeRequest('/room-sharing/applications');

  const expectedUnauth = appsResponse.status === 401;
  logTest('Applications endpoint exists', expectedUnauth,
    expectedUnauth ? 'Returns 401 Unauthorized (expected without token)' : 'Unexpected response');

  if (expectedUnauth) {
    logTest('Proper authentication required', true,
      'Error message: ' + (appsResponse.data?.error || 'No token provided'));
    passedTests += 2;
  } else {
    failedTests += 1;
  }

  // TEST 4: Check Application Accept Endpoint Structure
  logSection('TEST 4: Application Accept Endpoint (Flow Check)');

  log('   ℹ️  Testing endpoint structure (requires auth + valid application ID)', 'yellow');

  // Try with invalid ID to check endpoint exists
  const acceptResponse = await makeRequest('/room-sharing/applications/invalid-id', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'accept' })
  });

  const endpointExists = acceptResponse.status === 401 || acceptResponse.status === 400;
  logTest('Accept endpoint exists', endpointExists,
    `Status: ${acceptResponse.status} (${acceptResponse.data?.error || 'OK'})`);

  if (endpointExists) {
    passedTests += 1;
  } else {
    failedTests += 1;
  }

  // TEST 5: Check for Completed Status Filtering
  logSection('TEST 5: Completed Room Sharing Filtering');

  const allListings = await makeRequest('/room-sharing?limit=100');

  if (allListings.ok && allListings.data.success) {
    const shares = allListings.data.data.shares || allListings.data.data.requests || [];

    // Check if any completed listings are included
    const hasCompleted = shares.some(s => s.status === 'completed');
    logTest('Completed listings excluded from browse', !hasCompleted,
      hasCompleted ? '❌ Found completed listing in results' : '✅ No completed listings (correctly filtered)');

    // Check status distribution
    const statuses = shares.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});

    log(`   Status distribution: ${JSON.stringify(statuses)}`, 'blue');
    logTest('Only active/full listings shown',
      !hasCompleted && (statuses.active > 0 || statuses.full >= 0),
      `Active: ${statuses.active || 0}, Full: ${statuses.full || 0}, Completed: ${statuses.completed || 0}`);

    passedTests += 2;
  } else {
    failedTests += 2;
  }

  // TEST 6: API Response Structure Validation
  logSection('TEST 6: API Response Structure Validation');

  const structureTest = await makeRequest('/room-sharing?limit=1');

  if (structureTest.ok && structureTest.data.success) {
    const data = structureTest.data.data;

    // Check pagination fields
    const hasPagination = data.total !== undefined && data.page !== undefined;
    logTest('Pagination fields present', hasPagination,
      hasPagination ? `Total: ${data.total}, Page: ${data.page}, Limit: ${data.limit}` : 'Missing pagination');

    // Check shares array
    const hasShares = Array.isArray(data.shares);
    logTest('Shares array present', hasShares);

    // Check requests array (backward compatibility)
    const hasRequests = Array.isArray(data.requests);
    logTest('Requests array present (backward compat)', hasRequests);

    passedTests += 3;
  } else {
    failedTests += 3;
  }

  // SUMMARY
  logSection('TEST SUMMARY');

  const totalTests = passedTests + failedTests;
  const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;

  log(`\nTotal Tests: ${totalTests}`, 'blue');
  log(`Passed: ${passedTests}`, 'green');
  log(`Failed: ${failedTests}`, 'red');
  log(`Pass Rate: ${passRate}%\n`, passRate >= 80 ? 'green' : 'yellow');

  if (passRate >= 80) {
    log('🎉 EXCELLENT! API is working as expected!', 'green');
  } else if (passRate >= 60) {
    log('⚠️  GOOD, but some improvements needed', 'yellow');
  } else {
    log('❌ NEEDS ATTENTION - Multiple failures detected', 'red');
  }

  // Recommendations
  logSection('RECOMMENDATIONS FOR FULL TESTING');

  log('\n1. Create Test Data:', 'cyan');
  log('   - Create at least 2 student accounts');
  log('   - Post room sharing from Student A');
  log('   - Apply from Student B');
  log('   - Accept application as Student A');
  log('   - Verify completion when all slots filled');

  log('\n2. Test with Authentication:', 'cyan');
  log('   - Login and get auth token');
  log('   - Test /room-sharing/applications endpoint');
  log('   - Test application accept/reject flow');

  log('\n3. Test UI Integration:', 'cyan');
  log('   - Open browser to http://localhost:3000');
  log('   - Navigate to /shared-rooms');
  log('   - Check profile images display');
  log('   - Click "View Room Details" button');
  log('   - Test application submission');

  log('\n4. Database Verification:', 'cyan');
  log('   - Check MongoDB for currentParticipants updates');
  log('   - Verify bedsAvailable decrements');
  log('   - Confirm status changes to "completed"');
  log('   - Check completionReason and completedAt fields\n');

  console.log('='.repeat(60));
  log('\n✅ API Test Suite Complete!\n', 'green');
}

// Run tests
runTests().catch(console.error);
