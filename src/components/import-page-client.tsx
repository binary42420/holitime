"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileSpreadsheet, Upload } from "lucide-react";
import GoogleDrivePicker from "./google-drive-picker";
import CSVImport from "./csv-import";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
  thumbnailLink?: string;
}

export default function ImportPageClient() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get auth URL from our backend
      const authResponse = await fetch("/api/import/google-drive/auth");
      const { authUrl } = await authResponse.json();

      // Open Google OAuth in a popup
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        authUrl,
        "GoogleAuth",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for the OAuth callback
      const handleCallback = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type !== "GOOGLE_AUTH_SUCCESS") return;

        window.removeEventListener("message", handleCallback);
        popup?.close();

        const { code } = event.data;
        
        // Exchange code for tokens
        const tokenResponse = await fetch("/api/import/google-drive/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (!tokenResponse.ok) {
          throw new Error("Failed to exchange auth code");
        }

        const { accessToken } = await tokenResponse.json();
        setAccessToken(accessToken);
      };

      window.addEventListener("message", handleCallback);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to authenticate with Google");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = useCallback(async (file: DriveFile) => {
    setSelectedFile(file);
    setLoading(true);
    setError(null);

    try {
      // Extract data from selected file
      const response = await fetch("/api/import/google-drive/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ fileId: file.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to extract file data");
      }

      const data = await response.json();
      // Handle the extracted data (e.g., show preview, validation results)
      console.log("Extracted data:", data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

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
          <CSVImport />
        </TabsContent>

        <TabsContent value="google-drive" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Import from Google Drive</CardTitle>
              <CardDescription>
                Select a Google Sheets file to import data from your Google Drive
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

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
                <GoogleDrivePicker
                  accessToken={accessToken}
                  onFileSelect={handleFileSelect}
                />
              )}

              {selectedFile && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Selected File:</h4>
                  <p>{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Last modified: {new Date(selectedFile.modifiedTime).toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
