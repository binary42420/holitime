"use client"

import { useParams } from 'next/navigation'
import ExportTemplateEditor from '@/components/export-template-editor'

export default function EditExportTemplatePage() {
  const params = useParams()
  const templateId = params.id as string

  return <ExportTemplateEditor mode="edit" templateId={templateId} />
}
