"use client"

import { useState, useEffect } from "react"
import { Loader2, Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, Google } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  webViewLink: string;
  thumbnailLink?: string;
}

interface ImportResults {
  clients: { created: number; updated: number; errors: number };
  jobs: { created: number; updated: number; errors: number };
  shifts: { created: number; updated: number; errors: number };
  assignments: { created: number; errors: number };
}

export default function ImportPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [files, setFiles] = useState<DriveFile[]>([])
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null)
  const [extractedData, setExtractedData] = useState<any>(null)
  const [importResults, setImportResults] = useState<ImportResults | null>(null)
  const [step, setStep] = useState<'auth' | 'select' | 'preview' | 'import' | 'complete'>('auth')
  const { toast } = useToast()

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/import/google-drive/files')
      if (response.ok) {
        setIsAuthenticated(true)
        setStep('select')
        loadFiles()
      }
    } catch (error) {
      console.log('Not authenticated with Google Drive')
    }
  }

  const authenticateWithGoogle = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/import/google-drive/auth')
      const data = await response.json()

      if (data.success) {
        window.location.href = data.authUrl
      } else {
        throw new Error('Failed to get auth URL')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to authenticate with Google Drive",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadFiles = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/import/google-drive/files')
      const data = await response.json()

      if (data.success) {
        setFiles(data.files)
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load files from Google Drive",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const extractData = async (file: DriveFile) => {
    try {
      setIsLoading(true)
      setSelectedFile(file)

      const response = await fetch('/api/import/google-drive/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id }),
      })

      const data = await response.json()

      if (data.success) {
        setExtractedData(data.data)
        setStep('preview')
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to extract data from file",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const importData = async () => {
    try {
      setIsLoading(true)

      const response = await fetch('/api/import/google-drive/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedData }),
      })

      const data = await response.json()

      if (data.success) {
        setImportResults(data.results)
        setStep('complete')
        toast({
          title: "Success",
          description: "Data imported successfully!",
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return 'Unknown size'
    const size = parseInt(bytes)
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  const getMimeTypeIcon = (mimeType: string) => {
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
      return <FileSpreadsheet className="h-8 w-8 text-green-600" />
    }
    return <FileSpreadsheet className="h-8 w-8 text-blue-600" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Import</h1>
          <p className="text-muted-foreground">
            Import client and shift data from Google Sheets and Excel files
          </p>
        </div>
      </div>

      {/* Step 1: Authentication */}
      {step === 'auth' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Google className="h-6 w-6" />
              Connect to Google Drive
            </CardTitle>
            <CardDescription>
              Authenticate with Google Drive to access your spreadsheet files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Google className="h-16 w-16 mx-auto mb-4 text-blue-600" />
              <p className="text-muted-foreground mb-6">
                Connect your Google Drive account to import client and shift data from spreadsheets
              </p>
              <Button onClick={authenticateWithGoogle} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Google className="mr-2 h-4 w-4" />
                Connect Google Drive
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: File Selection */}
      {step === 'select' && (
        <Card>
          <CardHeader>
            <CardTitle>Select Spreadsheet File</CardTitle>
            <CardDescription>
              Choose a Google Sheets or Excel file to import data from
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading files...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-8">
                <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No spreadsheet files found in your Google Drive</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => extractData(file)}
                  >
                    <div className="flex items-center gap-3">
                      {getMimeTypeIcon(file.mimeType)}
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file.size)} • Modified {new Date(file.modifiedTime).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Upload className="mr-2 h-4 w-4" />
                      Import
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
