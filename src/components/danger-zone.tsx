"use client"

import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"
import { CascadeDeleteDialog } from "./cascade-delete-dialog"

interface DangerZoneProps {
  entityType: "client" | "job" | "shift";
  entityId: string;
  entityName: string;
  onSuccess?: () => void;
  redirectTo?: string;
  className?: string;
}

export function DangerZone({
  entityType,
  entityId,
  entityName,
  onSuccess,
  redirectTo,
  className
}: DangerZoneProps) {
  const { data: session } = useSession()

  // Only show for admins/managers
  if (session?.user?.role !== "Manager/Admin") {
    return null
  }

  const getEntityTypeLabel = () => {
    switch (entityType) {
    case "client":
      return "Client Company"
    case "job":
      return "Job"
    case "shift":
      return "Shift"
    default:
      return "Entity"
    }
  }

  const getDescription = () => {
    switch (entityType) {
    case "client":
      return "Permanently delete this client company and all associated jobs, shifts, and data. This action affects the most data and cannot be undone."
    case "job":
      return "Permanently delete this job and all associated shifts and data. This action cannot be undone."
    case "shift":
      return "Permanently delete this shift and all associated data. This action cannot be undone."
    default:
      return "Permanently delete this entity and all associated data."
    }
  }

  return (
    <Card className={`border-destructive/20 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Danger Zone
        </CardTitle>
        <CardDescription>
          {getDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Delete {getEntityTypeLabel()}</h4>
            <p className="text-sm text-muted-foreground">
              Once you delete this {getEntityTypeLabel().toLowerCase()}, there is no going back.
            </p>
          </div>
          <CascadeDeleteDialog
            entityType={entityType}
            entityId={entityId}
            entityName={entityName}
            onSuccess={onSuccess}
            redirectTo={redirectTo}
          />
        </div>
      </CardContent>
    </Card>
  )
}
