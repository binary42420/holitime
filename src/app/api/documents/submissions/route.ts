import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { query } from '@/lib/db'
import { globalCache } from '@/lib/cache'
import { DocumentSubmission, SubmitDocumentRequest } from '@/types/documents'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get('assignment_id')
    const userId = searchParams.get('user_id')
    const templateId = searchParams.get('template_id')
    const isDraft = searchParams.get('is_draft')

    // Build query conditions
    let whereConditions: string[] = []
    let queryParams: any[] = []
    let paramIndex = 1

    // For non-admin users, only show their own submissions
    if (user.role !== 'Manager/Admin' && user.role !== 'Crew Chief') {
      whereConditions.push(`ds.user_id = $${paramIndex}`)
      queryParams.push(user.id)
      paramIndex++
    } else if (userId) {
      whereConditions.push(`ds.user_id = $${paramIndex}`)
      queryParams.push(parseInt(userId))
      paramIndex++
    }

    if (assignmentId) {
      whereConditions.push(`ds.assignment_id = $${paramIndex}`)
      queryParams.push(parseInt(assignmentId))
      paramIndex++
    }

    if (templateId) {
      whereConditions.push(`ds.template_id = $${paramIndex}`)
      queryParams.push(parseInt(templateId))
      paramIndex++
    }

    if (isDraft !== null) {
      whereConditions.push(`ds.is_draft = $${paramIndex}`)
      queryParams.push(isDraft === 'true')
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    const submissionsQuery = `
      SELECT 
        ds.*,
        da.status as assignment_status,
        da.due_date,
        dt.name as template_name,
        dt.document_type,
        u.name as user_name,
        u.email as user_email
      FROM document_submissions ds
      JOIN document_assignments da ON ds.assignment_id = da.id
      JOIN document_templates dt ON ds.template_id = dt.id
      JOIN users u ON ds.user_id = u.id
      ${whereClause}
      ORDER BY ds.last_modified DESC
    `

    const result = await query(submissionsQuery, queryParams)
    
    const submissions: DocumentSubmission[] = result.rows.map(row => ({
      id: row.id,
      assignment_id: row.assignment_id,
      user_id: row.user_id,
      template_id: row.template_id,
      submission_data: row.submission_data,
      file_path: row.file_path,
      file_size: row.file_size,
      submitted_at: row.submitted_at,
      last_modified: row.last_modified,
      version: row.version,
      is_draft: row.is_draft,
      signature_data: row.signature_data,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      created_at: row.created_at,
      updated_at: row.updated_at,
      template: {
        id: row.template_id,
        name: row.template_name,
        description: '',
        document_type: row.document_type,
        file_path: '',
        file_size: 0,
        mime_type: '',
        version: 1,
        is_active: true,
        is_required: false,
        applicable_roles: [],
        auto_assign_new_users: false,
        created_at: '',
        updated_at: ''
      },
      user: {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email
      }
    }))

    return NextResponse.json({ submissions })
  } catch (error) {
    console.error('Error fetching document submissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const submissionData: SubmitDocumentRequest = await request.json()

    // Validate required fields
    if (!submissionData.assignment_id || !submissionData.submission_data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get assignment details
    const assignmentQuery = `
      SELECT da.*, dt.name as template_name, u.name as user_name, u.email as user_email
      FROM document_assignments da
      JOIN document_templates dt ON da.template_id = dt.id
      JOIN users u ON da.user_id = u.id
      WHERE da.id = $1
    `
    const assignmentResult = await query(assignmentQuery, [submissionData.assignment_id])
    
    if (assignmentResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    const assignment = assignmentResult.rows[0]

    // Check if user can submit this document
    if (user.role !== 'Manager/Admin' && user.role !== 'Crew Chief' && assignment.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get current submission version
    const versionResult = await query(
      'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM document_submissions WHERE assignment_id = $1',
      [submissionData.assignment_id]
    )
    const nextVersion = versionResult.rows[0].next_version

    // Prepare signature data
    let signatureData = null
    if (submissionData.signature_data) {
      signatureData = {
        signature: submissionData.signature_data.signature,
        timestamp: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      }
    }

    // Insert submission
    const insertQuery = `
      INSERT INTO document_submissions (
        assignment_id, user_id, template_id, submission_data, version, is_draft,
        signature_data, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `

    const result = await query(insertQuery, [
      submissionData.assignment_id,
      assignment.user_id,
      assignment.template_id,
      JSON.stringify(submissionData.submission_data),
      nextVersion,
      submissionData.is_draft,
      signatureData ? JSON.stringify(signatureData) : null,
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      request.headers.get('user-agent')
    ])

    const submission = result.rows[0]

    // Update assignment status
    let newStatus = 'in_progress'
    if (!submissionData.is_draft) {
      newStatus = 'completed'
    }

    await query(
      'UPDATE document_assignments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newStatus, submissionData.assignment_id]
    )

    // If not a draft, create approval record
    if (!submissionData.is_draft) {
      await query(`
        INSERT INTO document_approvals (
          submission_id, assignment_id, reviewer_id, status, approval_level, is_final_approval
        ) VALUES ($1, $2, $3, 'pending', 1, true)
      `, [submission.id, submissionData.assignment_id, assignment.user_id])

      // Update assignment status to under_review
      await query(
        'UPDATE document_assignments SET status = $1 WHERE id = $2',
        ['under_review', submissionData.assignment_id]
      )
    }

    // Invalidate cache
    globalCache.invalidateByTag('document_submissions');
    globalCache.invalidateByTag('document_assignments');

    return NextResponse.json({
      success: true,
      submission,
      message: submissionData.is_draft ? 'Document saved as draft' : 'Document submitted successfully'
    })
  } catch (error) {
    console.error('Error submitting document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const submissionId = searchParams.get('id')
    
    if (!submissionId) {
      return NextResponse.json(
        { error: 'Submission ID required' },
        { status: 400 }
      )
    }

    const updateData = await request.json()

    // Get existing submission
    const existingResult = await query(
      'SELECT ds.*, da.user_id as assignment_user_id FROM document_submissions ds JOIN document_assignments da ON ds.assignment_id = da.id WHERE ds.id = $1',
      [submissionId]
    )

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    const existingSubmission = existingResult.rows[0]

    // Check permissions
    if (user.role !== 'Manager/Admin' && user.role !== 'Crew Chief' && existingSubmission.assignment_user_id !== user.id) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Update submission
    const updateQuery = `
      UPDATE document_submissions 
      SET 
        submission_data = COALESCE($1, submission_data),
        is_draft = COALESCE($2, is_draft),
        signature_data = COALESCE($3, signature_data),
        last_modified = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `

    let signatureData = existingSubmission.signature_data
    if (updateData.signature_data) {
      signatureData = JSON.stringify({
        signature: updateData.signature_data.signature,
        timestamp: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      })
    }

    const result = await query(updateQuery, [
      updateData.submission_data ? JSON.stringify(updateData.submission_data) : null,
      updateData.is_draft,
      signatureData,
      submissionId
    ])

    const updatedSubmission = result.rows[0]

    // Update assignment status if needed
    if (updateData.is_draft === false && existingSubmission.is_draft === true) {
      await query(
        'UPDATE document_assignments SET status = $1 WHERE id = $2',
        ['under_review', existingSubmission.assignment_id]
      )
    }

    // Invalidate cache
    globalCache.invalidateByTag('document_submissions');
    globalCache.invalidateByTag('document_assignments');

    return NextResponse.json({
      success: true,
      submission: updatedSubmission,
      message: 'Document updated successfully'
    })
  } catch (error) {
    console.error('Error updating document submission:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
