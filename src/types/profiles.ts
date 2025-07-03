export interface UserProfile {
  id: number
  user_id: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  date_of_birth?: string
  hire_date?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  profile_picture_url?: string
  bio?: string
  skills: string[]
  languages: string[]
  availability_notes?: string
  preferred_shift_types: string[]
  transportation_method?: string
  has_own_tools: boolean
  safety_certifications: string[]
  work_authorization_status?: string
  tax_id_last_four?: string
  bank_account_last_four?: string
  notification_preferences: NotificationPreferences
  privacy_settings: PrivacySettings
  created_at: string
  updated_at: string
}

export interface NotificationPreferences {
  email_notifications: boolean
  sms_notifications: boolean
  push_notifications: boolean
  shift_assignments: boolean
  shift_reminders: boolean
  document_reminders: boolean
  system_messages: boolean
  marketing_emails: boolean
  quiet_hours_start?: string
  quiet_hours_end?: string
  timezone: string
}

export interface PrivacySettings {
  show_phone_to_coworkers: boolean
  show_email_to_coworkers: boolean
  show_availability_to_managers: boolean
  allow_direct_messages: boolean
  show_profile_picture: boolean
  show_skills_publicly: boolean
}

export interface CreateUserProfileRequest {
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  date_of_birth?: string
  hire_date?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  bio?: string
  skills?: string[]
  languages?: string[]
  availability_notes?: string
  preferred_shift_types?: string[]
  transportation_method?: string
  has_own_tools?: boolean
  safety_certifications?: string[]
  work_authorization_status?: string
  notification_preferences?: Partial<NotificationPreferences>
  privacy_settings?: Partial<PrivacySettings>
}

export interface UpdateUserProfileRequest extends Partial<CreateUserProfileRequest> {
  profile_picture_url?: string
}

export interface UserProfileFilters {
  role?: string[]
  location?: string
  skills?: string[]
  certifications?: string[]
  availability?: string
  has_own_tools?: boolean
  search?: string
  page?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface ProfileStats {
  total_profiles: number
  complete_profiles: number
  incomplete_profiles: number
  profiles_with_pictures: number
  completion_rate: number
}

export interface EmergencyContact {
  name: string
  phone: string
  relationship: string
  is_primary: boolean
}

export interface WorkAuthorization {
  status: 'citizen' | 'permanent_resident' | 'work_visa' | 'other'
  document_type?: string
  expiration_date?: string
  notes?: string
}

export interface BankingInfo {
  account_type: 'checking' | 'savings'
  routing_number_last_four: string
  account_number_last_four: string
  bank_name: string
}

export interface TaxInfo {
  tax_id_type: 'ssn' | 'itin' | 'other'
  tax_id_last_four: string
  filing_status: 'single' | 'married' | 'head_of_household' | 'other'
  allowances: number
  additional_withholding?: number
}

// Extended profile for admin view
export interface AdminUserProfile extends UserProfile {
  user: {
    id: string
    name: string
    email: string
    role: string
    avatar: string
    is_active: boolean
    created_at: string
    last_login?: string
  }
  work_authorization?: WorkAuthorization
  banking_info?: BankingInfo
  tax_info?: TaxInfo
  emergency_contacts: EmergencyContact[]
  document_completion_rate: number
  shift_history_count: number
  performance_rating?: number
}

export interface ProfileCompletionStatus {
  overall_completion: number
  sections: {
    basic_info: number
    contact_info: number
    emergency_contact: number
    work_info: number
    skills_certifications: number
    preferences: number
    documents: number
  }
  missing_fields: string[]
  required_documents: string[]
}

export interface SkillCategory {
  id: string
  name: string
  description: string
  skills: string[]
  is_required_for_roles: string[]
}

export interface CertificationCategory {
  id: string
  name: string
  description: string
  certifications: string[]
  expiration_required: boolean
  renewal_period_months?: number
}

// Predefined options for dropdowns
export const SHIFT_TYPES = [
  'Day Shift',
  'Night Shift',
  'Weekend',
  'Overtime',
  'Emergency',
  'Seasonal',
  'Part-time',
  'Full-time'
] as const

export const TRANSPORTATION_METHODS = [
  'Own Vehicle',
  'Public Transit',
  'Bicycle',
  'Walking',
  'Rideshare',
  'Company Transport',
  'Other'
] as const

export const WORK_AUTHORIZATION_STATUSES = [
  'US Citizen',
  'Permanent Resident',
  'Work Visa',
  'Student Visa with Work Authorization',
  'Asylum/Refugee Status',
  'Other'
] as const

export const RELATIONSHIP_TYPES = [
  'Spouse',
  'Parent',
  'Child',
  'Sibling',
  'Friend',
  'Relative',
  'Other'
] as const

export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
] as const

export const COMMON_SKILLS = [
  // Construction & Labor
  'General Labor',
  'Construction',
  'Carpentry',
  'Electrical Work',
  'Plumbing',
  'Painting',
  'Roofing',
  'Concrete Work',
  'Demolition',
  'Landscaping',
  
  // Equipment Operation
  'Forklift Operation',
  'Crane Operation',
  'Heavy Machinery',
  'Power Tools',
  'Hand Tools',
  'Welding',
  'Cutting Tools',
  
  // Warehouse & Logistics
  'Warehouse Operations',
  'Inventory Management',
  'Shipping & Receiving',
  'Order Picking',
  'Packing',
  'Loading/Unloading',
  'Material Handling',
  
  // Safety & Compliance
  'OSHA Safety',
  'First Aid/CPR',
  'Safety Training',
  'Quality Control',
  'Environmental Compliance',
  
  // Specialized Skills
  'Customer Service',
  'Team Leadership',
  'Problem Solving',
  'Communication',
  'Time Management',
  'Attention to Detail',
  'Physical Stamina',
  'Reliability'
] as const

export const SAFETY_CERTIFICATIONS = [
  'OSHA 10-Hour',
  'OSHA 30-Hour',
  'First Aid/CPR',
  'Forklift Certification',
  'Crane Operator License',
  'Confined Space Entry',
  'Fall Protection',
  'Hazmat Handling',
  'Scaffold Safety',
  'Electrical Safety',
  'Welding Certification',
  'Fire Safety',
  'Emergency Response',
  'Safety Leadership'
] as const
