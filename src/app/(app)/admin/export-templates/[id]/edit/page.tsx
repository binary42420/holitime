"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import ExportTemplateEditor from "@/app/(app)/components/export-template-editor"

export default function EditExportTemplatePage() {
  const params = useParams()
  const [templateId, setTemplateId] = useState<string>("")

  // Unwrap params
  useEffect(() => {
    if (params.id) {
      setTemplateId(params.id as string)
    }
  }, [params.id])

  if (!templateId) {
    return <div>Loading...</div>
  }

  return <ExportTemplateEditor mode="edit" templateId={templateId} />
}
