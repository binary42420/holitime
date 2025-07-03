# Hands On Labor Branding Integration Guide

This guide explains the implementation of Hands On Labor branding across both the marketing website and workforce management platform.

## 🚀 Quick Setup

### Run the Setup Script
```bash
node scripts/setup-branding.js
```

### Replace Placeholder Files
After running the setup, replace the placeholder files with actual logo images:

1. **handsonlabor-website favicon files**
2. **Workforce management app logo files**

## 📋 Implementation Overview

### Part 1: handsonlabor-website Favicon
✅ **Implemented**: Comprehensive favicon support for the marketing website

**Files Added:**
- `handsonlabor-website/public/favicon.ico` - Multi-size ICO file
- `handsonlabor-website/public/favicon-16x16.png` - 16x16 PNG
- `handsonlabor-website/public/favicon-32x32.png` - 32x32 PNG  
- `handsonlabor-website/public/apple-touch-icon.png` - 180x180 PNG for iOS

**Metadata Configuration:**
Updated `handsonlabor-website/src/app/layout.tsx` with:
```tsx
icons: {
  icon: [
    { url: '/favicon.ico', sizes: 'any' },
    { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
  ],
  apple: [
    { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
  ],
  shortcut: '/favicon.ico',
}
```

### Part 2: Workforce Management App Sidebar Logo
✅ **Implemented**: Replaced "Hands On Labor" text with clickable logo

**Before:**
```tsx
<h1 className="text-xl font-semibold text-sidebar-foreground font-headline group-data-[collapsible=icon]:hidden">
  Hands On Labor
</h1>
```

**After:**
```tsx
<Link 
  href="https://handsonlabor-website-369017734615.us-central1.run.app" 
  target="_blank" 
  rel="noopener noreferrer"
  className="group-data-[collapsible=icon]:hidden hover:opacity-80 transition-opacity"
  aria-label="Visit Hands On Labor marketing website"
>
  <Image
    src="/images/handson-labor-logo.svg"
    alt="Hands On Labor"
    width={120}
    height={40}
    className="h-8 w-auto"
    priority
  />
</Link>
```

### Part 3: Clickable Link Integration
✅ **Implemented**: Logo links to marketing website with proper UX

**Features:**
- **External Link**: Opens marketing website in new tab
- **Security**: Uses `rel="noopener noreferrer"`
- **Accessibility**: Includes `aria-label` for screen readers
- **Hover Effect**: Smooth opacity transition on hover
- **Responsive**: Hides when sidebar is collapsed
- **Performance**: Uses `priority` loading for above-fold content

## 🎨 Logo Specifications

### Favicon Requirements
- **ICO Format**: Multi-size (16x16, 32x32, 48x48)
- **PNG Formats**: Individual sizes for better quality
- **Apple Touch Icon**: 180x180 for iOS devices
- **Optimization**: Compressed for fast loading

### Sidebar Logo Requirements
- **Format**: SVG preferred (scalable), PNG fallback
- **Dimensions**: 120x40px aspect ratio
- **Background**: Transparent for theme compatibility
- **Colors**: Should work on light/dark backgrounds
- **File Size**: Optimized for web (< 50KB)

## 🔧 File Structure

```
handsonlabor-website/
├── public/
│   ├── favicon.ico                 # Multi-size ICO
│   ├── favicon-16x16.png          # 16x16 favicon
│   ├── favicon-32x32.png          # 32x32 favicon
│   └── apple-touch-icon.png       # 180x180 iOS icon
└── src/app/layout.tsx             # Updated with favicon metadata

workforce-management/
├── public/images/
│   ├── handson-labor-logo.svg     # Scalable logo
│   └── handson-labor-logo.png     # Fallback logo
└── src/app/(app)/layout.tsx       # Updated sidebar with logo
```

## 🌐 URL Configuration

### Marketing Website URL
```
https://handsonlabor-website-369017734615.us-central1.run.app
```

**Link Behavior:**
- Opens in new tab (`target="_blank"`)
- Preserves user session in workforce app
- Secure external link handling

## 📱 Responsive Design

### Sidebar Behavior
- **Expanded**: Logo visible with hover effects
- **Collapsed**: Logo hidden (`group-data-[collapsible=icon]:hidden`)
- **Mobile**: Responsive sizing maintained

### Favicon Display
- **Desktop**: 32x32 standard size
- **High-DPI**: Automatic scaling
- **iOS**: Custom touch icon
- **Browser Tabs**: ICO format support

## 🎯 Accessibility Features

### Logo Link
- **Screen Readers**: `aria-label` describes link purpose
- **Keyboard Navigation**: Focusable with tab key
- **Visual Feedback**: Hover state for interaction clarity

### Favicon
- **Alt Text**: Descriptive text for logo image
- **Semantic HTML**: Proper link structure
- **Color Contrast**: Logo works on various backgrounds

## 🧪 Testing Checklist

### Favicon Testing
- [ ] Favicon appears in browser tab
- [ ] Correct size on different displays
- [ ] iOS home screen bookmark works
- [ ] Multiple browser compatibility

### Logo Link Testing
- [ ] Logo displays correctly in sidebar
- [ ] Click opens marketing website in new tab
- [ ] Hover effect works smoothly
- [ ] Responsive behavior on mobile
- [ ] Accessibility with screen readers
- [ ] Keyboard navigation works

### Cross-Platform Testing
- [ ] Chrome/Chromium browsers
- [ ] Firefox
- [ ] Safari (desktop and mobile)
- [ ] Edge
- [ ] Mobile browsers (iOS/Android)

## 🔄 Maintenance

### Logo Updates
When updating the logo:

1. **Replace favicon files** in handsonlabor-website/public/
2. **Replace logo files** in workforce-management/public/images/
3. **Test all platforms** to ensure proper display
4. **Clear browser cache** for testing

### URL Updates
If the marketing website URL changes:

1. Update the `href` in `src/app/(app)/layout.tsx`
2. Test the link functionality
3. Update documentation

## 🚨 Troubleshooting

### Favicon Not Showing
- Clear browser cache and hard refresh
- Check file paths and sizes
- Verify metadata configuration
- Test in incognito/private mode

### Logo Not Displaying
- Check file paths in public/images/
- Verify image format compatibility
- Test with different browsers
- Check console for loading errors

### Link Not Working
- Verify URL is correct and accessible
- Check network connectivity
- Test in different browsers
- Verify target="_blank" behavior

## 📈 Performance Optimization

### Image Optimization
- **SVG**: Vector format for crisp scaling
- **PNG**: Compressed with optimal quality
- **ICO**: Multi-size for efficiency
- **Loading**: Priority loading for critical images

### Caching Strategy
- **Static Assets**: Long-term caching
- **Favicon**: Browser cache optimization
- **Logo**: CDN-friendly formats

## 🔗 Integration Points

### Marketing Website
- Favicon enhances brand recognition
- Professional appearance in browser tabs
- iOS home screen compatibility

### Workforce Management
- Seamless navigation to marketing site
- Maintains user context and session
- Brand consistency across platforms

## 📞 Support

For branding-related issues:
1. Check this documentation
2. Verify file paths and formats
3. Test in multiple browsers
4. Clear cache and test again
5. Check console for error messages
