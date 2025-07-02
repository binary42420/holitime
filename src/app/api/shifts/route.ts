import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { getAllShifts, getShiftsByCrewChief, createShift } from '@/lib/services/shifts';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    let shifts;
    
    // Filter shifts based on user role
    if (user.role === 'Manager/Admin') {
      shifts = await getAllShifts();
    } else if (user.role === 'Crew Chief') {
      shifts = await getShiftsByCrewChief(user.id);
    } else if (user.role === 'Employee') {
      // For employees, get shifts where they are assigned
      shifts = await getAllShifts();
      // TODO: Filter to only shifts where the employee is assigned
      shifts = shifts.filter(shift => 
        shift.assignedPersonnel.some(person => person.employee.id === user.id)
      );
    } else if (user.role === 'Client') {
      // Get shifts for client's jobs
      const searchParams = new URL(request.url).searchParams;
      const clientId = searchParams.get('clientId') || user.clientCompanyId;
      
      if (clientId) {
        shifts = (await getAllShifts({ 
          jobId: undefined, 
          clientId: clientId 
        })).shifts;
      } else {
        shifts = [];
      }
    } else {
      shifts = [];
    }

    return NextResponse.json({
      success: true,
      shifts,
    });
  } catch (error) {
    console.error('Error getting shifts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only managers can create shifts
    if (user.role !== 'Manager/Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { jobId, date, startTime, endTime, location, crewChiefId, requestedWorkers, notes } = body;

    if (!jobId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Job, date, start time, and end time are required' },
        { status: 400 }
      );
    }

    const shift = await createShift({
      jobId,
      date,
      startTime,
      endTime,
      location,
      crewChiefId,
      requestedWorkers: requestedWorkers || 1,
      notes,
    });

    if (!shift) {
      return NextResponse.json(
        { error: 'Failed to create shift' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      shift,
    });
  } catch (error) {
    console.error('Error creating shift:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
