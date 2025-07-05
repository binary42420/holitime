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

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const status = searchParams.get("status")
    const documentType = searchParams.get("documentType")

    // Build query based on user role and filters
    let whereClause = ""
    let queryParams: any[] = []
    let paramIndex = 1

    if (user.role === "Manager/Admin") {
      // Managers can see all documents
      if (userId) {
        whereClause += `WHERE d.user_id = $${paramIndex++}`
        queryParams.push(userId)
      }
    } else {
      // Regular users can only see their own documents
      whereClause += `WHERE d.user_id = $${paramIndex++}`
      queryParams.push(user.id)
    }

    if (status) {
      whereClause += whereClause ? ` AND d.status = $${paramIndex++}` : `WHERE d.status = $${paramIndex++}`
      queryParams.push(status)
    }

    if (documentType) {
      whereClause += whereClause ? ` AND dt.name = $${paramIndex++}` : `WHERE dt.name = $${paramIndex++}`
      queryParams.push(documentType)
    }

    const result = await query(`
      SELECT 
        d.id, d.user_id, d.document_type_id, d.original_filename, d.file_path,
        d.file_size, d.mime_type, d.status, d.uploaded_at, d.reviewed_by,
        d.reviewed_at, d.review_notes, d.expiration_date, d.created_at, d.updated_at,
        dt.name as document_type_name, dt.description as document_type_description,
        dt.is_certification, dt.requires_expiration,
        u.name as user_name, u.email as user_email,
        reviewer.name as reviewer_name
      FROM documents d
      JOIN document_types dt ON d.document_type_id = dt.id
      JOIN users u ON d.user_id = u.id
      LEFT JOIN users reviewer ON d.reviewed_by = reviewer.id
      ${whereClause}
      ORDER BY d.uploaded_at DESC
    `, queryParams)

    const documents = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      documentTypeId: row.document_type_id,
      originalFilename: row.original_filename,
      filePath: row.file_path,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      status: row.status,
      uploadedAt: row.uploaded_at,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      reviewNotes: row.review_notes,
      expirationDate: row.expiration_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      documentType: {
        id: row.document_type_id,
        name: row.document_type_name,
        description: row.document_type_description,
        isCertification: row.is_certification,
        requiresExpiration: row.requires_expiration
      },
      user: {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email
      },
      reviewer: row.reviewer_name ? {
        id: row.reviewed_by,
        name: row.reviewer_name
      } : null
    }))

    return NextResponse.json({
      success: true,
      documents
    })

  } catch (error) {
    console.error("Error fetching documents:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
