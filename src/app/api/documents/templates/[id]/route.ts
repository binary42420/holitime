import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/middleware"
import { query } from "@/lib/db"
import { globalCache } from "@/lib/cache"
import { DocumentTemplate, UpdateDocumentTemplateRequest } from "@/types/documents"
import { writeFile, mkdir, unlink } from "fs/promises"
import path from "path"

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
    const cacheKey = `document_template:${id}`
    
    // Try to get from cache
    const cached = globalCache.get<DocumentTemplate>(cacheKey)
    if (cached) {
      return NextResponse.json({ template: cached.data })
    }

    const templateQuery = `
      SELECT 
        dt.*,
        dc.name as category_name,
        dc.color as category_color,
        dc.icon as category_icon,
        u.name as created_by_name
      FROM document_templates dt
      LEFT JOIN document_categories dc ON dt.category_id = dc.id
      LEFT JOIN users u ON dt.created_by = u.id
      WHERE dt.id = $1
    `

    const result = await query(templateQuery, [id])
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    const row = result.rows[0]
    const template: DocumentTemplate = {
      id: row.id,
      name: row.name,
      description: row.description,
      document_type: row.document_type,
      file_path: row.file_path,
      file_size: row.file_size,
      mime_type: row.mime_type,
      version: row.version,
      is_active: row.is_active,
      is_required: row.is_required,
      applicable_roles: row.applicable_roles,
      expiration_days: row.expiration_days,
      auto_assign_new_users: row.auto_assign_new_users,
      conditional_logic: row.conditional_logic,
      category_id: row.category_id,
      category: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        color: row.category_color,
        icon: row.category_icon,
        description: "",
        sort_order: 0,
        is_active: true,
        created_at: ""
      } : undefined,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at
    }

    globalCache.set(cacheKey, template, 10 * 60 * 1000) // 10 minutes

    return NextResponse.json({ template })
  } catch (error) {
    console.error("Error fetching document template:", error)
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

    // Only managers and admins can update templates
    if (user.role !== "Manager/Admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const { id } = await params
    
    // Check if template exists
    const existingResult = await query("SELECT * FROM document_templates WHERE id = $1", [id])
    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    const existingTemplate = existingResult.rows[0]
    
    // Handle both form data (with file) and JSON data
    let updateData: UpdateDocumentTemplateRequest
    let newFile: File | null = null

    const contentType = request.headers.get("content-type")
    if (contentType?.includes("multipart/form-data")) {
      const formData = await request.formData()
      newFile = formData.get("file") as File
      
      updateData = {
        name: formData.get("name") as string || undefined,
        description: formData.get("description") as string || undefined,
        document_type: formData.get("document_type") as any || undefined,
        applicable_roles: formData.get("applicable_roles") ? JSON.parse(formData.get("applicable_roles") as string) : undefined,
        is_required: formData.get("is_required") ? formData.get("is_required") === "true" : undefined,
        expiration_days: formData.get("expiration_days") ? parseInt(formData.get("expiration_days") as string) : undefined,
        auto_assign_new_users: formData.get("auto_assign_new_users") ? formData.get("auto_assign_new_users") === "true" : undefined,
        conditional_logic: formData.get("conditional_logic") ? JSON.parse(formData.get("conditional_logic") as string) : undefined,
        category_id: formData.get("category_id") ? parseInt(formData.get("category_id") as string) : undefined,
        is_active: formData.get("is_active") ? formData.get("is_active") === "true" : undefined
      }
    } else {
      updateData = await request.json()
    }

    // Handle file upload if new file provided
    let filePath = existingTemplate.file_path
    let fileSize = existingTemplate.file_size
    let mimeType = existingTemplate.mime_type

    if (newFile) {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), "uploads", "document-templates")
      await mkdir(uploadsDir, { recursive: true })

      // Generate unique filename
      const timestamp = Date.now()
      const sanitizedName = (updateData.name || existingTemplate.name).replace(/[^a-zA-Z0-9]/g, "_")
      const filename = `${sanitizedName}_${timestamp}.pdf`
      const newFilePath = path.join(uploadsDir, filename)

      // Save new file
      const bytes = await newFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(newFilePath, buffer)

      // Delete old file if it exists
      if (existingTemplate.file_path) {
        try {
          const oldFilePath = path.join(process.cwd(), existingTemplate.file_path.replace(/^\//, ""))
          await unlink(oldFilePath)
        } catch (error) {
          console.log("Could not delete old file:", error)
        }
      }

      filePath = `/uploads/document-templates/${filename}`
      fileSize = buffer.length
      mimeType = newFile.type || "application/pdf"
    }

    // Build update query
    const updateFields: string[] = []
    const updateValues: any[] = []
    let paramIndex = 1

    if (updateData.name !== undefined) {
      updateFields.push(`name = ${paramIndex}`)
      updateValues.push(updateData.name)
      paramIndex++
    }

    if (updateData.description !== undefined) {
      updateFields.push(`description = ${paramIndex}`)
      updateValues.push(updateData.description)
      paramIndex++
    }

    if (updateData.document_type !== undefined) {
      updateFields.push(`document_type = ${paramIndex}`)
      updateValues.push(updateData.document_type)
      paramIndex++
    }

    if (updateData.applicable_roles !== undefined) {
      updateFields.push(`applicable_roles = ${paramIndex}`)
      updateValues.push(updateData.applicable_roles)
      paramIndex++
    }

    if (updateData.is_required !== undefined) {
      updateFields.push(`is_required = ${paramIndex}`)
      updateValues.push(updateData.is_required)
      paramIndex++
    }

    if (updateData.expiration_days !== undefined) {
      updateFields.push(`expiration_days = ${paramIndex}`)
      updateValues.push(updateData.expiration_days)
      paramIndex++
    }

    if (updateData.auto_assign_new_users !== undefined) {
      updateFields.push(`auto_assign_new_users = ${paramIndex}`)
      updateValues.push(updateData.auto_assign_new_users)
      paramIndex++
    }

    if (updateData.conditional_logic !== undefined) {
      updateFields.push(`conditional_logic = ${paramIndex}`)
      updateValues.push(updateData.conditional_logic)
      paramIndex++
    }

    if (updateData.category_id !== undefined) {
      updateFields.push(`category_id = ${paramIndex}`)
      updateValues.push(updateData.category_id)
      paramIndex++
    }

    if (updateData.is_active !== undefined) {
      updateFields.push(`is_active = ${paramIndex}`)
      updateValues.push(updateData.is_active)
      paramIndex++
    }

    if (newFile) {
      updateFields.push(`file_path = ${paramIndex}`, `file_size = ${paramIndex + 1}`, `mime_type = ${paramIndex + 2}`)
      updateValues.push(filePath, fileSize, mimeType)
      paramIndex += 3
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      )
    }

    updateFields.push("updated_at = CURRENT_TIMESTAMP")
    updateValues.push(id)

    const updateQuery = `
      UPDATE document_templates 
      SET ${updateFields.join(", ")}
      WHERE id = ${paramIndex}
      RETURNING *
    `

    const result = await query(updateQuery, updateValues)
    const updatedTemplate = result.rows[0]

    // Invalidate cache
    globalCache.invalidateByTag("document_templates")

    return NextResponse.json({
      success: true,
      template: updatedTemplate,
      message: "Document template updated successfully"
    })
  } catch (error) {
    console.error("Error updating document template:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Only managers and admins can delete templates
    if (user.role !== "Manager/Admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const { id } = await params

    // Check if template exists and get file path
    const existingResult = await query("SELECT * FROM document_templates WHERE id = $1", [id])
    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    const template = existingResult.rows[0]

    // Check if template is in use
    const assignmentsResult = await query(
      "SELECT COUNT(*) as count FROM document_assignments WHERE template_id = $1",
      [id]
    )
    
    const assignmentCount = parseInt(assignmentsResult.rows[0].count)
    if (assignmentCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete template. It is assigned to ${assignmentCount} users.` },
        { status: 400 }
      )
    }

    // Delete the template
    await query("DELETE FROM document_templates WHERE id = $1", [id])

    // Delete the file if it exists
    if (template.file_path) {
      try {
        const filePath = path.join(process.cwd(), template.file_path.replace(/^\//, ""))
        await unlink(filePath)
      } catch (error) {
        console.log("Could not delete file:", error)
      }
    }

    // Invalidate cache
    globalCache.invalidateByTag("document_templates")

    return NextResponse.json({
      success: true,
      message: "Document template deleted successfully"
    })
  } catch (error) {
    console.error("Error deleting document template:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
