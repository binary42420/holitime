"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface ImportHistoryItem {
  id: string;
  fileName: string;
  importedAt: string;
  status: 'completed' | 'failed' | 'partial';
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  errors?: { row: number; error: string }[];
}

export default function ImportHistory() {
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ImportHistoryItem | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch('/api/import/history');
        if (!response.ok) {
          throw new Error('Failed to fetch import history');
        }
        const data = await response.json();
        setHistory(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Loading import history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (selectedItem) {
    return (
      <div>
        <Button onClick={() => setSelectedItem(null)} className="mb-4">
          &larr; Back to History
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Details for {selectedItem.fileName}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Status: <Badge variant={
              selectedItem.status === 'completed' ? 'default' :
              selectedItem.status === 'partial' ? 'secondary' : 'destructive'
            }>{selectedItem.status}</Badge></p>
            <p>Imported at: {new Date(selectedItem.importedAt).toLocaleString()}</p>
            <p>Rows: {selectedItem.successfulRows} successful, {selectedItem.failedRows} failed, {selectedItem.totalRows} total</p>
            {selectedItem.errors && selectedItem.errors.length > 0 && (
              <div>
                <h4 className="font-bold mt-4">Errors:</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedItem.errors.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell>{e.row}</TableCell>
                        <TableCell>{e.error}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File Name</TableHead>
              <TableHead>Imported At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.fileName}</TableCell>
                <TableCell>{new Date(item.importedAt).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={
                    item.status === 'completed' ? 'default' :
                    item.status === 'partial' ? 'secondary' : 'destructive'
                  }>{item.status}</Badge>
                </TableCell>
                <TableCell>{item.successfulRows}/{item.totalRows} successful</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => setSelectedItem(item)}>
                    Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
