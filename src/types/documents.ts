// Document Management System Types
// Comprehensive type definitions for the document management system

export type DocumentType = 
  | 'I9' 
  | 'W4' 
  | 'DirectDeposit' 
  | 'EmergencyContact' 
  | 'SafetyTraining' 
  | 'CompanyPolicy' 
  | 'BackgroundCheck' 
  | 'DrugTesting' 
  | 'SkillsAssessment' 
  | 'EquipmentCheckout'
  | 'Timesheet'
  | 'Other';

export type DocumentStatus = 
  | 'not_started' 
  | 'in_progress' 
  | 'completed' 
  | 'under_review' 
  | 'approved' 
  | 'rejected' 
  | 'expired';

export type ApprovalStatus = 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'needs_revision';

export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export type ReminderType = 'due_soon' | 'overdue' | 'expiring';

export type AuditAction = 
  | 'created' 
  | 'updated' 
  | 'deleted' 
  | 'submitted' 
  | 'approved' 
  | 'rejected' 
  | 'assigned' 
  | 'completed';

export interface DocumentCategory {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface DocumentTemplate {
  id: number;
  name: string;
  description?: string;
  document_type: DocumentType;
  file_path: string;
  file_size?: number;
  mime_type: string;
  version: number;
  is_active: boolean;
  is_required: boolean;
  applicable_roles: string[];
  expiration_days?: number;
  auto_assign_new_users: boolean;
  conditional_logic?: Record<string, any>;
  category_id?: number;
  category?: DocumentCategory;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentAssignment {
  id: number;
  user_id: number;
  template_id: number;
  assigned_by?: number;
  assigned_at: string;
  due_date?: string;
  priority: Priority;
  is_required: boolean;
  notes?: string;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
  
  // Joined data
  template?: DocumentTemplate;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  assigned_by_user?: {
    id: number;
    name: string;
    email: string;
  };
  submission?: DocumentSubmission;
  latest_approval?: DocumentApproval;
}

export interface DocumentSubmission {
  id: number;
  assignment_id: number;
  user_id: number;
  template_id: number;
  submission_data?: Record<string, any>;
  file_path?: string;
  file_size?: number;
  submitted_at: string;
  last_modified: string;
  version: number;
  is_draft: boolean;
  signature_data?: {
    signature: string;
    timestamp: string;
    ip_address: string;
    user_agent: string;
  };
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  assignment?: DocumentAssignment;
  template?: DocumentTemplate;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface DocumentApproval {
  id: number;
  submission_id: number;
  assignment_id: number;
  reviewer_id: number;
  status: ApprovalStatus;
  comments?: string;
  reviewed_at?: string;
  approval_level: number;
  is_final_approval: boolean;
  created_at: string;
  updated_at: string;
  
  // Joined data
  reviewer?: {
    id: number;
    name: string;
    email: string;
  };
  submission?: DocumentSubmission;
}

export interface EmailTemplate {
  id: number;
  name: string;
  category: 'user_management' | 'shift_management' | 'document_management';
  subject: string;
  html_body: string;
  text_body: string;
  variables?: Record<string, string>;
  is_active: boolean;
  is_system_template: boolean;
  created_by?: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentAuditTrail {
  id: number;
  entity_type: 'template' | 'assignment' | 'submission' | 'approval';
  entity_id: number;
  user_id?: number;
  action: AuditAction;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  
  // Joined data
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface DocumentReminder {
  id: number;
  assignment_id: number;
  reminder_type: ReminderType;
  scheduled_for: string;
  sent_at?: string;
  email_template_id?: number;
  is_active: boolean;
  created_at: string;
  
  // Joined data
  assignment?: DocumentAssignment;
  email_template?: EmailTemplate;
}

// Form data interfaces for API requests
export interface CreateDocumentTemplateRequest {
  name: string;
  description?: string;
  document_type: DocumentType;
  applicable_roles: string[];
  is_required: boolean;
  expiration_days?: number;
  auto_assign_new_users: boolean;
  conditional_logic?: Record<string, any>;
  category_id?: number;
  file?: File;
}

export interface UpdateDocumentTemplateRequest {
  name?: string;
  description?: string;
  document_type?: DocumentType;
  applicable_roles?: string[];
  is_required?: boolean;
  expiration_days?: number;
  auto_assign_new_users?: boolean;
  conditional_logic?: Record<string, any>;
  category_id?: number;
  is_active?: boolean;
}

export interface CreateDocumentAssignmentRequest {
  user_id: number;
  template_id: number;
  due_date?: string;
  priority: Priority;
  is_required: boolean;
  notes?: string;
}

export interface BulkAssignDocumentsRequest {
  template_ids: number[];
  user_ids: number[];
  due_date?: string;
  priority: Priority;
  notes?: string;
}

export interface SubmitDocumentRequest {
  assignment_id: number;
  submission_data: Record<string, any>;
  is_draft: boolean;
  signature_data?: {
    signature: string;
  };
}

export interface ApproveDocumentRequest {
  submission_id: number;
  status: ApprovalStatus;
  comments?: string;
  approval_level?: number;
  is_final_approval?: boolean;
}

export interface CreateEmailTemplateRequest {
  name: string;
  category: 'user_management' | 'shift_management' | 'document_management';
  subject: string;
  html_body: string;
  text_body: string;
  variables?: Record<string, string>;
}

export interface UpdateEmailTemplateRequest {
  name?: string;
  subject?: string;
  html_body?: string;
  text_body?: string;
  variables?: Record<string, string>;
  is_active?: boolean;
}

// Dashboard and reporting interfaces
export interface DocumentComplianceReport {
  total_users: number;
  total_assignments: number;
  completed_assignments: number;
  pending_assignments: number;
  overdue_assignments: number;
  compliance_rate: number;
  by_status: Record<DocumentStatus, number>;
  by_document_type: Record<DocumentType, {
    total: number;
    completed: number;
    compliance_rate: number;
  }>;
  by_role: Record<string, {
    total: number;
    completed: number;
    compliance_rate: number;
  }>;
}

export interface UserDocumentProgress {
  user_id: number;
  user_name: string;
  user_email: string;
  user_role: string;
  total_assignments: number;
  completed_assignments: number;
  pending_assignments: number;
  overdue_assignments: number;
  compliance_rate: number;
  assignments: DocumentAssignment[];
}

export interface DocumentTemplateUsage {
  template_id: number;
  template_name: string;
  total_assignments: number;
  completed_assignments: number;
  average_completion_time: number; // in days
  compliance_rate: number;
  recent_submissions: number; // last 30 days
}

// Filter and search interfaces
export interface DocumentAssignmentFilters {
  user_id?: number;
  template_id?: number;
  status?: DocumentStatus[];
  priority?: Priority[];
  due_date_from?: string;
  due_date_to?: string;
  assigned_date_from?: string;
  assigned_date_to?: string;
  is_required?: boolean;
  role?: string[];
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface DocumentTemplateFilters {
  document_type?: DocumentType[];
  category_id?: number[];
  applicable_roles?: string[];
  is_active?: boolean;
  is_required?: boolean;
  auto_assign_new_users?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}
