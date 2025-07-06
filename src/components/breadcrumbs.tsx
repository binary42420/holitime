"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  if (segments.length === 0) {
    return null
  }

  return (
    <nav aria-label="Breadcrumb" className="text-sm font-medium">
      <ol className="flex items-center gap-1.5">
        <li>
          <Link href="/dashboard" className="hover:text-primary">
            Dashboard
          </Link>
        </li>
        {segments.map((segment, index) => {
          const href = "/" + segments.slice(0, index + 1).join("/")
          const isLast = index === segments.length - 1
          return (
            <li key={href} className="flex items-center gap-1.5">
              <ChevronRight className="h-4 w-4" />
              <Link
                href={href}
                className={isLast ? "text-foreground" : "hover:text-primary"}
                aria-current={isLast ? "page" : undefined}
              >
                {segment.charAt(0).toUpperCase() + segment.slice(1)}
              </Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
