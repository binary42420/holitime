'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { 
  FileText, 
  Upload, 
  Plus, 
  Search,
  Filter,
  Edit,
  Trash2,
  Download,
  Eye,
  MoreHorizontal,
  Settings,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { DocumentTemplate, DocumentType, CreateDocumentTemplateRequest } from '@/types/documents'
import { useToast } from '@/hooks/use-toast'

export default function DocumentTemplatesPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [createFormData, setCreateFormData] = useState<CreateDocumentTemplateRequest>({
    name: '',
    description: '',
    document_type: 'Other',
    applicable_roles: [],
    is_required: false,
    auto_assign_new_users: false
  })

  useEffect(() => {
    fetchTemplates()
  }, [typeFilter, searchTerm])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (typeFilter !== 'all') {
        params.append('document_type', typeFilter)
      }
      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await fetch(`/api/documents/templates?${params}`)
      if (!response.ok) throw new Error('Failed to fetch templates')
      
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = async () => {
    try {
      if (!createFormData.name || !selectedFile) {
        toast({
          title: 'Error',
          description: 'Please provide a name and select a file',
          variant: 'destructive'
        })
        return
      }

      const formData = new FormData()
      formData.append('name', createFormData.name)
      formData.append('description', createFormData.description || '')
      formData.append('document_type', createFormData.document_type)
      formData.append('applicable_roles', JSON.stringify(createFormData.applicable_roles))
      formData.append('is_required', createFormData.is_required.toString())
      formData.append('auto_assign_new_users', createFormData.auto_assign_new_users.toString())
      if (createFormData.expiration_days) {
        formData.append('expiration_days', createFormData.expiration_days.toString())
      }
      formData.append('file', selectedFile)

      const response = await fetch('/api/documents/templates', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Failed to create template')

      toast({
        title: 'Success',
        description: 'Template created successfully'
      })

      setIsCreateDialogOpen(false)
      setCreateFormData({
        name: '',
        description: '',
        document_type: 'Other',
        applicable_roles: [],
        is_required: false,
        auto_assign_new_users: false
      })
      setSelectedFile(null)
      fetchTemplates()
    } catch (error) {
      console.error('Error creating template:', error)
      toast({
        title: 'Error',
        description: 'Failed to create template',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const response = await fetch(`/api/documents/templates/${templateId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete template')

      toast({
        title: 'Success',
        description: 'Template deleted successfully'
      })

      fetchTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive'
      })
    }
  }

  const getDocumentTypeColor = (type: DocumentType) => {
    const colors = {
      'I9': 'bg-blue-100 text-blue-800',
      'W4': 'bg-green-100 text-green-800',
      'DirectDeposit': 'bg-purple-100 text-purple-800',
      'EmergencyContact': 'bg-orange-100 text-orange-800',
      'SafetyTraining': 'bg-red-100 text-red-800',
      'CompanyPolicy': 'bg-indigo-100 text-indigo-800',
      'BackgroundCheck': 'bg-yellow-100 text-yellow-800',
      'DrugTesting': 'bg-pink-100 text-pink-800',
      'SkillsAssessment': 'bg-cyan-100 text-cyan-800',
      'EquipmentCheckout': 'bg-teal-100 text-teal-800',
      'Timesheet': 'bg-gray-100 text-gray-800',
      'Other': 'bg-gray-100 text-gray-800'
    }
    return colors[type] || colors['Other']
  }

  const isAdmin = session?.user?.role === 'Manager/Admin'

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You need administrator privileges to access template management.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Document Templates</h1>
          <p className="text-muted-foreground">
            Manage document templates for employee onboarding and compliance
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Document Template</DialogTitle>
              <DialogDescription>
                Upload a PDF template and configure its settings
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={createFormData.name}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., I-9 Employment Eligibility"
                  />
                </div>
                <div>
                  <Label htmlFor="document_type">Document Type *</Label>
                  <Select 
                    value={createFormData.document_type} 
                    onValueChange={(value) => setCreateFormData(prev => ({ ...prev, document_type: value as DocumentType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="I9">I-9 Employment Eligibility</SelectItem>
                      <SelectItem value="W4">W-4 Tax Withholding</SelectItem>
                      <SelectItem value="DirectDeposit">Direct Deposit</SelectItem>
                      <SelectItem value="EmergencyContact">Emergency Contact</SelectItem>
                      <SelectItem value="SafetyTraining">Safety Training</SelectItem>
                      <SelectItem value="CompanyPolicy">Company Policy</SelectItem>
                      <SelectItem value="BackgroundCheck">Background Check</SelectItem>
                      <SelectItem value="DrugTesting">Drug Testing</SelectItem>
                      <SelectItem value="SkillsAssessment">Skills Assessment</SelectItem>
                      <SelectItem value="EquipmentCheckout">Equipment Checkout</SelectItem>
                      <SelectItem value="Timesheet">Timesheet</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={createFormData.description}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this document template"
                />
              </div>

              <div>
                <Label>Applicable Roles *</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {['Employee', 'Crew Chief', 'Manager/Admin', 'Client'].map(role => (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        id={role}
                        checked={createFormData.applicable_roles.includes(role)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCreateFormData(prev => ({
                              ...prev,
                              applicable_roles: [...prev.applicable_roles, role]
                            }))
                          } else {
                            setCreateFormData(prev => ({
                              ...prev,
                              applicable_roles: prev.applicable_roles.filter(r => r !== role)
                            }))
                          }
                        }}
                      />
                      <Label htmlFor={role}>{role}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_required"
                    checked={createFormData.is_required}
                    onCheckedChange={(checked) => setCreateFormData(prev => ({ ...prev, is_required: !!checked }))}
                  />
                  <Label htmlFor="is_required">Required Document</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto_assign"
                    checked={createFormData.auto_assign_new_users}
                    onCheckedChange={(checked) => setCreateFormData(prev => ({ ...prev, auto_assign_new_users: !!checked }))}
                  />
                  <Label htmlFor="auto_assign">Auto-assign to new users</Label>
                </div>
              </div>

              <div>
                <Label htmlFor="file">PDF Template File *</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate}>
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Template Library</CardTitle>
          <CardDescription>
            Manage document templates and their configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as DocumentType | 'all')}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="I9">I-9 Employment</SelectItem>
                <SelectItem value="W4">W-4 Tax</SelectItem>
                <SelectItem value="DirectDeposit">Direct Deposit</SelectItem>
                <SelectItem value="EmergencyContact">Emergency Contact</SelectItem>
                <SelectItem value="SafetyTraining">Safety Training</SelectItem>
                <SelectItem value="CompanyPolicy">Company Policy</SelectItem>
                <SelectItem value="BackgroundCheck">Background Check</SelectItem>
                <SelectItem value="DrugTesting">Drug Testing</SelectItem>
                <SelectItem value="SkillsAssessment">Skills Assessment</SelectItem>
                <SelectItem value="EquipmentCheckout">Equipment Checkout</SelectItem>
                <SelectItem value="Timesheet">Timesheet</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Templates Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Applicable Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Loading templates...</p>
                  </TableCell>
                </TableRow>
              ) : templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No templates found</p>
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-sm text-muted-foreground">{template.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getDocumentTypeColor(template.document_type)}>
                        {template.document_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {template.applicable_roles.map(role => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {template.is_active ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-500" />
                        )}
                        <span className="text-sm">
                          {template.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {template.is_required && (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(template.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Template
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Template
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Users className="mr-2 h-4 w-4" />
                            Assign to Users
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Template
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
