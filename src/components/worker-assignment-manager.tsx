'use client';

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, Minus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { RoleCode } from "@/lib/types"

interface WorkerRequirement {
  roleCode: RoleCode;
  roleName: string;
  count: number;
  color: string;
}

interface WorkerAssignmentManagerProps {
  shiftId: string;
  shift: {
    requestedWorkers?: number;
  };
  onUpdate: () => void;
}

const ROLE_DEFINITIONS: Record<RoleCode, { name: string; color: string; bgColor: string }> = {
  "CC": { name: "Crew Chief", color: "text-purple-700", bgColor: "bg-purple-100" },
  "SH": { name: "Stage Hand", color: "text-blue-700", bgColor: "bg-blue-100" },
  "FO": { name: "Fork Operator", color: "text-green-700", bgColor: "bg-green-100" },
  "RFO": { name: "Reach Fork Operator", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  "RG": { name: "Rigger", color: "text-red-700", bgColor: "bg-red-100" },
  "GL": { name: "General Labor", color: "text-gray-700", bgColor: "bg-gray-100" },
} as const

export default function WorkerAssignmentManager({ shiftId, shift, onUpdate }: WorkerAssignmentManagerProps) {
  const { toast } = useToast()
  const [workerRequirements, setWorkerRequirements] = useState<WorkerRequirement[]>([])
  const [isUpdating, setIsUpdating] = useState(false)

  // Initialize worker requirements based on shift data
  useEffect(() => {
    if (shift && !isUpdating) {
      const requestedWorkers = shift.requestedWorkers || 1
      
      // Initialize requirements for all role types with 0 count
      const initialRequirements = Object.entries(ROLE_DEFINITIONS).map(([code, def]) => ({
        roleCode: code as RoleCode,
        roleName: def.name,
        count: code === "CC" ? 1 : code === "SH" ? Math.max(0, requestedWorkers - 1) : 0,
        color: def.color
      }))
      setWorkerRequirements(initialRequirements)
    }
  }, [shift, isUpdating])

  const updateWorkerRequirement = async (roleCode: RoleCode, newCount: number) => {
    if (isUpdating) return
    setIsUpdating(true)

    try {
      // Update local state first for immediate UI feedback
      const updatedRequirements = workerRequirements.map(req =>
        req.roleCode === roleCode ? { ...req, count: Math.max(0, newCount) } : req
      )
      
      setWorkerRequirements(updatedRequirements)

      // Calculate new total
      const newTotal = updatedRequirements.reduce((sum, req) => sum + req.count, 0)

      // Update API with just the total (current system limitation)
      const response = await fetch(`/api/shifts/${shiftId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          requestedWorkers: newTotal
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update worker requirements")
      }

      onUpdate()

      toast({
        title: "Success",
        description: `Updated ${ROLE_DEFINITIONS[roleCode].name} requirement to ${newCount}`,
      })
    } catch (error) {
      // Revert local state on error by resetting to previous state
      const requestedWorkers = shift.requestedWorkers || 1
      const revertedRequirements = Object.entries(ROLE_DEFINITIONS).map(([code, def]) => ({
        roleCode: code as RoleCode,
        roleName: def.name,
        count: code === "CC" ? 1 : code === "SH" ? Math.max(0, requestedWorkers - 1) : 0,
        color: def.color
      }))
      setWorkerRequirements(revertedRequirements)
      
      toast({
        title: "Error",
        description: "Failed to update worker requirements",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Worker Requirements
        </CardTitle>
        <CardDescription>
          Configure worker requirements for this shift
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(Object.entries(ROLE_DEFINITIONS) as [RoleCode, typeof ROLE_DEFINITIONS[RoleCode]][]).map(([roleCode, roleDef]) => {
            const requirement = workerRequirements.find(req => req.roleCode === roleCode) || {
              roleCode,
              roleName: roleDef.name,
              count: 0,
              color: roleDef.color
            }
            
            return (
              <div key={roleCode} className={`p-3 rounded-lg border ${roleDef.bgColor}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium ${roleDef.color}`}>{roleDef.name}</span>
                  <Badge variant="outline">{roleCode}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateWorkerRequirement(roleCode, requirement.count - 1)}
                    disabled={requirement.count === 0 || isUpdating}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center font-medium">{requirement.count}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateWorkerRequirement(roleCode, requirement.count + 1)}
                    disabled={isUpdating}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
