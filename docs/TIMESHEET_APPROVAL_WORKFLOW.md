# Comprehensive Timesheet Approval Workflow

## 🎯 Overview

This document describes the complete timesheet approval workflow implementation for the Holitime workforce management system. The workflow provides a comprehensive solution for timesheet finalization, client approval, manager approval, and PDF generation with digital signatures.

## 📋 Workflow Steps

### 1. Timesheet Finalization
- **Trigger**: Crew Chief or Manager clicks "Finalize Timesheet"
- **Validation**: All workers must have ended their shifts
- **Action**: Creates timesheet record with status `'pending_client_approval'`
- **Notifications**: Sent to client users, crew chief, and managers

### 2. Client Approval
- **Access**: Client users (matching company), crew chief, and managers
- **Review Page**: `/timesheets/[id]/review`
- **Signature**: Digital signature capture (mouse/touch compatible)
- **Action**: Updates status to `'pending_final_approval'`
- **Notifications**: Sent to managers for final approval

### 3. Manager Final Approval
- **Access**: Manager/Admin users only
- **Signature**: Manager digital signature capture
- **Action**: Updates status to `'completed'`
- **PDF Generation**: Automatically generates PDF using company template

### 4. PDF Generation and Storage
- **Template**: Hands On Labor company template (exact replica)
- **Storage**: PDFs stored as `bytea` data in PostgreSQL
- **Download**: Available from multiple locations in the application

## 🗄️ Database Schema

### Updated Tables

#### `shifts` Table
```sql
-- Status constraint updated to include new statuses
CHECK (status IN ('Upcoming', 'In Progress', 'Completed', 'Cancelled', 'Pending Approval', 'Pending Client Approval'))
```

#### `timesheets` Table
```sql
-- Status constraint for approval workflow
CHECK (status IN ('draft', 'pending_client_approval', 'pending_final_approval', 'completed', 'rejected'))

-- New PDF storage columns
pdf_data BYTEA,                    -- PDF binary data
pdf_filename VARCHAR(255),         -- Original filename
pdf_content_type VARCHAR(100),     -- MIME type
pdf_generated_at TIMESTAMP WITH TIME ZONE
```

#### `notifications` Table (New)
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('timesheet_ready_for_approval', 'timesheet_approved', 'timesheet_rejected', 'shift_assigned')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_timesheet_id UUID REFERENCES timesheets(id) ON DELETE CASCADE,
  related_shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔌 API Endpoints

### Timesheet Management
- `POST /api/shifts/[id]/finalize-timesheet-simple` - Finalize timesheet
- `GET /api/timesheets/[id]/review` - Get timesheet for review
- `POST /api/timesheets/[id]/approve` - Client/Manager approval with signature

### PDF Management
- `POST /api/timesheets/[id]/generate-pdf` - Generate and store PDF
- `GET /api/timesheets/[id]/pdf` - Download PDF from database

### Notifications
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications/mark-all-read` - Mark all as read
- `PATCH /api/notifications/[id]/read` - Mark individual as read

## 🎨 UI Components

### Status Indicators
- `TimesheetStatusIndicator` - Visual status badges with icons
- `TimesheetWorkflowIndicator` - Progress workflow display
- Status-specific colors and descriptions

### Loading States
- `FullPageLoading` - Full page loading with descriptive text
- `ProcessingOverlay` - Modal overlay for processing operations
- `LoadingSpinner` - Inline loading indicators

### Error Handling
- `ErrorState` - General error display with retry options
- `NotFoundState` - 404-style error for missing resources
- `PermissionDeniedState` - Access denied error display
- `NetworkErrorState` - Connection error handling

### Signature Capture
- `SignatureCaptureModal` - Digital signature capture
- Mouse and touchscreen compatible
- Canvas-based with base64 output
- Clear and submit functionality

## 📱 User Experience Features

### Access Control
- **Client Users**: Can review and approve timesheets for their company
- **Crew Chiefs**: Can review and approve timesheets for their assigned shifts
- **Managers**: Can perform final approval and access all timesheets
- **Employees**: Read-only access to their own time entries

### Responsive Design
- Mobile-friendly signature capture
- Responsive table layouts
- Touch-optimized interface elements
- Proper spacing and typography

### Status Tracking
- Clear visual indicators for each workflow stage
- Progress bars and workflow diagrams
- Real-time status updates
- Notification badges and alerts

## 📄 PDF Template

### Hands On Labor Template Features
- **Header**: "HOLI TIMESHEET" with company branding
- **Client Information**: PO#, Job#, Client Name, Location, Date/Time
- **Employee Table**: Name, Job Title, Initials, IN/OUT times, Total Hours
- **Hour Calculations**: Regular, Overtime, Double Time columns
- **Signature Section**: Client name and signature area
- **Company Footer**: Phone, address, fax information
- **Copy Designation**: "White Copy - HANDS ON, Yellow Copy - Client"

### PDF Generation Process
1. Fetch timesheet data with employee time entries
2. Calculate total hours for each employee
3. Generate PDF using jsPDF with exact template layout
4. Include client signature if available
5. Store as binary data in PostgreSQL
6. Return download link

## 🔔 Notification System

### Notification Types
- `timesheet_ready_for_approval` - Timesheet needs approval
- `timesheet_approved` - Timesheet has been approved
- `timesheet_rejected` - Timesheet has been rejected
- `shift_assigned` - Worker assigned to shift

### Notification Targeting
- **Client Approval**: Notify client users, crew chief, and managers
- **Final Approval**: Notify all managers
- **Status Updates**: Notify relevant stakeholders

### Notification Features
- Unread count tracking
- Mark as read functionality
- Related timesheet/shift linking
- Automatic cleanup of old notifications

## 🧪 Testing

### Automated Tests
- Database schema validation
- Status constraint verification
- PDF storage functionality
- Notification system integrity
- Workflow transition validation

### Manual Testing Checklist
- [ ] Finalize timesheet button functionality
- [ ] Client approval with signature capture
- [ ] Manager final approval process
- [ ] PDF generation and download
- [ ] Notification delivery and marking as read
- [ ] Access control permissions
- [ ] Responsive design on mobile devices
- [ ] Error handling and loading states
- [ ] Signature capture on touch devices
- [ ] PDF template accuracy

## 🚀 Deployment

### Prerequisites
- PostgreSQL database with updated schema
- Node.js environment with required dependencies
- Proper environment variables configured
- SSL certificates for production

### Migration Steps
1. Run database migration script: `node scripts/fix-timesheet-migration.js`
2. Verify schema updates: `node scripts/test-timesheet-workflow.js`
3. Deploy application code
4. Test all endpoints and functionality
5. Verify PDF generation and storage

## 📊 Performance Considerations

### Database Optimization
- Indexes on notification queries
- Efficient PDF storage with bytea
- Proper foreign key relationships
- Query optimization for large datasets

### Frontend Performance
- Lazy loading of components
- Efficient state management
- Optimized PDF download handling
- Responsive image loading

### Security
- Signature data validation
- Access control enforcement
- SQL injection prevention
- XSS protection in PDF generation

## 🔧 Maintenance

### Regular Tasks
- Monitor PDF storage usage
- Clean up old notifications
- Verify signature data integrity
- Performance monitoring and optimization

### Troubleshooting
- Check database constraints for status errors
- Verify PDF generation dependencies
- Monitor notification delivery
- Validate signature capture functionality

## 📞 Support

For technical support or questions about the timesheet approval workflow:
1. Check the test script output for system health
2. Review API endpoint responses for errors
3. Verify database schema integrity
4. Test signature capture functionality
5. Validate PDF generation and storage

---

**Implementation Status**: ✅ Complete
**Last Updated**: 2025-01-03
**Version**: 1.0.0
