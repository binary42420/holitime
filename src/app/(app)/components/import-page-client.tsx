'use client';

import { useState, useCallback } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/(app)/components/ui/card"
import { Button } from "@/app/(app)/components/ui/button"
import { Alert, AlertDescription } from "@/app/(app)/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/(app)/components/ui/tabs"
import { Loader2, FileSpreadsheet, Upload } from "lucide-react"
import GoogleDrivePicker from "./google-drive-picker"
import CSVImport from "./csv-import"
import GoogleSheetsGeminiProcessor from "./google-sheets-gemini-processor"
import GoogleSheetsIdInput from "./google-sheets-id-input"
import { ErrorBoundary } from "./error-boundary"

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
  thumbnailLink?: string;
}

export default function ImportPageClient() {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedCSV, setGeneratedCSV] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const handleGoogleAuth = async () => {
    setLoading(true)
    setError(null)

    try {
      // Get auth URL from our backend
      const authResponse = await fetch("/api/import/google-drive/auth")

      if (!authResponse.ok) {
        const errorData = await authResponse.json()
        throw new Error(errorData.error || "Failed to get authorization URL")
      }

      const { authUrl } = await authResponse.json()

      // Open Google OAuth in a popup
      const width = 600
      const height = 700
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2
      const popup = window.open(
        authUrl,
        "GoogleAuth",
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      )

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups for this site and try again.")
      }

      // Listen for the OAuth callback
      const handleCallback = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return

        if (event.data?.type === "GOOGLE_AUTH_ERROR") {
          cleanup()
          throw new Error(event.data.error || "Google authentication failed")
        }

        if (event.data?.type !== "GOOGLE_AUTH_SUCCESS") return

        cleanup()

        const { code } = event.data

        if (!code) {
          throw new Error("No authorization code received from Google")
        }

        // Exchange code for tokens
        const tokenResponse = await fetch("/api/import/google-drive/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        })

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json().catch(() => ({ error: "Unknown error" }))
          throw new Error(errorData.error || "Failed to exchange auth code")
        }

        const tokenData = await tokenResponse.json()
        if (!tokenData.accessToken) {
          throw new Error("No access token received from server")
        }

        setAccessToken(tokenData.accessToken)
      }

      // Cleanup function
      const cleanup = () => {
        window.removeEventListener("message", handleCallback)
        clearInterval(checkClosed)
        clearTimeout(authTimeout)
        try {
          popup?.close()
        } catch (error) {
          console.warn("Unable to close popup due to COOP policy:", error)
        }
      }

      // Add timeout for authentication (5 minutes)
      const authTimeout = setTimeout(() => {
        cleanup()
        setError("Authentication timed out. Please try again.")
        setLoading(false)
      }, 5 * 60 * 1000)

      // Handle popup being closed manually with better error handling
      const checkClosed = setInterval(() => {
        try {
          if (popup.closed) {
            cleanup()
            setLoading(false)
          }
        } catch (error) {
          // Handle COOP errors when checking popup.closed
          console.warn("Unable to check popup status due to COOP policy:", error)
          // Continue checking, but don't throw error
        }
      }, 1000)

      window.addEventListener("message", handleCallback)
    } catch (err) {
      console.error("Google authentication error:", err)
      setError(err instanceof Error ? err.message : "Failed to authenticate with Google")
      setLoading(false)
      // Ensure cleanup happens even on error
      try {
        window.removeEventListener("message", handleCallback)
      } catch (cleanupError) {
        console.warn("Error during cleanup:", cleanupError)
      }
    }
  }

  const handleFileSelect = useCallback(async (file: DriveFile) => {
    setSelectedFile(file)
    setLoading(true)
    setError(null)

    try {
      // Extract data from selected file
      const response = await fetch("/api/import/google-drive/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ fileId: file.id }),
      })

      if (!response.ok) {
        throw new Error("Failed to extract file data")
      }

      const data = await response.json()
      // Handle the extracted data (e.g., show preview, validation results)
      console.log("Extracted data:", data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file")
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  const handleCSVGenerated = useCallback((csvData: string) => {
    setGeneratedCSV(csvData)
  }, [])

  const debugToken = async () => {
    if (!accessToken) return

    try {
      const response = await fetch("/api/debug/token-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ accessToken })
      })

      const result = await response.json()
      setDebugInfo(result)
      console.log("Token debug info:", result)
    } catch (error) {
      console.error("Error debugging token:", error)
    }
  }

  const debugGoogleDrive = async () => {
    if (!accessToken) return

    try {
      console.log("Starting comprehensive Google Drive debug...")
      const response = await fetch("/api/debug/google-drive-detailed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ accessToken })
      })

      const result = await response.json()
      console.log("=== COMPREHENSIVE GOOGLE DRIVE DEBUG RESULTS ===")
      console.log("Summary:", result.summary)
      console.log("Detailed Results:", result.debugResults)

      // Show results in UI
      setDebugInfo({
        ...debugInfo,
        driveDebug: result
      })

      alert(`Debug Complete!\nPassed: ${result.summary?.passedTests || 0}/${result.summary?.totalTests || 0} tests\nCheck console for detailed results.`)
    } catch (error) {
      console.error("Error debugging Google Drive:", error)
      alert("Debug failed. Check console for details.")
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Import Data</h1>
        <p className="text-muted-foreground">
          Import clients, jobs, shifts, employees, and time entries into the system
        </p>
      </div>

      <Tabs defaultValue="csv" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="csv" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            CSV Import
          </TabsTrigger>
          <TabsTrigger value="google-drive" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Google Drive
          </TabsTrigger>
        </TabsList>

        <TabsContent value="csv" className="mt-6">
          <CSVImport externalCSVData={generatedCSV} />
        </TabsContent>

        <TabsContent value="google-drive" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Import from Google Sheets</CardTitle>
              <CardDescription>
                Import data from Google Sheets
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {selectedFile ? null : (
                <div className="space-y-6">
                  {/* Direct Google Sheets ID Input */}
                  <GoogleSheetsIdInput
                    onFileSelected={handleFileSelect}
                    accessToken={accessToken}
                  />

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  {/* Google Drive Connection */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Browse Google Drive</h3>
                    {!accessToken ? (
                      <Button
                        onClick={handleGoogleAuth}
                        disabled={loading}
                        className="w-full"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Connecting to Google Drive...
                          </>
                        ) : (
                          "Connect Google Drive"
                        )}
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <GoogleDrivePicker
                          accessToken={accessToken}
                          onFileSelect={handleFileSelect}
                        />

                        {/* Debug Section */}
                        <div className="pt-4 border-t">
                          <div className="space-y-2">
                            <div className="flex gap-2 items-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={debugToken}
                              >
                                Debug Token
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={debugGoogleDrive}
                              >
                                Debug Drive API
                              </Button>
                            </div>
                            {debugInfo && (
                              <div className="text-xs text-muted-foreground space-y-1">
                                <div>Scopes: {debugInfo.scopes?.join(", ") || "none"}</div>
                                {debugInfo.driveDebug && (
                                  <div>
                                    Drive Tests: {debugInfo.driveDebug.summary?.passedTests || 0}/{debugInfo.driveDebug.summary?.totalTests || 0} passed
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedFile && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium mb-2">Selected File:</h4>
                        <p>{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Last modified: {new Date(selectedFile.modifiedTime).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                      >
                        Change File
                      </Button>
                    </div>
                  </div>

                  <ErrorBoundary>
                    <GoogleSheetsGeminiProcessor
                      selectedFile={selectedFile}
                      onCSVGenerated={handleCSVGenerated}
                      accessToken={accessToken || undefined}
                    />
                  </ErrorBoundary>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
