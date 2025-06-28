import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { query } from '@/lib/db'
import bcrypt from 'bcryptjs'
import type { UserRole } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only managers can view all users
    if (user.role !== 'Manager/Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const result = await query(`
      SELECT
        id, name, email, role, avatar, location,
        certifications, performance, crew_chief_eligible, fork_operator_eligible,
        company_name, contact_person, contact_email, contact_phone,
        created_at, updated_at, last_login, is_active
      FROM users
      ORDER BY name ASC
    `);

    const users = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      avatar: row.avatar,
      location: row.location,
      certifications: row.certifications || [],
      performance: row.performance,
      crewChiefEligible: row.crew_chief_eligible,
      forkOperatorEligible: row.fork_operator_eligible,
      companyName: row.company_name,
      contactPerson: row.contact_person,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLogin: row.last_login,
      isActive: row.is_active,
    }));

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Error getting users:', error);
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

    // Only managers can create users
    if (user.role !== 'Manager/Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      email,
      password,
      role,
      location,
      performance,
      crewChiefEligible,
      forkOperatorEligible,
      certifications,
      companyName,
      companyAddress,
      contactPerson,
      contactEmail,
      contactPhone
    } = body;

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles: UserRole[] = ['Employee', 'Crew Chief', 'Manager/Admin', 'Client'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'Email address already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate avatar URL (using initials-based approach)
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`;

    // Insert new user
    const insertQuery = `
      INSERT INTO users (
        name, email, password_hash, role, avatar, location,
        performance, crew_chief_eligible, fork_operator_eligible, certifications,
        company_name, company_address, contact_person, contact_email, contact_phone,
        created_at, updated_at, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW(), true
      ) RETURNING id, name, email, role, avatar, location,
                  performance, crew_chief_eligible, fork_operator_eligible, certifications,
                  company_name, contact_person, contact_email, contact_phone
    `;

    const values = [
      name,
      email,
      hashedPassword,
      role,
      avatarUrl,
      location || null,
      performance || null,
      crewChiefEligible || false,
      forkOperatorEligible || false,
      certifications || [],
      companyName || null,
      companyAddress || null,
      contactPerson || null,
      contactEmail || null,
      contactPhone || null
    ];

    const result = await query(insertQuery, values);
    const newUser = result.rows[0];

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar,
        location: newUser.location,
        performance: newUser.performance,
        crewChiefEligible: newUser.crew_chief_eligible,
        forkOperatorEligible: newUser.fork_operator_eligible,
        certifications: newUser.certifications || [],
        companyName: newUser.company_name,
        contactPerson: newUser.contact_person,
        contactEmail: newUser.contact_email,
        contactPhone: newUser.contact_phone
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
