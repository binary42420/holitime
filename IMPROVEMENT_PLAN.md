# Holitime Application Improvement Plan

This document outlines the plan to refactor and improve the Holitime application. The focus is on improving code quality, user experience, and maintainability.

## 1. Consolidate Timesheet Approval Pages

**Problem:** There are two separate pages for timesheet approval: `src/app/(app)/timesheets/[id]/approve/page.tsx` and `src/app/(app)/timesheets/[id]/manager-approval/page.tsx`. This creates code duplication and a disjointed user experience.

**Solution:**
- Create a single, unified timesheet approval page that dynamically adjusts its content and actions based on the timesheet's status and the current user's role.
- This new page will handle both client and manager approvals, showing the appropriate information and actions for each stage of the workflow.
- The new page will be located at `src/app/(app)/timesheets/[id]/approve/page.tsx`, and `src/app/(app)/timesheets/[id]/manager-approval/page.tsx` will be removed.

## 2. Correct Time-Rounding Logic

**Problem:** The current time-rounding logic in `src/lib/time-utils.ts` does not match the specifications in the documentation. It rounds to the nearest 15 minutes instead of rounding down for clock-in and rounding up for clock-out. This can lead to incorrect payroll calculations.

**Solution:**
- Update the `calculateTotalRoundedHours` function in `src/lib/time-utils.ts` to correctly implement the specified rounding logic.
- Create a new function `roundTime` that takes a time and a direction (`up` or `down`) to handle the rounding logic for individual clock-in/out events.
- Ensure that total hours are calculated based on the sum of these correctly rounded individual time entries.

## 3. Implement Timesheet Rejection Flow

**Problem:** The functionality to reject a timesheet is not fully implemented. The current implementation has a `TODO` comment to add a rejection dialog with a reason.

**Solution:**
- Implement a modal dialog that allows managers to enter a reason for rejecting a timesheet.
- Update the `handleReject` function to send the rejection reason to the API.
- The API will need to be updated to handle the rejection, updating the timesheet status to `rejected` and storing the rejection reason.
- Notifications should be sent to the relevant parties (e.g., the crew chief) when a timesheet is rejected.

## 4. Standardize UI Components

**Problem:** The application uses a mix of `@mantine/core` and `shadcn/ui` components, leading to an inconsistent look and feel.

**Solution:**
- Standardize on one component library. Based on the existing code, `@mantine/core` seems to be the primary choice.
- Refactor pages like `src/app/(app)/timesheets/[id]/manager-approval/page.tsx` to use `@mantine/core` components exclusively.

## 5. Refactor Data Fetching and State Management

**Problem:** Data fetching logic is handled differently across components. Some use `useState`/`useEffect`, while others use a custom `useApi` hook.

**Solution:**
- Consistently use the `useApi` hook for all data fetching to centralize logic for loading, error handling, and caching.
- Evaluate the use of a more robust state management solution like Zustand or React Query if the complexity of the application warrants it, especially for a better caching strategy. The `unified-shift-manager.tsx` already uses a store, which is a good pattern to follow.

By implementing these changes, the Holitime application will be more robust, easier to maintain, and provide a better user experience.