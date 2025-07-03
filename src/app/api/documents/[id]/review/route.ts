import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { query } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only managers can review documents
    if (user.role !== 'Manager/Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id: documentId } = await params
    const { action, reviewNotes } = await request.json()

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    if (action === 'reject' && !reviewNotes?.trim()) {
      return NextResponse.json(
        { error: 'Review notes are required when rejecting a document' },
        { status: 400 }
      )
    }

    // Get document details
    const documentResult = await query(`
      SELECT d.*, dt.name as document_type_name, dt.is_certification,
             u.name as user_name, u.email as user_email
      FROM documents d
      JOIN document_types dt ON d.document_type_id = dt.id
      JOIN users u ON d.user_id = u.id
      WHERE d.id = $1 AND d.status = 'pending_review'
    `, [documentId])

    if (documentResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Document not found or already reviewed' },
        { status: 404 }
      )
    }

    const document = documentResult.rows[0]
    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    // Update document status
    const updateResult = await query(`
      UPDATE documents 
      SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_notes = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING id, status, reviewed_at
    `, [newStatus, user.id, reviewNotes || null, documentId])

    const updatedDocument = updateResult.rows[0]

    // If approved and it's a certification, update user eligibility
    if (action === 'approve' && document.is_certification) {
      await updateUserCertificationStatus(document.user_id, document.document_type_name)
    }

    // TODO: Send notification to user about document review
    // This would integrate with your existing notification system

    return NextResponse.json({
      success: true,
      message: `Document ${action}d successfully`,
      document: {
        id: updatedDocument.id,
        status: updatedDocument.status,
        reviewedAt: updatedDocument.reviewed_at,
        reviewedBy: user.id,
        reviewNotes: reviewNotes || null
      }
    })

  } catch (error) {
    console.error('Error reviewing document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function updateUserCertificationStatus(userId: string, documentTypeName: string) {
  try {
    let updateField = null
    
    switch (documentTypeName.toLowerCase()) {
      case 'forklift certification':
        updateField = 'fork_operator_eligible'
        break
      case 'osha certification':
        updateField = 'osha_compliant'
        break
      default:
        // No automatic eligibility update for this document type
        return
    }

    if (updateField) {
      await query(`
        UPDATE users 
        SET ${updateField} = true, updated_at = NOW()
        WHERE id = $1
      `, [userId])
      
      console.log(`Updated user ${userId} certification: ${updateField} = true`)
    }
  } catch (error) {
    console.error('Error updating user certification status:', error)
    // Don't throw error here as document review should still succeed
  }
}
