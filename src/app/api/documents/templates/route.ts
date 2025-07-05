import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/middleware"
import { query } from "@/lib/db"
import { globalCache } from "@/lib/cache"
import { DocumentTemplate, DocumentTemplateFilters, CreateDocumentTemplateRequest } from "@/types/documents"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

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
    const filters: DocumentTemplateFilters = {
      document_type: searchParams.get("document_type")?.split(",") as any,
      category_id: searchParams.get("category_id")?.split(",").map(Number),
      applicable_roles: searchParams.get("applicable_roles")?.split(","),
      is_active: searchParams.get("is_active") === "true",
      is_required: searchParams.get("is_required") === "true",
      auto_assign_new_users: searchParams.get("auto_assign_new_users") === "true",
      search: searchParams.get("search") || undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "50"),
      sort_by: searchParams.get("sort_by") || "name",
      sort_order: (searchParams.get("sort_order") as "asc" | "desc") || "asc"
    }

    // Build cache key
    const cacheKey = `document_templates:${JSON.stringify(filters)}`
    
    // Try to get from cache
    const cached = globalCache.get<{ templates: DocumentTemplate[], total: number }>(cacheKey)
    if (cached) {
      return NextResponse.json(cached.data)
    }
  } catch (error) {
    console.error("Error fetching document templates:", error)
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

    // Only managers and admins can create templates
    if (user.role !== "Manager/Admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const templateData: CreateDocumentTemplateRequest = {
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined,
      document_type: formData.get("document_type") as any,
      applicable_roles: JSON.parse(formData.get("applicable_roles") as string),
      is_required: formData.get("is_required") === "true",
      expiration_days: formData.get("expiration_days") ? parseInt(formData.get("expiration_days") as string) : undefined,
      auto_assign_new_users: formData.get("auto_assign_new_users") === "true",
      conditional_logic: formData.get("conditional_logic") ? JSON.parse(formData.get("conditional_logic") as string) : undefined,
      category_id: formData.get("category_id") ? parseInt(formData.get("category_id") as string) : undefined
    }

    // Validate required fields
    if (!templateData.name || !templateData.document_type || !templateData.applicable_roles?.length) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Handle file upload
    let filePath = ""
    let fileSize = 0
    let mimeType = "application/pdf"

    if (file) {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), "uploads", "document-templates")
      await mkdir(uploadsDir, { recursive: true })

      // Generate unique filename
      const timestamp = Date.now()
      const sanitizedName = templateData.name.replace(/[^a-zA-Z0-9]/g, "_")
      const filename = `${sanitizedName}_${timestamp}.pdf`
      filePath = path.join(uploadsDir, filename)

      // Save file
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)

      fileSize = buffer.length
      mimeType = file.type || "application/pdf"
      filePath = `/uploads/document-templates/${filename}` // Store relative path
    }

    // Insert template into database
    const insertQuery = `
      INSERT INTO document_templates (
        name, description, document_type, file_path, file_size, mime_type,
        is_required, applicable_roles, expiration_days, auto_assign_new_users,
        conditional_logic, category_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `

    const result = await query(insertQuery, [
      templateData.name,
      templateData.description,
      templateData.document_type,
      filePath,
      fileSize,
      mimeType,
      templateData.is_required,
      templateData.applicable_roles,
      templateData.expiration_days,
      templateData.auto_assign_new_users,
      templateData.conditional_logic,
      templateData.category_id,
      user.id
    ])

    const template = result.rows[0]

    // Invalidate cache
    invalidateCache.all()

    // Auto-assign to existing users if enabled
    if (templateData.auto_assign_new_users) {
      const usersQuery = `
        SELECT id FROM users 
        WHERE role = ANY($1) AND is_active = true
      `
      const usersResult = await query(usersQuery, [templateData.applicable_roles])
      
      if (usersResult.rows.length > 0) {
        const assignmentValues = usersResult.rows.map((userRow, index) => {
          const baseIndex = index * 4
          return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`
        }).join(", ")

        const assignmentParams = usersResult.rows.flatMap(userRow => [
          userRow.id,
          template.id,
          user.id,
          templateData.is_required
        ])

        const assignQuery = `
          INSERT INTO document_assignments (user_id, template_id, assigned_by, is_required)
          VALUES ${assignmentValues}
          ON CONFLICT (user_id, template_id) DO NOTHING
        `
        
        await query(assignQuery, assignmentParams)
      }
    }

    return NextResponse.json({
      success: true,
      template,
      message: "Document template created successfully"
    })
  } catch (error) {
    console.error("Error creating document template:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
