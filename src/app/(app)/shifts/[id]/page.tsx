"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useShift } from "@/hooks/use-api"
import ShiftTimeManagement from "@/components/shift-time-management"
import { WorkerTypeConfigurator } from "@/components/worker-type-configurator"
import { generateShiftEditUrl } from "@/lib/url-utils"
import { CrewChiefPermissionManager } from "@/components/crew-chief-permission-manager"
import { DangerZone } from "@/components/danger-zone"
import { AssignedWorker } from "@/types"

export default function ShiftPage() {
  const router = useRouter()
  const params = useParams()
  const shiftId = params?.id ?? ""

  const { user } = useUser()
  const shiftData = useShift(shiftId)
  const shift = shiftData.data?.shift
  const initialAssignedPersonnel = shiftData.data?.assignedPersonnel
  const canManage = shiftData.data?.canManage
  const handleRefresh = shiftData.refetch

  const [assignedPersonnel, setAssignedPersonnel] = useState<AssignedWorker[] | undefined>(undefined)

  useEffect(() => {
    if (initialAssignedPersonnel) {
      setAssignedPersonnel(initialAssignedPersonnel)
    }
  }, [initialAssignedPersonnel])

  if (!shift || assignedPersonnel === undefined) {
    return <div>Loading...</div>
  }

  const handleUpdatePersonnel = (updatedPersonnel: AssignedWorker[]) => {
    setAssignedPersonnel(updatedPersonnel)
    // Optionally, you might want to trigger a refetch or a save operation here
    // handleRefresh() 
  }

  return (
    <>
      <ShiftTimeManagement
        shiftId={shiftId}
        assignedPersonnel={assignedPersonnel}
        canManage={canManage}
        onUpdate={handleRefresh}
        onUpdatePersonnel={handleUpdatePersonnel}
      />

      {/* Other page content */}
    </>
  )
}
