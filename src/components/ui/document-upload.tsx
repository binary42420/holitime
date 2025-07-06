"use client"

import React, { useState, useCallback, useRef } from "react"
import { Button } from "@/app/(app)/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/(app)/components/ui/card"
import { Input } from "@/app/(app)/components/ui/input"
import { Label } from "@/app/(app)/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/(app)/components/ui/select"
import { CameraCapture } from "@/app/(app)/components/ui/camera-capture"
import { 
  Upload, 
  Camera, 
  FileText, 
  X, 
  AlertCircle,
  CheckCircle
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { DocumentType } from "@/lib/types"

interface DocumentUploadProps {
  documentTypes: DocumentType[]
  onUploadSuccess: () => void
  disabled?: boolean
}

export function DocumentUpload({ documentTypes, onUploadSuccess, disabled }: DocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentTypeId, setDocumentTypeId] = useState("")
  const [expirationDate, setExpirationDate] = useState("")
  const [showCamera, setShowCamera] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const selectedDocumentType = documentTypes.find(dt => dt.id === documentTypeId)

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "File size must be less than 10MB",
          variant: "destructive",
        })
        return
      }

      // Validate file type
      const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/heic"]
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please select a PDF, JPG, PNG, or HEIC file",
          variant: "destructive",
        })
        return
      }

      setSelectedFile(file)
    }
  }, [toast])

  const handleCameraCapture = useCallback((file: File) => {
    setSelectedFile(file)
    setShowCamera(false)
  }, [])

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [])

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !documentTypeId) {
      toast({
        title: "Missing Information",
        description: "Please select a file and document type",
        variant: "destructive",
      })
      return
    }

    if (selectedDocumentType?.requiresExpiration && !expirationDate) {
      toast({
        title: "Expiration Date Required",
        description: "This document type requires an expiration date",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("documentTypeId", documentTypeId)
      if (expirationDate) {
        formData.append("expirationDate", expirationDate)
      }

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Upload failed")
      }

      const result = await response.json()

      toast({
        title: "Upload Successful",
        description: "Your document has been uploaded and is pending review",
      })

      // Reset form
      setSelectedFile(null)
      setDocumentTypeId("")
      setExpirationDate("")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      onUploadSuccess()

    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }, [selectedFile, documentTypeId, expirationDate, selectedDocumentType, toast, onUploadSuccess])

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handleCameraCapture}
        onCancel={() => setShowCamera(false)}
        disabled={disabled}
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Document
        </CardTitle>
        <CardDescription>
          Upload a document or take a photo using your camera
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Document Type Selection */}
        <div className="space-y-2">
          <Label htmlFor="documentType">Document Type *</Label>
          <Select value={documentTypeId} onValueChange={setDocumentTypeId} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Select document type" />
            </SelectTrigger>
            <SelectContent>
              {documentTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                  {type.isCertification && " (Certification)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Expiration Date (if required) */}
        {selectedDocumentType?.requiresExpiration && (
          <div className="space-y-2">
            <Label htmlFor="expirationDate">Expiration Date *</Label>
            <Input
              id="expirationDate"
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              disabled={disabled}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
        )}

        {/* File Selection */}
        <div className="space-y-4">
          <Label>Select File</Label>
          
          {!selectedFile ? (
            <div className="space-y-3">
              {/* File Upload Button */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.heic"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={disabled}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Choose File from Device
                </Button>
              </div>

              {/* Camera Button */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCamera(true)}
                disabled={disabled}
                className="w-full"
              >
                <Camera className="h-4 w-4 mr-2" />
                Take Photo with Camera
              </Button>
            </div>
          ) : (
            /* Selected File Display */
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  disabled={disabled || isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {selectedFile.type.startsWith("image/") && (
                <div className="mt-3">
                  <Image
                    src={URL.createObjectURL(selectedFile)}
                    alt="Preview"
                    width={200}
                    height={100}
                    className="max-w-full h-32 object-contain rounded border"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={disabled || !selectedFile || !documentTypeId || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </>
          )}
        </Button>

        {/* Help Text */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• Supported formats: PDF, JPG, PNG, HEIC</p>
          <p>• Maximum file size: 10MB</p>
          <p>• Documents will be reviewed by administrators</p>
        </div>
      </CardContent>
    </Card>
  )
}
