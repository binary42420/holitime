'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, FileSpreadsheet, ExternalLink, AlertCircle, Info } from 'lucide-react'

interface GoogleSheetsIdInputProps {
  onFileSelected: (file: any) => void
  accessToken?: string | null
}

export default function GoogleSheetsIdInput({ onFileSelected, accessToken }: GoogleSheetsIdInputProps) {
  const { toast } = useToast()
  const [sheetsId, setSheetsId] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugResults, setDebugResults] = useState<any>(null)

  const extractSheetsId = (input: string): string | null => {
    // Remove whitespace
    const trimmed = input.trim()
    
    // If it's already just an ID (no slashes), return it
    if (!trimmed.includes('/')) {
      return trimmed
    }
    
    // Extract from full Google Sheets URL
    const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    if (urlMatch) {
      return urlMatch[1]
    }
    
    return null
  }

  const validateAndProcessSheets = async () => {
    const extractedId = extractSheetsId(sheetsId)
    
    if (!extractedId) {
      setError('Please enter a valid Google Sheets ID or URL')
      return
    }

    setIsValidating(true)
    setError(null)

    try {
      console.log('Validating Google Sheets ID:', extractedId)

      let result: any = null
      let sheetsData: any = null

      // If we have an access token, try OAuth method first (more reliable)
      if (accessToken) {
        try {
          console.log('Trying OAuth method first...')
          const response = await fetch(`/api/import/google-sheets/fetch-with-oauth/${extractedId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ accessToken })
          })

          if (response.ok) {
            result = await response.json()
            if (result.success && result.data) {
              sheetsData = result.data
              console.log('OAuth method successful')
            }
          } else {
            const errorData = await response.json()
            console.log('OAuth method failed:', errorData.error)
          }
        } catch (error) {
          console.log('OAuth method error:', error)
        }
      }

      // If OAuth method failed or no access token, try the API key method (for public sheets)
      if (!sheetsData) {
        try {
          console.log('Trying API key method...')
          const response = await fetch(`/api/import/google-sheets/fetch/${extractedId}`)

          if (response.ok) {
            result = await response.json()
            if (result.success && result.data) {
              sheetsData = result.data
              console.log('API key method successful')
            }
          } else {
            const errorData = await response.json()
            console.log('API key method failed:', errorData.error)
          }
        } catch (error) {
          console.log('API key method error:', error)
        }
      }

      if (!sheetsData) {
        if (accessToken) {
          throw new Error('Failed to access Google Sheets. Please check that the sheet ID is correct and you have permission to access it.')
        } else {
          throw new Error('Failed to access Google Sheets. Make sure the sheet is publicly accessible (anyone with link can view) or connect to Google Drive for authenticated access.')
        }
      }

      // Create a file object similar to Google Drive picker
      const mockFile = {
        id: extractedId,
        name: sheetsData.title || `Google Sheets (${extractedId})`,
        mimeType: 'application/vnd.google-apps.spreadsheet',
        modifiedTime: new Date().toISOString(),
        webViewLink: `https://docs.google.com/spreadsheets/d/${extractedId}/edit`,
        size: 'Unknown',
        thumbnailLink: null
      }

      console.log('Google Sheets validation successful:', mockFile)

      // Call the parent callback with the mock file
      onFileSelected(mockFile)

      toast({
        title: 'Google Sheets Loaded',
        description: `Successfully loaded "${sheetsData.title}" with ${sheetsData.sheets.length} sheets`
      })

      // Clear the input
      setSheetsId('')

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to validate Google Sheets'
      setError(errorMessage)
      
      toast({
        title: 'Validation Failed',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    validateAndProcessSheets()
  }

  const debugSheets = async () => {
    const extractedId = extractSheetsId(sheetsId)

    if (!extractedId) {
      setError('Please enter a valid Google Sheets ID or URL')
      return
    }

    try {
      console.log('Starting Google Sheets debug for ID:', extractedId)
      const response = await fetch('/api/debug/google-sheets-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sheetsId: extractedId })
      })

      const result = await response.json()
      setDebugResults(result)

      console.log('=== GOOGLE SHEETS DEBUG RESULTS ===')
      console.log('Summary:', result.summary)
      console.log('Detailed Results:', result.debugResults)
      console.log('Recommendations:', result.recommendations)

      toast({
        title: 'Debug Complete',
        description: `${result.summary?.passedTests || 0}/${result.summary?.totalTests || 0} tests passed. Check console for details.`
      })
    } catch (error) {
      console.error('Error debugging Google Sheets:', error)
      toast({
        title: 'Debug Failed',
        description: 'Failed to run debug tests. Check console for details.',
        variant: 'destructive'
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Direct Google Sheets Access
        </CardTitle>
        <CardDescription>
          Enter a Google Sheets ID or URL to process the data directly with Gemini AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Instructions */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {accessToken ? (
              <>
                <strong>Two access methods:</strong> Enter a Google Sheets ID/URL.
                If the sheet is publicly accessible, it will be accessed directly.
                Otherwise, your Google Drive permissions will be used.
              </>
            ) : (
              <>
                <strong>Requirements:</strong> The Google Sheets document must be publicly accessible
                (anyone with the link can view) for this feature to work.
              </>
            )}
          </AlertDescription>
        </Alert>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sheets-id">Google Sheets ID or URL</Label>
            <Input
              id="sheets-id"
              type="text"
              placeholder="Enter Google Sheets ID or paste full URL"
              value={sheetsId}
              onChange={(e) => setSheetsId(e.target.value)}
              disabled={isValidating}
            />
            <div className="text-xs text-muted-foreground">
              Examples:
              <br />• ID: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
              <br />• URL: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={!sheetsId.trim() || isValidating}
              className="flex-1"
            >
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating Google Sheets...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Load Google Sheets
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={!sheetsId.trim()}
              onClick={debugSheets}
            >
              Debug
            </Button>
          </div>
        </form>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Debug Results */}
        {debugResults && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div>
                  <strong>Debug Results:</strong> {debugResults.summary?.passedTests || 0}/{debugResults.summary?.totalTests || 0} tests passed
                </div>
                {debugResults.recommendations && debugResults.recommendations.length > 0 && (
                  <div>
                    <strong>Recommendations:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      {debugResults.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="text-sm">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Help Section */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">How to make your Google Sheets accessible:</h4>
          <ol className="text-xs text-muted-foreground space-y-1">
            <li>1. Open your Google Sheets document</li>
            <li>2. Click the "Share" button in the top right</li>
            <li>3. Click "Change to anyone with the link"</li>
            <li>4. Set permission to "Viewer"</li>
            <li>5. Copy the link or extract the ID from the URL</li>
          </ol>
          <Button 
            variant="link" 
            size="sm" 
            className="p-0 h-auto mt-2"
            onClick={() => window.open('https://support.google.com/docs/answer/2494822', '_blank')}
          >
            <ExternalLink className="mr-1 h-3 w-3" />
            Learn more about sharing Google Sheets
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
