import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/middleware"
import { query } from "@/lib/db"

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

    // Only managers can access export templates
    if (user.role !== "Manager/Admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const { id: templateId } = await params

    // Get template details
    const templateResult = await query(`
      SELECT 
        t.id,
        t.name,
        t.description,
        t.is_default,
        t.created_at,
        u.name as created_by_name
      FROM timesheet_export_templates t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = $1
    `, [templateId])

    if (templateResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    const template = templateResult.rows[0]

    // Get field mappings
    const mappingsResult = await query(`
      SELECT 
        id,
        field_type,
        field_name,
        column_letter,
        row_number,
        is_header,
        display_name,
        data_type,
        format_pattern
      FROM template_field_mappings
      WHERE template_id = $1
      ORDER BY field_type, row_number, column_letter
    `, [templateId])

    const fieldMappings = mappingsResult.rows.map(row => ({
      id: row.id,
      fieldType: row.field_type,
      fieldName: row.field_name,
      columnLetter: row.column_letter,
      rowNumber: row.row_number,
      isHeader: row.is_header,
      displayName: row.display_name,
      dataType: row.data_type,
      formatPattern: row.format_pattern
    }))

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        isDefault: template.is_default,
        createdAt: template.created_at,
        createdBy: template.created_by_name,
        fieldMappings
      }
    })

  } catch (error) {
    console.error("Error fetching export template:", error)
    return NextResponse.json(
      { error: "Failed to fetch export template" },
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

    // Only managers can update export templates
    if (user.role !== "Manager/Admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const { id: templateId } = await params
    const body = await request.json()
    const { name, description, isDefault = false, fieldMappings } = body

    // Validate required fields
    if (!name || !fieldMappings || !Array.isArray(fieldMappings)) {
      return NextResponse.json(
        { error: "Name and field mappings are required" },
        { status: 400 }
      )
    }

    // Start transaction
    await query("BEGIN")

    try {
      // Check if template exists
      const existingTemplate = await query(`
        SELECT id FROM timesheet_export_templates WHERE id = $1
      `, [templateId])

      if (existingTemplate.rows.length === 0) {
        await query("ROLLBACK")
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 }
        )
      }

      // If this is set as default, unset other defaults
      if (isDefault) {
        await query(`
          UPDATE timesheet_export_templates 
          SET is_default = FALSE 
          WHERE is_default = TRUE AND id != $1
        `, [templateId])
      }

      // Update the template
      await query(`
        UPDATE timesheet_export_templates 
        SET name = $1, description = $2, is_default = $3, updated_at = NOW()
        WHERE id = $4
      `, [name, description, isDefault, templateId])

      // Delete existing field mappings
      await query(`
        DELETE FROM template_field_mappings WHERE template_id = $1
      `, [templateId])

      // Insert new field mappings
      for (const mapping of fieldMappings) {
        await query(`
          INSERT INTO template_field_mappings 
          (template_id, field_type, field_name, column_letter, row_number, is_header, display_name, data_type, format_pattern)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          templateId,
          mapping.fieldType,
          mapping.fieldName,
          mapping.columnLetter,
          mapping.rowNumber,
          mapping.isHeader || false,
          mapping.displayName || mapping.fieldName,
          mapping.dataType || "text",
          mapping.formatPattern || null
        ])
      }

      await query("COMMIT")

      return NextResponse.json({
        success: true,
        message: "Export template updated successfully"
      })

    } catch (error) {
      await query("ROLLBACK")
      throw error
    }

  } catch (error) {
    console.error("Error updating export template:", error)
    return NextResponse.json(
      { error: "Failed to update export template" },
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

    // Only managers can delete export templates
    if (user.role !== "Manager/Admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const { id: templateId } = await params

    // Check if template exists and is not default
    const templateResult = await query(`
      SELECT is_default FROM timesheet_export_templates WHERE id = $1
    `, [templateId])

    if (templateResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    if (templateResult.rows[0].is_default) {
      return NextResponse.json(
        { error: "Cannot delete the default template" },
        { status: 400 }
      )
    }

    // Delete the template (field mappings will be deleted by CASCADE)
    await query(`
      DELETE FROM timesheet_export_templates WHERE id = $1
    `, [templateId])

    return NextResponse.json({
      success: true,
      message: "Export template deleted successfully"
    })

  } catch (error) {
    console.error("Error deleting export template:", error)
    return NextResponse.json(
      { error: "Failed to delete export template" },
      { status: 500 }
    )
  }
}
