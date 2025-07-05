'use client';

import React, { useState, useCallback } from "react"
import { Button } from "@/app/(app)/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/(app)/components/ui/card"
import { 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Printer,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PDFViewerProps {
  fileUrl: string
  filename: string
  className?: string
}

export function PDFViewer({ fileUrl, filename, className }: PDFViewerProps) {
  const [scale, setScale] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.25, 3))
  }, [])

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.25, 0.5))
  }, [])

  const handlePreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1))
  }, [])

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages))
  }, [totalPages])

  const handleDownload = useCallback(() => {
    try {
      const link = document.createElement("a")
      link.href = fileUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast({
        title: "Download Started",
        description: `Downloading ${filename}`,
      })
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Unable to download the file. Please try again.",
        variant: "destructive",
      })
    }
  }, [fileUrl, filename, toast])

  const handlePrint = useCallback(() => {
    try {
      const printWindow = window.open(fileUrl, "_blank")
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print()
        }
      } else {
        toast({
          title: "Print Failed",
          description: "Unable to open print dialog. Please check popup blockers.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Print Failed",
        description: "Unable to print the document. Please try again.",
        variant: "destructive",
      })
    }
  }, [fileUrl, toast])

  const handleLoad = useCallback(() => {
    setIsLoading(false)
    setError(null)
  }, [])

  const handleError = useCallback(() => {
    setIsLoading(false)
    setError("Failed to load PDF document")
  }, [])

  // Check if the file is a PDF
  const isPDF = fileUrl.toLowerCase().endsWith(".pdf") || fileUrl.includes("application/pdf")

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <div>
              <h3 className="text-lg font-semibold">Unable to Load Document</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button onClick={handleDownload} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {filename}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isPDF && (
              <>
                <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={scale <= 0.5}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[60px] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={scale >= 3}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button variant="outline" size="icon" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {isPDF && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading document...</p>
              </div>
            </div>
          )}
          
          {isPDF ? (
            <iframe
              src={`${fileUrl}#page=${currentPage}&zoom=${scale * 100}`}
              className="w-full h-[600px] border rounded-lg"
              onLoad={handleLoad}
              onError={handleError}
              title={filename}
            />
          ) : (
            <div className="text-center">
              <Image
              src={fileUrl}
              alt={filename}
              width={800} // You might need to adjust these based on expected image sizes
              height={600} // You might need to adjust these based on expected image sizes
              className="max-w-full h-auto rounded-lg mx-auto"
              style={{ transform: `scale(${scale})` }}
              onLoad={handleLoad}
              onError={handleError}
            />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
