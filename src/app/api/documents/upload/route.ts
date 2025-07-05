import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/middleware"
import { query } from "@/lib/db"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg", 
  "image/png",
  "image/heic"
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const documentTypeId = formData.get("documentTypeId") as string
    const expirationDate = formData.get("expirationDate") as string

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    if (!documentTypeId) {
      return NextResponse.json(
        { error: "Document type is required" },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PDF, JPG, JPEG, PNG, HEIC" },
        { status: 400 }
      )
    }

    // Verify document type exists
    const documentTypeResult = await query(
      "SELECT id, name, requires_expiration FROM document_types WHERE id = $1",
      [documentTypeId]
    )

    if (documentTypeResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid document type" },
        { status: 400 }
      )
    }

    const documentType = documentTypeResult.rows[0]

    // Check if expiration date is required but not provided
    if (documentType.requires_expiration && !expirationDate) {
      return NextResponse.json(
        { error: "Expiration date is required for this document type" },
        { status: 400 }
      )
    }

    // Generate unique filename
    const documentId = uuidv4()
    const fileExtension = file.name.split(".").pop()
    const filename = `${documentId}.${fileExtension}`
    
    // Create user directory if it doesn't exist
    const userDir = join(process.cwd(), "public", "documents", user.id)
    await mkdir(userDir, { recursive: true })
    
    // Save file
    const filePath = join(userDir, filename)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Store document record in database
    const relativePath = `/documents/${user.id}/${filename}`
    
    const insertResult = await query(`
      INSERT INTO documents (
        id, user_id, document_type_id, original_filename, file_path,
        file_size, mime_type, expiration_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending_review')
      RETURNING id, original_filename, file_path, file_size, mime_type, 
                status, uploaded_at, expiration_date
    `, [
      documentId,
      user.id,
      documentTypeId,
      file.name,
      relativePath,
      file.size,
      file.type,
      expirationDate || null
    ])

    const document = insertResult.rows[0]

    return NextResponse.json({
      success: true,
      message: "Document uploaded successfully",
      document: {
        id: document.id,
        originalFilename: document.original_filename,
        filePath: document.file_path,
        fileSize: document.file_size,
        mimeType: document.mime_type,
        status: document.status,
        uploadedAt: document.uploaded_at,
        expirationDate: document.expiration_date
      }
    })

  } catch (error) {
    console.error("Error uploading document:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
