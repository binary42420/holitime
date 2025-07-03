# Document Management System Setup Guide

This guide explains the comprehensive document management system with file upload, camera capture, and admin approval workflow.

## 🚀 Quick Setup

### 1. Run the Setup Script
```bash
node scripts/setup-document-management.js
```

### 2. Restart Development Server
```bash
npm run dev
```

### 3. Access the System
- **User Documents**: `/documents`
- **Admin Review**: `/admin/documents` (Manager/Admin only)

## 📋 Features Overview

### 🔹 Document Types
The system supports predefined document types:
- **Forklift Certification** (with expiration)
- **OSHA Certification** (with expiration)
- **Driver's License Photo** (with expiration)
- **Paper Time Sheet** (no expiration)
- **General Document** (catch-all category)

### 🔹 File Upload Methods
1. **Local File Upload**
   - Drag & drop or click to select
   - Supports: PDF, JPG, JPEG, PNG, HEIC
   - Maximum size: 10MB per file
   - Automatic validation

2. **Camera Capture**
   - Direct photo capture through web interface
   - Mobile and desktop camera support
   - Preview before upload
   - Automatic JPEG conversion

### 🔹 PDF Viewer & Editor
- **In-browser PDF viewing** using iframe with PDF.js fallback
- **Zoom controls** (50% to 300%)
- **Page navigation** for multi-page documents
- **Download original** document
- **Print functionality**
- **Mobile responsive** design

### 🔹 Admin Approval Workflow
- **Pending Review**: Newly uploaded documents
- **Approved**: Manager approved with optional notes
- **Rejected**: Manager rejected with required reason
- **Expired**: Time-sensitive documents past expiration

### 🔹 Automatic Certification Updates
When certifications are approved:
- **Forklift Certification** → Sets `fork_operator_eligible = true`
- **OSHA Certification** → Sets `osha_compliant = true`

## 🗄️ Database Schema

### Document Types Table
```sql
CREATE TABLE document_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_certification BOOLEAN DEFAULT false,
    requires_expiration BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Documents Table
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type_id UUID NOT NULL REFERENCES document_types(id),
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_review',
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    expiration_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔌 API Endpoints

### Document Types
- `GET /api/document-types` - List all document types
- `POST /api/document-types` - Create new type (Admin only)

### Documents
- `GET /api/documents` - List user documents (with filters)
- `POST /api/documents/upload` - Upload new document
- `POST /api/documents/[id]/review` - Approve/reject document (Admin only)

### Query Parameters
- `?userId=uuid` - Filter by user (Admin only)
- `?status=pending_review|approved|rejected|expired` - Filter by status
- `?documentType=name` - Filter by document type

## 🎨 UI Components

### DocumentUpload Component
```tsx
<DocumentUpload
  documentTypes={documentTypes}
  onUploadSuccess={() => refetchDocuments()}
  disabled={loading}
/>
```

### CameraCapture Component
```tsx
<CameraCapture
  onCapture={(file) => handleFileCapture(file)}
  onCancel={() => setShowCamera(false)}
  disabled={uploading}
/>
```

### PDFViewer Component
```tsx
<PDFViewer
  fileUrl="/documents/user-id/document.pdf"
  filename="document.pdf"
  className="w-full h-96"
/>
```

## 📱 Mobile Features

### Camera Access
- **Environment camera** preferred (back camera)
- **Permission handling** with user-friendly errors
- **Fallback options** when camera unavailable
- **Touch-optimized** capture interface

### Responsive Design
- **Mobile-first** approach
- **Touch-friendly** buttons and controls
- **Optimized layouts** for small screens
- **Swipe gestures** for document navigation

## 🔒 Security & Permissions

### User Access Control
- Users can only view/upload **their own documents**
- Managers/Admins can view **all documents**
- Document paths include **user ID** for isolation

### File Validation
- **MIME type checking** for uploaded files
- **File size limits** (10MB maximum)
- **Extension validation** (PDF, JPG, PNG, HEIC only)
- **Sanitized filenames** to prevent path traversal

### Storage Security
- Files stored in `/public/documents/{userId}/`
- **UUID-based filenames** to prevent guessing
- **Access logs** for audit trails
- **Automatic cleanup** of rejected documents (optional)

## 🔔 Notification System

### Email Notifications (when SMTP configured)
- **Document uploaded** → Notify admins
- **Document approved** → Notify user
- **Document rejected** → Notify user with reason
- **Document expiring** → Notify user and admins

### In-App Notifications
- **Toast messages** for upload success/failure
- **Status badges** on document cards
- **Expiration warnings** for time-sensitive documents

## 🛠️ Configuration

### Environment Variables
```env
# File upload settings
MAX_FILE_SIZE=10485760  # 10MB in bytes
ALLOWED_MIME_TYPES=application/pdf,image/jpeg,image/png,image/heic

# Document storage
DOCUMENTS_PATH=/public/documents
DOCUMENTS_URL=/documents

# Email notifications (optional)
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
```

### File Storage Structure
```
public/
└── documents/
    ├── .gitkeep
    └── {user-id}/
        ├── {document-id}.pdf
        ├── {document-id}.jpg
        └── {document-id}.png
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] Upload PDF document
- [ ] Upload image document
- [ ] Test camera capture on mobile
- [ ] Test document approval workflow
- [ ] Test document rejection with notes
- [ ] Verify certification auto-updates
- [ ] Test expiration date handling
- [ ] Test file size validation
- [ ] Test unsupported file types
- [ ] Test mobile responsiveness

### Automated Testing
```bash
# Run document management tests
npm test -- --testPathPattern=documents

# Test API endpoints
npm run test:api -- documents

# Test file upload functionality
npm run test:upload
```

## 🔧 Troubleshooting

### Common Issues

#### Camera Not Working
- Check browser permissions
- Ensure HTTPS in production
- Test on different devices
- Verify camera access in browser settings

#### File Upload Failures
- Check file size (10MB limit)
- Verify file type (PDF, JPG, PNG, HEIC only)
- Ensure documents directory exists
- Check disk space on server

#### PDF Viewer Issues
- Verify PDF file integrity
- Check browser PDF support
- Test with different PDF files
- Clear browser cache

#### Permission Errors
- Verify user role (Manager/Admin for review)
- Check authentication status
- Validate API permissions
- Review database user roles

### Debug Mode
Enable debug logging:
```env
DEBUG_DOCUMENTS=true
LOG_LEVEL=debug
```

## 📈 Performance Optimization

### File Handling
- **Streaming uploads** for large files
- **Image compression** before storage
- **PDF optimization** for web viewing
- **Lazy loading** for document lists

### Database Optimization
- **Indexes** on frequently queried fields
- **Pagination** for large document lists
- **Caching** for document types
- **Cleanup jobs** for old documents

## 🔄 Integration Points

### User Management
- Links to existing user profiles
- Role-based access control
- User certification tracking

### Notification System
- Integrates with existing email system
- Uses established notification patterns
- Follows platform notification preferences

### Audit Logging
- Document upload events
- Approval/rejection actions
- File access logs
- User activity tracking

## 📞 Support

For issues with the document management system:
1. Check this documentation
2. Review browser console for errors
3. Verify database migration completed
4. Test with different file types
5. Check user permissions and roles
