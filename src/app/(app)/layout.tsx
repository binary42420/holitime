'use client';

import React from "react"
import AppShell from "@/app/(app)/components/app-shell"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}