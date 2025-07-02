# **App Name**: Holitime - Workforce Management Platform

## Deployment Status:
- **Production URL**: https://holitime-369017734615.us-central1.run.app
- **Platform**: Google Cloud Run
- **Status**: ✅ Successfully Deployed
- **Last Updated**: December 30, 2024

## Architecture Overview:
- **Frontend**: Next.js 15.3.3 with TypeScript
- **Backend**: Next.js API routes with server-side rendering
- **Database**: SQLite with Drizzle ORM
- **Authentication**: NextAuth.js with role-based access control
- **Deployment**: Docker containerized on Google Cloud Run
- **Mobile**: Capacitor for iOS/Android builds (connects to deployed API)

## Core Features:

- **Modernized Homepage Dashboard**: Upgraded Homepage: Modernized version of handsonlabor.com, incorporating key branding elements and improved navigation. Includes a dashboard summarizing employee schedules and important company announcements.
- **Shift Dashboard**: Comprehensive dashboard displaying upcoming and past shift details for employees (client company, address, contact info, crew chief contact). Managers can view all shifts. Includes filtering/sorting and real-time updates.
- **Role-Based Access Control**: Three-tier authentication system: Employee, Crew Chief, Manager/Admin. Employee: view shifts, clock in/out, submit timesheets. Crew Chief: employee features + manage shift personnel, edit timesheets. Manager/Admin: full access.
- **Shift Management Interface**: Dedicated crew chief interface for shift oversight. Displays shift information with assigned personnel, enables editing of employee clock in/out times with audit trail, includes shift notes and employee check-in status tracking.
- **Client Management System**: CRUD interface for client company management. Stores client details, implements client-specific job/shift creation, and tracks client communication history.
- **Document Storage & HR Functions**: Secure document upload and storage system for employee and client documents. Includes employee document management (certifications, training records) and client document storage (contracts, insurance). GDPR compliant.
- **Smart Staffing Suggestions**: Generative AI "tool" that provides shift staffing recommendations. Analyzes employee availability, certifications, past performance, and location. Matches job requirements with qualified personnel and includes conflict detection.

## Technical Configuration:

### Build Configurations:
- **Web/Production**: `next.config.ts` (standalone output for Cloud Run)
- **Mobile/Capacitor**: `next.config.capacitor.ts.old` (static export for mobile apps)
- **Smart Build System**: Automatically detects environment and uses appropriate config

### Environment Variables:
- **Production**: `NEXT_PUBLIC_API_URL` points to Cloud Run service
- **Mobile**: `NEXT_PUBLIC_IS_MOBILE=true` for Capacitor builds
- **Authentication**: NextAuth configuration for role-based access

### Dependencies:
- **Next.js**: 15.3.3 (requires Node.js 20+ for pdfjs-dist compatibility)
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **Database**: Drizzle ORM with SQLite
- **Authentication**: NextAuth.js with custom providers
- **Mobile**: Capacitor for cross-platform mobile deployment

### Deployment Notes:
- **Docker**: Multi-stage build with Node.js 20 Alpine
- **Build Command**: Uses `npx next build` to bypass Capacitor detection
- **Port**: 3000 (configured for Cloud Run)
- **Health Check**: Automatic via Cloud Run service monitoring

## Recent Updates (December 2024):

### Build System Improvements:
- **Fixed Cloud Run Deployment**: Resolved Next.js 15 compatibility issues
- **Smart Build Detection**: Implemented environment-aware build system
- **Configuration Management**: Separated web and mobile build configurations
- **Dependency Resolution**: Fixed OpenTelemetry and Handlebars webpack issues

### Architecture Changes:
- **Dual Configuration**: Web (standalone)
- **Docker Optimization**: Multi-stage builds with proper Node.js 20 support

### Known Issues Resolved:
- ✅ Next.js 15 params Promise compatibility
- ✅ Node.js version compatibility (upgraded to Node 20)
- ✅ Missing dependencies in production builds
- ✅ TypeScript compilation errors in deployment

## Style Guidelines:

- Primary: Deep Blue (#3F51B5) - Use for headers, navigation, primary buttons, mirroring existing Hands On Labor branding.
- Background: Light Gray (#ECEFF1) - Main application background for a clean interface.
- Accent: Orange (#FF9800) - Call-to-action buttons, alerts, important notifications, aligning with existing branding.
- Supporting colors: Success (#4CAF50), warning (#FFC107), and error (#F44336) states
- Font Family: 'PT Sans' for all text elements, ensuring readability and consistency.
- Clear hierarchy: H1-H6 headings, body text, captions for easy content scanning.
- Accessibility with proper contrast ratios and font sizes, adhering to WCAG guidelines.
- Consistent icon set using Material Design or similar professional iconography for a recognizable and intuitive interface.
- Reusable component library (buttons, forms, cards, modals) for efficient development and design consistency.
- Responsive grid system for mobile and desktop layouts, ensuring accessibility across devices.
- Clean, card-based layout with clear information hierarchy on the dashboard, promoting usability.
- Data visualizations using charts for shift statistics, employee utilization, providing insights at a glance.
- Quick action buttons prominently placed for frequent tasks, improving user efficiency.
- Subtle animations and transitions (300ms duration) for state changes, enhancing user experience without being distracting.

## Development Workflow:

### Local Development:
```bash
npm run dev          # Start development server
npm run build        # Smart build (detects environment)
npx next build       # Direct Next.js build (bypasses smart detection)
```

### Mobile Development:
```bash
npm run build:mobile # Build for Capacitor (static export)
npx cap sync         # Sync with Capacitor
npx cap run android  # Run on Android
npx cap run ios      # Run on iOS
```

### Deployment:
```bash
gcloud run deploy holitime --source . --region us-central1 --allow-unauthenticated --port 3000
```

## Next Steps:

### Immediate Priorities:
1. **Database Migration**: Move from SQLite to PostgreSQL for production scalability
2. **Authentication Setup**: Configure production NextAuth providers
3. **Environment Variables**: Set up production environment configuration
4. **SSL/Security**: Implement proper security headers and HTTPS enforcement

### Feature Development:
1. **User Management**: Complete role-based access control implementation
2. **Shift Management**: Build comprehensive shift scheduling system
3. **Client Portal**: Develop client-facing interface
4. **Mobile App**: Complete Capacitor mobile app with offline capabilities
5. **AI Integration**: Implement smart staffing suggestions with real data

### Infrastructure:
1. **Monitoring**: Set up application monitoring and logging
2. **Backup Strategy**: Implement database backup and recovery
3. **CI/CD Pipeline**: Automate testing and deployment
4. **Performance**: Optimize for production load and scalability