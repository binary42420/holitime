import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { deleteClientCompanyCascade, getDeletionImpact } from '@/lib/services/cascade-deletion';
import { query } from '@/lib/db';

// GET /api/cascade-delete/client/[id] - Get deletion impact preview
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers/admins can perform cascade deletions
    if (session.user.role !== 'Manager/Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: clientId } = await params;
    
    const impact = await getDeletionImpact('client', clientId);
    
    return NextResponse.json({ impact });
  } catch (error) {
    console.error('Error getting client deletion impact:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/cascade-delete/client/[id] - Perform cascade deletion
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers/admins can perform cascade deletions
    if (session.user.role !== 'Manager/Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: clientId } = await params;
    
    // Get confirmation from request body
    const body = await request.json();
    const { confirmed, confirmationText } = body;

    // Fetch the client's name to confirm deletion
    const clientResult = await query('SELECT company_name FROM clients WHERE id = $1', [clientId]);
    if (clientResult.rows.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    const clientName = clientResult.rows[0].company_name;

    if (!confirmed || confirmationText !== clientName) {
      return NextResponse.json({ 
        error: `Deletion not confirmed. Please type "${clientName}" to confirm.` 
      }, { status: 400 });
    }
    
    const result = await deleteClientCompanyCascade(clientId, session.user.id);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        deletedCounts: result.deletedCounts
      });
    } else {
      return NextResponse.json({
        error: result.message,
        details: result.error
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in client cascade deletion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
