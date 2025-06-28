'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Loader2, FileSpreadsheet, Download, AlertCircle, CheckCircle, Sparkles } from 'lucide-react'

interface GoogleSheetsGeminiProcessorProps {
  selectedFile: any
  onCSVGenerated: (csvData: string) => void
}

interface GeminiResponse {
  csvData: string
  summaryReport: string
  originalResponse: string
}

export default function GoogleSheetsGeminiProcessor({ selectedFile, onCSVGenerated }: GoogleSheetsGeminiProcessorProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [geminiResult, setGeminiResult] = useState<GeminiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const processWithGemini = async () => {
    if (!selectedFile) return

    setIsProcessing(true)
    setError(null)
    setGeminiResult(null)

    try {
      console.log('Processing Google Sheets with Gemini:', selectedFile.id)

      // First, get the sheets data from Google Sheets API
      const sheetsResponse = await fetch(`/api/import/google-sheets/fetch/${selectedFile.id}`)

      if (!sheetsResponse.ok) {
        const errorData = await sheetsResponse.json()
        throw new Error(errorData.error || 'Failed to fetch Google Sheets data')
      }

      const sheetsData = await sheetsResponse.json()

      // Then process with Gemini
      const geminiResponse = await fetch('/api/import/google-sheets/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          googleSheetsId: selectedFile.id,
          sheetsData: sheetsData
        })
      })

      if (!geminiResponse.ok) {
        const errorData = await geminiResponse.json()
        throw new Error(errorData.error || 'Failed to process with Gemini')
      }

      const result = await geminiResponse.json()
      setGeminiResult(result)

      toast({
        title: 'Processing Complete',
        description: 'Google Sheets data has been successfully processed by Gemini AI'
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process Google Sheets'
      setError(errorMessage)
      toast({
        title: 'Processing Failed',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadCSV = () => {
    if (!geminiResult?.csvData) return

    const blob = new Blob([geminiResult.csvData], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedFile.name}_processed.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    toast({
      title: 'CSV Downloaded',
      description: 'Processed CSV file has been downloaded'
    })
  }

  const useGeneratedCSV = () => {
    if (!geminiResult?.csvData) return
    onCSVGenerated(geminiResult.csvData)
    toast({
      title: 'CSV Loaded',
      description: 'Generated CSV data is now ready for import'
    })
  }

  return (
    <div className="space-y-4">
      {/* File Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI-Powered Data Extraction
          </CardTitle>
          <CardDescription>
            Use Gemini AI to automatically extract and transform your Google Sheets data into Holitime's CSV format
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <FileSpreadsheet className="h-4 w-4" />
            <div>
              <div className="font-medium">{selectedFile.name}</div>
              <div className="text-sm text-muted-foreground">
                Last modified: {new Date(selectedFile.modifiedTime).toLocaleString()}
              </div>
            </div>
          </div>

          <Button 
            onClick={processWithGemini} 
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing with Gemini AI...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Process with Gemini AI
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {geminiResult && (
        <div className="space-y-4">
          {/* Success Message */}
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Gemini AI has successfully processed your Google Sheets data and generated a standardized CSV file.
            </AlertDescription>
          </Alert>

          {/* CSV Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Generated CSV Data</CardTitle>
              <CardDescription>
                Preview of the extracted and transformed data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap max-h-40">
                  {geminiResult.csvData.split('\n').slice(0, 10).join('\n')}
                  {geminiResult.csvData.split('\n').length > 10 && '\n... (truncated)'}
                </pre>
              </div>

              <div className="flex gap-2">
                <Button onClick={downloadCSV} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
                <Button onClick={useGeneratedCSV}>
                  Use This CSV for Import
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary Report */}
          <Card>
            <CardHeader>
              <CardTitle>Processing Summary</CardTitle>
              <CardDescription>
                Detailed analysis of the data extraction and transformation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={geminiResult.summaryReport}
                readOnly
                className="min-h-[200px] font-mono text-sm"
              />
            </CardContent>
          </Card>

          {/* Raw Response (for debugging) */}
          <details className="group">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Show Raw Gemini Response
            </summary>
            <Card className="mt-2">
              <CardContent className="pt-4">
                <Textarea
                  value={geminiResult.originalResponse}
                  readOnly
                  className="min-h-[300px] font-mono text-xs"
                />
              </CardContent>
            </Card>
          </details>
        </div>
      )}
    </div>
  )
}
