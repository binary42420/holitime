import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/middleware"
import { query } from "@/lib/db"
import { globalCache } from "@/lib/cache"
import { DocumentAssignment, DocumentAssignmentFilters, CreateDocumentAssignmentRequest, BulkAssignDocumentsRequest } from "@/types/documents"
import { emailService } from "@/lib/email-service"

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
    const filters: DocumentAssignmentFilters = {
      user_id: searchParams.get("user_id") ? parseInt(searchParams.get("user_id")!) : undefined,
      template_id: searchParams.get("template_id") ? parseInt(searchParams.get("template_id")!) : undefined,
      status: searchParams.get("status")?.split(",") as any,
      priority: searchParams.get("priority")?.split(",") as any,
      due_date_from: searchParams.get("due_date_from") || undefined,
      due_date_to: searchParams.get("due_date_to") || undefined,
      assigned_date_from: searchParams.get("assigned_date_from") || undefined,
      assigned_date_to: searchParams.get("assigned_date_to") || undefined,
      is_required: searchParams.get("is_required") === "true" ? true : searchParams.get("is_required") === "false" ? false : undefined,
      role: searchParams.get("role")?.split(","),
      search: searchParams.get("search") || undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "50"),
      sort_by: searchParams.get("sort_by") || "assigned_at",
      sort_order: (searchParams.get("sort_order") as "asc" | "desc") || "desc"
    }

    // For non-admin users, only show their own assignments
    if (user.role !== "Manager/Admin" && user.role !== "Crew Chief") {
      filters.user_id = user.id
    }

    // Build cache key
    const cacheKey = `document_assignments:${JSON.stringify(filters)}`
    
    // Try to get from cache
    const cached = globalCache.get<{ assignments: DocumentAssignment[], total: number }>(cacheKey)
    if (cached) {
      return NextResponse.json(cached.data)
    }

    // Build query
    let whereConditions: string[] = []
    let queryParams: any[] = []
    let paramIndex = 1

    if (filters.user_id) {
      whereConditions.push(`da.user_id = $${paramIndex}`)
      queryParams.push(filters.user_id)
      paramIndex++
    }

    if (filters.template_id) {
      whereConditions.push(`da.template_id = $${paramIndex}`)
      queryParams.push(filters.template_id)
      paramIndex++
    }

    if (filters.status?.length) {
      whereConditions.push(`da.status = ANY($${paramIndex})`)
      queryParams.push(filters.status)
      paramIndex++
    }

    if (filters.priority?.length) {
      whereConditions.push(`da.priority = ANY($${paramIndex})`)
      queryParams.push(filters.priority)
      paramIndex++
    }

    if (filters.due_date_from) {
      whereConditions.push(`da.due_date >= $${paramIndex}`)
      queryParams.push(filters.due_date_from)
      paramIndex++
    }

    if (filters.due_date_to) {
      whereConditions.push(`da.due_date <= $${paramIndex}`)
      queryParams.push(filters.due_date_to)
      paramIndex++
    }

    if (filters.assigned_date_from) {
      whereConditions.push(`da.assigned_at >= $${paramIndex}`)
      queryParams.push(filters.assigned_date_from)
      paramIndex++
    }

    if (filters.assigned_date_to) {
      whereConditions.push(`da.assigned_at <= $${paramIndex}`)
      queryParams.push(filters.assigned_date_to)
      paramIndex++
    }

    if (filters.is_required !== undefined) {
      whereConditions.push(`da.is_required = $${paramIndex}`)
      queryParams.push(filters.is_required)
      paramIndex++
    }

    if (filters.role?.length) {
      whereConditions.push(`u.role = ANY($${paramIndex})`)
      queryParams.push(filters.role)
      paramIndex++
    }

    if (filters.search) {
      whereConditions.push(`(dt.name ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex} OR da.notes ILIKE $${paramIndex})`)
      queryParams.push(`%${filters.search}%`)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM document_assignments da
      JOIN document_templates dt ON da.template_id = dt.id
      JOIN users u ON da.user_id = u.id
      LEFT JOIN users ab ON da.assigned_by = ab.id
      ${whereClause}
    `
    const countResult = await query(countQuery, queryParams)
    const total = parseInt(countResult.rows[0].total)

    // Get assignments with pagination
    const offset = (filters.page! - 1) * filters.limit!
    const assignmentsQuery = `
      SELECT 
        da.*,
        dt.name as template_name,
        dt.document_type,
        dt.description as template_description,
        dt.is_required as template_required,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role,
        ab.name as assigned_by_name,
        ab.email as assigned_by_email,
        ds.id as submission_id,
        ds.submitted_at,
        ds.is_draft,
        dap.status as approval_status,
        dap.reviewed_at,
        dap.comments as approval_comments
      FROM document_assignments da
      JOIN document_templates dt ON da.template_id = dt.id
      JOIN users u ON da.user_id = u.id
      LEFT JOIN users ab ON da.assigned_by = ab.id
      LEFT JOIN document_submissions ds ON da.id = ds.assignment_id AND ds.version = (
        SELECT MAX(version) FROM document_submissions WHERE assignment_id = da.id
      )
      LEFT JOIN document_approvals dap ON ds.id = dap.submission_id AND dap.is_final_approval = true
      ${whereClause}
      ORDER BY da.${filters.sort_by} ${filters.sort_order}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    queryParams.push(filters.limit, offset)

    const assignmentsResult = await query(assignmentsQuery, queryParams)
    
    const assignments: DocumentAssignment[] = assignmentsResult.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      template_id: row.template_id,
      assigned_by: row.assigned_by,
      assigned_at: row.assigned_at,
      due_date: row.due_date,
      priority: row.priority,
      is_required: row.is_required,
      notes: row.notes,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      template: {
        id: row.template_id,
        name: row.template_name,
        description: row.template_description,
        document_type: row.document_type,
        file_path: "",
        file_size: 0,
        mime_type: "",
        version: 1,
        is_active: true,
        is_required: row.template_required,
        applicable_roles: [],
        auto_assign_new_users: false,
        created_at: "",
        updated_at: ""
      },
      user: {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
        role: row.user_role
      },
      assigned_by_user: row.assigned_by ? {
        id: row.assigned_by,
        name: row.assigned_by_name,
        email: row.assigned_by_email
      } : undefined,
      submission: row.submission_id ? {
        id: row.submission_id,
        assignment_id: row.id,
        user_id: row.user_id,
        template_id: row.template_id,
        submitted_at: row.submitted_at,
        last_modified: row.submitted_at,
        version: 1,
        is_draft: row.is_draft,
        created_at: row.submitted_at,
        updated_at: row.submitted_at
      } : undefined,
      latest_approval: row.approval_status ? {
        id: 0,
        submission_id: row.submission_id,
        assignment_id: row.id,
        reviewer_id: 0,
        status: row.approval_status,
        comments: row.approval_comments,
        reviewed_at: row.reviewed_at,
        approval_level: 1,
        is_final_approval: true,
        created_at: row.reviewed_at,
        updated_at: row.reviewed_at
      } : undefined
    }))

    const result = { assignments, total }
    
    globalCache.set(cacheKey, result, 2 * 60 * 1000) // 2 minutes

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching document assignments:", error)
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

    // Only managers, admins, and crew chiefs can assign documents
    if (user.role !== "Manager/Admin" && user.role !== "Crew Chief") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Check if this is a bulk assignment
    if ("template_ids" in body && "user_ids" in body) {
      return handleBulkAssignment(body as BulkAssignDocumentsRequest, user)
    } else {
      return handleSingleAssignment(body as CreateDocumentAssignmentRequest, user)
    }
  } catch (error) {
    console.error("Error creating document assignment:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function handleSingleAssignment(assignmentData: CreateDocumentAssignmentRequest, user: any) {
  // Validate required fields
  if (!assignmentData.user_id || !assignmentData.template_id) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    )
  }

  // Check if assignment already exists
  const existingResult = await query(
    "SELECT id FROM document_assignments WHERE user_id = $1 AND template_id = $2",
    [assignmentData.user_id, assignmentData.template_id]
  )

  if (existingResult.rows.length > 0) {
    return NextResponse.json(
      { error: "Document already assigned to this user" },
      { status: 400 }
    )
  }

  // Insert assignment
  const insertQuery = `
    INSERT INTO document_assignments (
      user_id, template_id, assigned_by, due_date, priority, is_required, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `

  const result = await query(insertQuery, [
    assignmentData.user_id,
    assignmentData.template_id,
    user.id,
    assignmentData.due_date,
    assignmentData.priority,
    assignmentData.is_required,
    assignmentData.notes
  ])

  const assignment = result.rows[0]

  // Get user and template details for email
  const detailsQuery = `
    SELECT 
      u.name as user_name, u.email as user_email,
      dt.name as template_name
    FROM users u, document_templates dt
    WHERE u.id = $1 AND dt.id = $2
  `
  const detailsResult = await query(detailsQuery, [assignmentData.user_id, assignmentData.template_id])
  const details = detailsResult.rows[0]

  // Send assignment notification email
  try {
    const emailTemplate = emailService.getDocumentAssignmentTemplate()
    await emailService.sendEmail({
      to: [{ email: details.user_email, name: details.user_name }],
      template: emailTemplate,
      variables: {
        userName: details.user_name,
        documentName: details.template_name,
        dueDate: assignmentData.due_date ? new Date(assignmentData.due_date).toLocaleDateString() : "No due date",
        priority: assignmentData.priority
      }
    })
  } catch (emailError) {
    console.error("Failed to send assignment email:", emailError)
  }

  // Invalidate cache
  globalCache.invalidateByTag("document_assignments")

  return NextResponse.json({
    success: true,
    assignment,
    message: "Document assigned successfully"
  })
}

async function handleBulkAssignment(bulkData: BulkAssignDocumentsRequest, user: any) {
  // Validate required fields
  if (!bulkData.template_ids?.length || !bulkData.user_ids?.length) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    )
  }

  const assignments = []
  const errors = []

  for (const templateId of bulkData.template_ids) {
    for (const userId of bulkData.user_ids) {
      try {
        // Check if assignment already exists
        const existingResult = await query(
          "SELECT id FROM document_assignments WHERE user_id = $1 AND template_id = $2",
          [userId, templateId]
        )

        if (existingResult.rows.length === 0) {
          // Insert assignment
          const insertQuery = `
            INSERT INTO document_assignments (
              user_id, template_id, assigned_by, due_date, priority, notes
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `

          const result = await query(insertQuery, [
            userId,
            templateId,
            user.id,
            bulkData.due_date,
            bulkData.priority,
            bulkData.notes
          ])

          assignments.push(result.rows[0])
        }
      } catch (error) {
        errors.push(`Failed to assign template ${templateId} to user ${userId}: ${error.message}`)
      }
    }
  }

  // Invalidate cache
  globalCache.invalidateByTag("document_assignments")

  return NextResponse.json({
    success: true,
    assignments,
    errors,
    message: `Successfully assigned ${assignments.length} documents. ${errors.length} errors occurred.`
  })
}
