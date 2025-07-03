import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { getClientById, getClientCompanyById, updateClient, deleteClient } from '@/lib/services/clients';

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

    // Try to get client by user ID first (contact person)
    let client = await getClientById(id);

    // If not found, try to get by client company ID
    if (!client) {
      const clientCompany = await getClientCompanyById(id);
      if (clientCompany) {
        // Convert client company to client format for backward compatibility
        client = {
          id: clientCompany.id,
          clientCompanyId: clientCompany.id,
          companyName: clientCompany.companyName,
          companyAddress: clientCompany.companyAddress,
          contactPhone: clientCompany.contactPhone,
          contactEmail: clientCompany.contactEmail,
          notes: clientCompany.notes,
          // Default values for missing fields
          name: clientCompany.companyName,
          email: clientCompany.contactEmail,
          address: clientCompany.companyAddress,
          phone: clientCompany.contactPhone,
          contactPerson: 'N/A',
        };
      }
    }

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      client,
    });
  } catch (error) {
    console.error('Error getting client:', error);
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

    // Only managers can update clients
    if (user.role !== 'Manager/Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, address, contactPerson, email, phone, notes } = body;

    const { id } = await params;
    const client = await updateClient(id, {
      name,
      companyName: name, // Map name to companyName for consistency
      companyAddress: address, // Map address to companyAddress
      contactPerson,
      contactEmail: email, // Map email to contactEmail
      contactPhone: phone, // Map phone to contactPhone
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Failed to update client' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      client,
    });
  } catch (error) {
    console.error('Error updating client:', error);
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

    // Only managers can delete clients
    if (user.role !== 'Manager/Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const success = await deleteClient(id);
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete client' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Client deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
