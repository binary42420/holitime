const fetch = require('node-fetch');

async function testFixes() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing the fixes for worker assignment issues...\n');

  try {
    // Test 1: Try to increase worker requirements (+ button functionality)
    console.log('1️⃣ Testing increase worker requirements...');
    
    const shiftId = '7503569c-9c22-4f7b-9a66-86e42e754648'; // EventMakers shift
    
    // Get current shift data
    const shiftResponse = await fetch(`${baseUrl}/api/shifts/${shiftId}`);
    const shiftData = await shiftResponse.json();
    
    console.log('Current shift requirements:', {
      crewChiefRequired: shiftData.crew_chief_required,
      stageHandsRequired: shiftData.stage_hands_required,
      forkOperatorsRequired: shiftData.fork_operators_required
    });

    // Try to update worker requirements (simulate + button click)
    const updateData = {
      crew_chief_required: (shiftData.crew_chief_required || 0) + 1,
      stage_hands_required: (shiftData.stage_hands_required || 0) + 1,
      fork_operators_required: (shiftData.fork_operators_required || 0) + 1
    };

    console.log('Attempting to update to:', updateData);

    const updateResponse = await fetch(`${baseUrl}/api/shifts/${shiftId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });

    if (updateResponse.ok) {
      console.log('✅ Worker requirements update: SUCCESS');
      const updatedShift = await updateResponse.json();
      console.log('New requirements:', {
        crewChiefRequired: updatedShift.crew_chief_required,
        stageHandsRequired: updatedShift.stage_hands_required,
        forkOperatorsRequired: updatedShift.fork_operators_required
      });
    } else {
      const error = await updateResponse.text();
      console.log('❌ Worker requirements update: FAILED');
      console.log('Error:', error);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Try to unassign a worker (if any are assigned)
    console.log('2️⃣ Testing unassign worker functionality...');
    
    const assignedResponse = await fetch(`${baseUrl}/api/shifts/${shiftId}/assigned`);
    const assignedData = await assignedResponse.json();
    
    console.log('Currently assigned workers:', assignedData.length);
    
    if (assignedData.length > 0) {
      const workerToUnassign = assignedData.find(w => !w.isCrewChief);
      
      if (workerToUnassign) {
        console.log(`Attempting to unassign: ${workerToUnassign.employeeName} (${workerToUnassign.id})`);
        
        const unassignResponse = await fetch(`${baseUrl}/api/shifts/${shiftId}/assigned/${workerToUnassign.id}`, {
          method: 'DELETE'
        });

        if (unassignResponse.ok) {
          console.log('✅ Worker unassignment: SUCCESS');
        } else {
          const error = await unassignResponse.text();
          console.log('❌ Worker unassignment: FAILED');
          console.log('Error:', error);
        }
      } else {
        console.log('ℹ️ Only crew chief assigned, testing crew chief unassignment...');
        const crewChief = assignedData.find(w => w.isCrewChief);
        
        if (crewChief) {
          const unassignResponse = await fetch(`${baseUrl}/api/shifts/${shiftId}/assigned/${crewChief.id}`, {
            method: 'DELETE'
          });

          if (unassignResponse.ok) {
            console.log('✅ Crew chief unassignment: SUCCESS');
          } else {
            const error = await unassignResponse.text();
            console.log('❌ Crew chief unassignment: FAILED');
            console.log('Error:', error);
          }
        }
      }
    } else {
      console.log('ℹ️ No workers assigned to test unassignment');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testFixes();
