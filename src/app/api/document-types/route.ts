import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/middleware"
import { query } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const result = await query(`
      SELECT 
        id, name, description, is_certification, requires_expiration,
        created_at, updated_at
      FROM document_types
      ORDER BY name ASC
    `)

    const documentTypes = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      isCertification: row.is_certification,
      requiresExpiration: row.requires_expiration,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))

    return NextResponse.json({
      success: true,
      documentTypes
    })

  } catch (error) {
    console.error("Error fetching document types:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Only managers can create document types
    if (user.role !== "Manager/Admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const { name, description, isCertification, requiresExpiration } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Document type name is required" },
        { status: 400 }
      )
    }

    const result = await query(`
      INSERT INTO document_types (name, description, is_certification, requires_expiration)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, description, is_certification, requires_expiration, created_at, updated_at
    `, [name.trim(), description || null, isCertification || false, requiresExpiration || false])

    const documentType = result.rows[0]

    return NextResponse.json({
      success: true,
      documentType: {
        id: documentType.id,
        name: documentType.name,
        description: documentType.description,
        isCertification: documentType.is_certification,
        requiresExpiration: documentType.requires_expiration,
        createdAt: documentType.created_at,
        updatedAt: documentType.updated_at
      }
    })

  } catch (error) {
    console.error("Error creating document type:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
