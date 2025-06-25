"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Download, MoreHorizontal, PlusCircle, Upload } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { mockDocuments } from "@/lib/mock-data"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

export default function DocumentsPage() {
  const { user } = useUser()
  const canUpload = user.role !== 'Employee'

  const employeeDocs = mockDocuments.filter(doc => doc.category === 'Employee')
  const clientDocs = mockDocuments.filter(doc => doc.category === 'Client')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">Documents</h1>
        {canUpload && (
          <Button size="sm" className="gap-1">
            <Upload className="h-4 w-4" />
            Upload Document
          </Button>
        )}
      </div>

      <Tabs defaultValue="employee">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="employee">Employee Documents</TabsTrigger>
          <TabsTrigger value="client">Client Documents</TabsTrigger>
        </TabsList>
        <TabsContent value="employee">
          <Card>
            <CardHeader>
              <CardTitle>Employee Documents</CardTitle>
              <CardDescription>
                Manage certifications, training records, and other employee-related files.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">Upload Date</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeDocs.map(doc => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell><Badge variant="outline">{doc.type}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell">{doc.uploadDate}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <a href={doc.url} download><Download className="mr-2 h-4 w-4" /> Download</a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="client">
           <Card>
            <CardHeader>
              <CardTitle>Client Documents</CardTitle>
              <CardDescription>
                Manage contracts, insurance documents, and other client-related files.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">Upload Date</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientDocs.map(doc => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                       <TableCell><Badge variant="outline">{doc.type}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell">{doc.uploadDate}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <a href={doc.url} download><Download className="mr-2 h-4 w-4" /> Download</a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
