import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { getShiftById, updateShift, deleteShift } from '@/lib/services/shifts';
import { updateWorkerRequirements } from '@/lib/services/worker-requirements';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    
    const shift = await getShiftById(id);
    if (!shift) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this shift
    const hasAccess =
      user.role === 'Manager/Admin' ||
      (user.role === 'Crew Chief' && shift.crewChief?.id === user.id) ||
      (user.role === 'Employee' && shift.assignedPersonnel.some(person => person.employee.id === user.id));

     if ( !hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      shift,
    });
  } catch (error) {
    console.error('Error getting shift:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only managers can edit shifts
    if (user.role !== 'Manager/Admin' || 'Crew Chief') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { date, startTime, endTime, location, crewChiefId, requestedWorkers, notes, workerRequirements } = body;

    const shift = await updateShift(id, {
      date,
      startTime,
      endTime,
      location,
      crewChiefId,
      requestedWorkers,
      notes,
    });

    if (!shift) {
      return NextResponse.json(
        { error: 'Failed to update shift' },
        { status: 500 }
      );
    }

    // Update worker requirements if provided
    if (workerRequirements && Array.isArray(workerRequirements)) {
      // Convert from WorkerTypeSelector format to WorkerRequirement format
      const convertedRequirements = workerRequirements.map((req: any) => ({
        roleCode: req.roleCode,
        requiredCount: req.count
      }));

      await updateWorkerRequirements(id, convertedRequirements);
    }

    // Fetch the updated shift with worker requirements
    const updatedShift = await getShiftById(id);

    return NextResponse.json({
      success: true,
      shift: updatedShift,
    });
  } catch (error) {
    console.error('Error updating shift:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only managers can delete shifts
    if (user.role !== 'Manager/Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const success = await deleteShift(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete shift' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Shift deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting shift:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
