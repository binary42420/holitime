import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companySlug = searchParams.get('company')

    if (!companySlug) {
      return NextResponse.json(
        { error: 'Company parameter is required' },
        { status: 400 }
      )
    }

    // Convert URL-friendly slug back to searchable term
    const companyName = decodeURIComponent(companySlug).replace(/-/g, ' ')

    console.log('Looking for client with company name:', companyName)

    // Find the client by company name using fuzzy matching
    const result = await query(`
      SELECT id, name, company_name, contact_person, contact_email, contact_phone, company_address, created_at, updated_at
      FROM users
      WHERE role = 'Client' AND LOWER(REPLACE(COALESCE(company_name, name), '.', '')) LIKE LOWER($1)
      LIMIT 1
    `, [`%${companyName}%`])

    console.log('Client query result:', result.rows)

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    const client = result.rows[0]

    // Transform the data to match expected format
    const transformedClient = {
      id: client.id,
      name: client.name,
      companyName: client.company_name || client.name,
      companyAddress: client.company_address,
      contactPerson: client.contact_person,
      contactEmail: client.contact_email,
      contactPhone: client.contact_phone,
      // Add backward compatibility fields for the frontend
      email: client.contact_email,
      phone: client.contact_phone,
      address: client.company_address,
      notes: null, // notes column doesn't exist in schema
      createdAt: client.created_at,
      updatedAt: client.updated_at
    }

    return NextResponse.json({ client: transformedClient })
  } catch (error) {
    console.error('Error fetching client by slug:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
