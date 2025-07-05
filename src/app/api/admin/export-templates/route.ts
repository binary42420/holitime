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

    // Only managers can access export templates
    if (user.role !== "Manager/Admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    // Get all export templates with their field mappings
    const templatesResult = await query(`
      SELECT 
        t.id,
        t.name,
        t.description,
        t.is_default,
        t.created_at,
        u.name as created_by_name,
        COUNT(fm.id) as field_count
      FROM timesheet_export_templates t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN template_field_mappings fm ON t.id = fm.template_id
      GROUP BY t.id, t.name, t.description, t.is_default, t.created_at, u.name
      ORDER BY t.is_default DESC, t.created_at DESC
    `)

    const templates = templatesResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      isDefault: row.is_default,
      createdAt: row.created_at,
      createdBy: row.created_by_name,
      fieldCount: parseInt(row.field_count)
    }))

    return NextResponse.json({
      success: true,
      templates
    })

  } catch (error) {
    console.error("Error fetching export templates:", error)
    return NextResponse.json(
      { error: "Failed to fetch export templates" },
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

    // Only managers can create export templates
    if (user.role !== "Manager/Admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, isDefault = false, fieldMappings } = body

    // Validate required fields
    if (!name || !fieldMappings || !Array.isArray(fieldMappings)) {
      return NextResponse.json(
        { error: "Name and field mappings are required" },
        { status: 400 }
      )
    }

    // Validate field mappings structure
    for (const mapping of fieldMappings) {
      if (!mapping.fieldType || !mapping.fieldName || !mapping.columnLetter || !mapping.rowNumber) {
        return NextResponse.json(
          { error: "Each field mapping must have fieldType, fieldName, columnLetter, and rowNumber" },
          { status: 400 }
        )
      }
    }

    // Start transaction
    await query("BEGIN")

    try {
      // If this is set as default, unset other defaults
      if (isDefault) {
        await query(`
          UPDATE timesheet_export_templates 
          SET is_default = FALSE 
          WHERE is_default = TRUE
        `)
      }

      // Create the template
      const templateResult = await query(`
        INSERT INTO timesheet_export_templates (name, description, is_default, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [name, description, isDefault, user.id])

      const templateId = templateResult.rows[0].id

      // Insert field mappings
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
        templateId,
        message: "Export template created successfully"
      })

    } catch (error) {
      await query("ROLLBACK")
      throw error
    }

  } catch (error) {
    console.error("Error creating export template:", error)
    return NextResponse.json(
      { error: "Failed to create export template" },
      { status: 500 }
    )
  }
}
