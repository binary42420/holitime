"use client"

import React, { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { AssignedWorker } from "@/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const workerTypeLabels: { [key: string]: string } = {
  L1: "Laborer L1",
  L2: "Laborer L2",
  L3: "Laborer L3",
  L4: "Laborer L4",
  L5: "Laborer L5",
  S1: "Skilled Laborer S1",
  S2: "Skilled Laborer S2",
  S3: "Skilled Laborer S3",
  S4: "Skilled Laborer S4",
  S5: "Skilled Laborer S5",
  CC: "Crew Chief",
}

interface WorkerTypeConfiguratorProps {
  shiftId: string
  assignedPersonnel: AssignedWorker[]
  onUpdatePersonnel: (personnel: AssignedWorker[]) => void
  onFinalizeUpdate: () => void
}

interface WorkerTypeCount {
  [key: string]: number
}

export const WorkerTypeConfigurator = ({
  shiftId,
  assignedPersonnel,
  onUpdatePersonnel,
  onFinalizeUpdate,
}: WorkerTypeConfiguratorProps) => {
  const { toast } = useToast()
  const [workerTypeCounts, setWorkerTypeCounts] = useState<WorkerTypeCount>({})

  useEffect(() => {
    const counts: WorkerTypeCount = {}
    assignedPersonnel.forEach(worker => {
      counts[worker.roleCode] = (counts[worker.roleCode] || 0) + 1
    })
    setWorkerTypeCounts(counts)
  }, [assignedPersonnel])

  const incrementWorkerType = (workerType: string) => {
    const newPersonnel = [
      ...assignedPersonnel,
      {
        id: `new-${workerType}-${Date.now()}`,
        roleOnShift: workerTypeLabels[workerType] || workerType,
        roleCode: workerType,
        status: "not_started",
        timeEntries: [],
      },
    ]
    onUpdatePersonnel(newPersonnel)
  }

  const decrementWorkerType = (workerType: string) => {
    const lastIndexOfType = assignedPersonnel
      .map(p => p.roleCode)
      .lastIndexOf(workerType)
    if (lastIndexOfType === -1) return

    const personnelToRemove = assignedPersonnel[lastIndexOfType]
    // Prevent removing assigned workers
    if (personnelToRemove.employeeId) {
      toast({
        title: "Cannot remove assigned worker",
        description:
          "Please unassign the worker before removing this slot.",
        variant: "destructive",
      })
      return
    }

    const newPersonnel = assignedPersonnel.filter(
      (_, index) => index !== lastIndexOfType
    )
    onUpdatePersonnel(newPersonnel)
  }

  const handleSaveChanges = async () => {
    try {
      const response = await fetch(`/api/shifts/${shiftId}/personnel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personnel: assignedPersonnel }),
      })

      if (!response.ok) {
        throw new Error("Failed to save changes.")
      }

      toast({
        title: "Success",
        description: "Worker requirements have been updated.",
      })
      onFinalizeUpdate()
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to update worker requirements.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Configure Worker Types</h3>
      <p className="text-sm text-gray-500 mb-4">
        Set the number of each type of worker required for this shift.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Object.entries(workerTypeLabels).map(([code, label]) => (
          <div
            key={code}
            className="flex flex-col items-center justify-center p-3 border rounded-md bg-gray-50"
          >
            <span className="font-medium text-sm text-center mb-2">
              {label}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => decrementWorkerType(code)}
                disabled={(workerTypeCounts[code] || 0) === 0}
              >
                -
              </Button>
              <span className="text-lg font-bold w-6 text-center">
                {workerTypeCounts[code] || 0}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => incrementWorkerType(code)}
              >
                +
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={handleSaveChanges}>Save Changes</Button>
      </div>
    </div>
  )
}
