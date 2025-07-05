"use client"

import React, { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, X, AlertCircle, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CompanyLogo } from "@/components/ui/company-logo"
import { cn } from "@/lib/utils"

interface LogoUploadProps {
  currentLogoUrl?: string | null
  companyName: string
  onLogoChange: (file: File | null) => void
  onLogoRemove?: () => void
  disabled?: boolean
  className?: string
}

const ACCEPTED_FILE_TYPES = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/svg+xml": [".svg"]
}

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

export function LogoUpload({
  currentLogoUrl,
  companyName,
  onLogoChange,
  onLogoRemove,
  disabled = false,
  className
}: LogoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null)

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.errors.some((e: any) => e.code === "file-too-large")) {
        setError("File size must be less than 2MB")
      } else if (rejection.errors.some((e: any) => e.code === "file-invalid-type")) {
        setError("Only PNG, JPG, JPEG, and SVG files are allowed")
      } else {
        setError("Invalid file")
      }
      return
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      
      // Create preview
      const reader = new FileReader()
      reader.onload = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Call the onChange handler
      onLogoChange(file)
    }
  }, [onLogoChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    disabled: disabled || uploading
  })

  const handleRemove = () => {
    setPreview(null)
    setError(null)
    onLogoChange(null)
    if (onLogoRemove) {
      onLogoRemove()
    }
  }

  const displayLogoUrl = preview || currentLogoUrl

  return (
    <div className={cn("space-y-4", className)}>
      {/* Current Logo Display */}
      {displayLogoUrl && (
        <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
          <CompanyLogo
            companyName={companyName}
            logoUrl={displayLogoUrl}
            size="lg"
          />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {preview ? "New logo preview" : "Current logo"}
            </p>
            <p className="text-xs text-muted-foreground">
              {companyName}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={disabled || uploading}
          >
            <X className="w-4 h-4 mr-1" />
            Remove
          </Button>
        </div>
      )}

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          disabled || uploading ? "opacity-50 cursor-not-allowed" : "hover:border-primary hover:bg-primary/5",
          error && "border-destructive bg-destructive/5"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-2">
          <Upload className={cn(
            "w-8 h-8",
            isDragActive ? "text-primary" : "text-muted-foreground"
          )} />
          
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isDragActive ? "Drop the logo here" : "Upload company logo"}
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, JPEG, or SVG up to 2MB
            </p>
          </div>
          
          {!isDragActive && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading}
            >
              Choose File
            </Button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Upload Status */}
      {uploading && (
        <div className="flex items-center gap-2 p-3 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Uploading logo...
        </div>
      )}

      {/* Success Message */}
      {preview && !error && !uploading && (
        <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg">
          <Check className="w-4 h-4" />
          Logo ready to upload
        </div>
      )}
    </div>
  )
}

export default LogoUpload
