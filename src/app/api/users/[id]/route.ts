import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/middleware"
import { query } from "@/lib/db"
import type { UserRole } from "@/lib/types"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id } = await params

    // Only managers can view other users, or users can view themselves
    if (user.role !== "Manager/Admin" && user.id !== id) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const result = await query(`
      SELECT
        id, name, email, role, avatar, location,
        certifications, performance, crew_chief_eligible, fork_operator_eligible, osha_compliant,
        company_name, contact_person, contact_email, contact_phone,
        created_at, updated_at, last_login, is_active
      FROM users
      WHERE id = $1
    `, [id])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const userData = result.rows[0]
    
    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        avatar: userData.avatar,
        location: userData.location,
        certifications: userData.certifications || [],
        performance: userData.performance,
        crewChiefEligible: userData.crew_chief_eligible,
        forkOperatorEligible: userData.fork_operator_eligible,
        oshaCompliant: userData.osha_compliant,
        companyName: userData.company_name,
        contactPerson: userData.contact_person,
        contactEmail: userData.contact_email,
        contactPhone: userData.contact_phone,
        createdAt: userData.created_at,
        updatedAt: userData.updated_at,
        lastLogin: userData.last_login,
        isActive: userData.is_active
      }
    })
  } catch (error) {
    console.error("Error getting user:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Only managers can update user permissions and roles
    if (user.role !== "Manager/Admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()

    const {
      name,
      email,
      role,
      location,
      certifications,
      performance,
      crewChiefEligible,
      forkOperatorEligible,
      oshaCompliant,
      companyName,
      contactPerson,
      contactEmail,
      contactPhone
    } = body

    // Validate role
    const validRoles: UserRole[] = ["Employee", "Crew Chief", "Manager/Admin", "Client"]
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role specified" },
        { status: 400 }
      )
    }

    // Build update query dynamically based on provided fields
    const updateFields = []
    const updateValues = []
    let paramIndex = 1

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`)
      updateValues.push(name)
    }
    if (email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`)
      updateValues.push(email)
    }
    if (role !== undefined) {
      updateFields.push(`role = $${paramIndex++}`)
      updateValues.push(role)
    }
    if (location !== undefined) {
      updateFields.push(`location = $${paramIndex++}`)
      updateValues.push(location)
    }
    if (certifications !== undefined) {
      updateFields.push(`certifications = $${paramIndex++}`)
      updateValues.push(certifications)
    }
    if (performance !== undefined) {
      updateFields.push(`performance = $${paramIndex++}`)
      updateValues.push(performance)
    }
    if (crewChiefEligible !== undefined) {
      updateFields.push(`crew_chief_eligible = $${paramIndex++}`)
      updateValues.push(crewChiefEligible)
    }
    if (forkOperatorEligible !== undefined) {
      updateFields.push(`fork_operator_eligible = $${paramIndex++}`)
      updateValues.push(forkOperatorEligible)
    }
    if (oshaCompliant !== undefined) {
      updateFields.push(`osha_compliant = $${paramIndex++}`)
      updateValues.push(oshaCompliant)
    }
    if (companyName !== undefined) {
      updateFields.push(`company_name = $${paramIndex++}`)
      updateValues.push(companyName)
    }
    if (contactPerson !== undefined) {
      updateFields.push(`contact_person = $${paramIndex++}`)
      updateValues.push(contactPerson)
    }
    if (contactEmail !== undefined) {
      updateFields.push(`contact_email = $${paramIndex++}`)
      updateValues.push(contactEmail)
    }
    if (contactPhone !== undefined) {
      updateFields.push(`contact_phone = $${paramIndex++}`)
      updateValues.push(contactPhone)
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      )
    }

    // Add updated_at timestamp
    updateFields.push("updated_at = NOW()")
    updateValues.push(id)

    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING id, name, email, role, avatar, location,
                certifications, performance, crew_chief_eligible, fork_operator_eligible, osha_compliant,
                company_name, contact_person, contact_email, contact_phone
    `

    const result = await query(updateQuery, updateValues)

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const updatedUser = result.rows[0]

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        location: updatedUser.location,
        certifications: updatedUser.certifications || [],
        performance: updatedUser.performance,
        crewChiefEligible: updatedUser.crew_chief_eligible,
        forkOperatorEligible: updatedUser.fork_operator_eligible,
        oshaCompliant: updatedUser.osha_compliant,
        companyName: updatedUser.company_name,
        contactPerson: updatedUser.contact_person,
        contactEmail: updatedUser.contact_email,
        contactPhone: updatedUser.contact_phone
      }
    })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
