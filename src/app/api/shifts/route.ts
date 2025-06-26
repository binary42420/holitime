import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { getAllShifts, getShiftsByCrewChief } from '@/lib/services/shifts';

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
    } else {
      // Client users - get shifts for their jobs
      shifts = await getAllShifts();
      // TODO: Filter to only shifts for client's jobs
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
