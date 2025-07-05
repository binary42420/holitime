export interface AssignedWorker {
  id: string
  employeeId?: string
  employeeName?: string
  employeeAvatar?: string
  roleOnShift: string
  roleCode: string
  status: "not_started" | "clocked_in" | "clocked_out" | "shift_ended" | "no_show"
  timeEntries: any[]
}
