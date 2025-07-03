# Logo and OSHA Compliance Setup Guide

This guide explains the new features added to the workforce management platform:

## 🏢 Company Logo Management

### Overview
The platform now supports company logos for client companies, with logos stored in the `/public/logos/` directory.

### Features Added
- **Logo Upload**: Admins can upload company logos through the client management interface
- **Logo Display**: Company logos appear throughout the platform (client lists, shift details, etc.)
- **Logo Storage**: Logos are stored in `/public/logos/` with validation (PNG/JPG/JPEG/SVG, 2MB max)
- **Fallback Display**: Building icon shown when no logo is available

### Pre-configured Logos
- **Maktive**: `/logos/maktive-logo.png`
- **Show Imaging**: `/logos/show-imaging-logo.png`

### Usage
1. Navigate to the client management page
2. Click "Edit" on any client company
3. Upload a logo using the logo upload component
4. The logo will appear across all client-related pages

## 🛡️ OSHA Compliance Trait

### Overview
Added OSHA compliance as a user trait, similar to the existing fork operator eligibility.

### Features Added
- **Database Field**: `osha_compliant` boolean column in users table
- **Visual Indicator**: OSHA shield icon displayed next to compliant employees
- **Admin Management**: Managers can enable/disable OSHA compliance for employees
- **Display Integration**: Shows in users table, employee pages, and user profiles

### OSHA Icon
- **Location**: `/public/images/osha-compliant.svg`
- **Design**: Blue shield with checkmark and "OSHA" text
- **Usage**: 24x24px icon displayed next to employee names

### Managing OSHA Compliance
1. Go to **Employees** page
2. Click "Edit" on any employee
3. Check/uncheck the "OSHA Compliant" checkbox
4. Save changes
5. The OSHA icon will appear next to the employee's name

## 🎨 Hands On Labor Website Logo

### Overview
Updated the handsonlabor-website to use a new logo file instead of the external URL.

### Changes Made
- **Header Logo**: Now uses `/images/handson-labor-logo.png`
- **Footer Logo**: Now uses `/images/handson-labor-logo.png` (with invert filter)
- **File Location**: `/handsonlabor-website/public/images/handson-labor-logo.png`

### Logo Specifications
- **Format**: PNG recommended
- **Size**: 120x60px (or proportional)
- **Usage**: Header (normal) and Footer (inverted colors)

## 🚀 Installation & Setup

### 1. Run Database Migration
```bash
node scripts/run-migration-009.js
```

### 2. Set Company Logos
```bash
node scripts/set-company-logos.js
```

### 3. Complete Setup (All-in-One)
```bash
node scripts/setup-logos-and-osha.js
```

### 4. Replace Placeholder Images
Replace these placeholder files with actual images:
- `/handsonlabor-website/public/images/handson-labor-logo.png`
- `/public/logos/maktive-logo.png`
- `/public/logos/show-imaging-logo.png`

### 5. Restart Application
```bash
npm run dev
# or
npm run build && npm start
```

## 📋 Database Schema Changes

### New Column: users.osha_compliant
```sql
ALTER TABLE users ADD COLUMN osha_compliant BOOLEAN DEFAULT false;
CREATE INDEX idx_users_osha_compliant ON users(osha_compliant);
```

### Updated APIs
- `GET /api/users` - Now includes `oshaCompliant` field
- `PUT /api/users/[id]` - Now accepts `oshaCompliant` field
- `POST /api/users` - Now accepts `oshaCompliant` field

## 🎯 User Interface Updates

### Users Table
- Added OSHA icon next to compliant employees
- Updated eligibility display to include "OSHA"
- Added OSHA checkbox in edit forms

### Employee Pages
- OSHA compliance statistics card
- OSHA indicator in employee listings
- Edit form includes OSHA compliance checkbox

### User Profile Pages
- OSHA Compliant badge in certifications section
- Icon display with tooltip

## 🔧 Technical Details

### File Structure
```
public/
├── logos/
│   ├── .gitkeep
│   ├── maktive-logo.png
│   └── show-imaging-logo.png
└── images/
    └── osha-compliant.svg

handsonlabor-website/
└── public/
    └── images/
        └── handson-labor-logo.png

src/
├── lib/
│   └── migrations/
│       └── 009_add_osha_compliant_trait.sql
└── components/
    └── ui/
        ├── company-logo.tsx (existing)
        └── logo-upload.tsx (existing)
```

### Component Updates
- `CompanyLogo`: Enhanced to handle logo display
- `LogoUpload`: Handles logo file uploads
- User management components: Added OSHA compliance support

## 🎨 Styling & Icons

### OSHA Icon
- **Color**: Blue (#1E40AF)
- **Style**: Shield with checkmark
- **Size**: 24x24px (scalable SVG)
- **Tooltip**: "OSHA Compliant"

### Company Logos
- **Sizes**: 24x24px (lists), 48x48px (details)
- **Fallback**: Building icon from Lucide
- **Border**: Rounded corners
- **Validation**: 2MB max, common image formats

## 📞 Support

For questions or issues with the logo and OSHA compliance features:
1. Check the browser console for any errors
2. Verify database migration completed successfully
3. Ensure image files are properly uploaded and accessible
4. Check user permissions for logo upload functionality
