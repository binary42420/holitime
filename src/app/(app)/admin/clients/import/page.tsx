"use client"

import React, { useState } from "react"

// Force dynamic rendering to avoid build-time URL issues
export const dynamic = 'force-dynamic'
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  ArrowLeft, 
  Upload,
  FileText,
  Download,
  AlertCircle,
  CheckCircle,
  Building2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ImportClientsPage() {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [importResults, setImportResults] = useState<any>(null)
  const [csvData, setCsvData] = useState("")

  // Redirect if not admin
  if (user?.role !== 'Manager/Admin') {
    router.push('/dashboard')
    return null
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV file.",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/clients/import', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        throw new Error('Failed to import clients')
      }

      const result = await response.json()
      setImportResults(result)

      toast({
        title: "Import Completed",
        description: `Successfully imported ${result.successful} clients.`,
      })

    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import clients. Please check your file format.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  const handleCsvImport = async () => {
    if (!csvData.trim()) {
      toast({
        title: "No Data",
        description: "Please enter CSV data to import.",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    try {
      const response = await fetch('/api/clients/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csvData }),
      })

      if (!response.ok) {
        throw new Error('Failed to import clients')
      }

      const result = await response.json()
      setImportResults(result)

      toast({
        title: "Import Completed",
        description: `Successfully imported ${result.successful} clients.`,
      })

    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import clients. Please check your data format.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const downloadTemplate = () => {
    const csvTemplate = `name,contactPerson,contactEmail,contactPhone,address,notes
"ABC Construction","John Smith","john@abcconstruction.com","555-0123","123 Main St, City, State 12345","Primary contractor for downtown projects"
"XYZ Logistics","Jane Doe","jane@xyzlogistics.com","555-0456","456 Oak Ave, City, State 12345","Warehouse and distribution services"`

    const blob = new Blob([csvTemplate], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'client_import_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/clients')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Clients
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold font-headline">Import Clients</h1>
          <p className="text-muted-foreground">Bulk import client data from CSV files</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              File Upload
            </CardTitle>
            <CardDescription>
              Upload a CSV file containing client data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">CSV File</Label>
              <Input
                id="file"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </div>

            {isUploading && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Download CSV Template
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Manual Entry
            </CardTitle>
            <CardDescription>
              Paste CSV data directly into the text area
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csvData">CSV Data</Label>
              <Textarea
                id="csvData"
                placeholder="name,contactPerson,contactEmail,contactPhone,address,notes&#10;ABC Construction,John Smith,john@abc.com,555-0123,123 Main St,Notes here"
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                rows={8}
                disabled={isUploading}
              />
            </div>

            <Button
              onClick={handleCsvImport}
              disabled={isUploading || !csvData.trim()}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? 'Importing...' : 'Import Data'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CSV Format Requirements</CardTitle>
          <CardDescription>
            Your CSV file must include the following columns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Required columns:</strong> name, contactPerson, contactEmail
              </AlertDescription>
            </Alert>

            <div className="grid gap-2 text-sm">
              <div className="grid grid-cols-3 gap-4 font-medium border-b pb-2">
                <span>Column Name</span>
                <span>Required</span>
                <span>Description</span>
              </div>
              <div className="grid grid-cols-3 gap-4 py-1">
                <span>name</span>
                <span className="text-destructive">Yes</span>
                <span>Company name</span>
              </div>
              <div className="grid grid-cols-3 gap-4 py-1">
                <span>contactPerson</span>
                <span className="text-destructive">Yes</span>
                <span>Primary contact person</span>
              </div>
              <div className="grid grid-cols-3 gap-4 py-1">
                <span>contactEmail</span>
                <span className="text-destructive">Yes</span>
                <span>Contact email address</span>
              </div>
              <div className="grid grid-cols-3 gap-4 py-1">
                <span>contactPhone</span>
                <span className="text-muted-foreground">No</span>
                <span>Contact phone number</span>
              </div>
              <div className="grid grid-cols-3 gap-4 py-1">
                <span>address</span>
                <span className="text-muted-foreground">No</span>
                <span>Company address</span>
              </div>
              <div className="grid grid-cols-3 gap-4 py-1">
                <span>notes</span>
                <span className="text-muted-foreground">No</span>
                <span>Additional notes</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {importResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{importResults.successful}</div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">{importResults.failed}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{importResults.total}</div>
                <div className="text-sm text-muted-foreground">Total Processed</div>
              </div>
            </div>

            {importResults.errors && importResults.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Errors:</h4>
                <div className="space-y-1">
                  {importResults.errors.map((error: string, index: number) => (
                    <Alert key={index} variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button onClick={() => router.push('/admin/clients')}>
                <Building2 className="mr-2 h-4 w-4" />
                View Clients
              </Button>
              <Button variant="outline" onClick={() => setImportResults(null)}>
                Import More
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
