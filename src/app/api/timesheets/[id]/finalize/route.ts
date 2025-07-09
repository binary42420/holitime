import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-config"

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user.role !== 'Manager/Admin') {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = params
    const { signature } = await req.json()

    if (!signature) {
      return new NextResponse("Signature is required", { status: 400 })
    }

    const timesheetResult = await query('SELECT * FROM "Timesheet" WHERE id = $1', [id])
    const timesheet = timesheetResult.rows[0]

    if (!timesheet) {
      return new NextResponse("Timesheet not found", { status: 404 })
    }

    if (timesheet.status !== 'pending_final_approval') {
      return new NextResponse("Timesheet is not awaiting final approval", { status: 400 })
    }

    const updateQuery = `
      UPDATE "Timesheet"
      SET status = 'completed', "managerSignature" = $1, "managerApprovedAt" = $2
      WHERE id = $3
      RETURNING *
    `
    const updatedTimesheetResult = await query(updateQuery, [signature, new Date(), id])
    const updatedTimesheet = updatedTimesheetResult.rows[0]

    return NextResponse.json(updatedTimesheet)
  } catch (error) {
    console.error("[TIMESHEET_FINALIZE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
