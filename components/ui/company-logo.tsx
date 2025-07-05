'use client';

import React from "react"
import Image from "next/image"
import { Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface CompanyLogoProps {
  companyName: string
  logoUrl?: string | null
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string
  showFallback?: boolean
  rounded?: boolean
}

const sizeClasses = {
  xs: "w-4 h-4",
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-12 h-12",
  xl: "w-16 h-16"
}

const iconSizeClasses = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-8 h-8",
  xl: "w-10 h-10"
}

export function CompanyLogo({
  companyName,
  logoUrl,
  size = "md",
  className,
  showFallback = true,
  rounded = true
}: CompanyLogoProps) {
  const [imageError, setImageError] = React.useState(false)
  const [imageLoading, setImageLoading] = React.useState(true)

  const handleImageError = () => {
    setImageError(true)
    setImageLoading(false)
  }

  const handleImageLoad = () => {
    setImageLoading(false)
    setImageError(false)
  }

  // Show fallback if no logo URL, image failed to load, or showFallback is false
  const shouldShowFallback = !logoUrl || imageError || !showFallback

  if (shouldShowFallback) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted border",
          sizeClasses[size],
          rounded && "rounded",
          className
        )}
        title={`${companyName} logo`}
      >
        <Building2 
          className={cn(
            "text-muted-foreground",
            iconSizeClasses[size]
          )}
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted border",
        sizeClasses[size],
        rounded && "rounded",
        className
      )}
      title={`${companyName} logo`}
    >
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Building2 
            className={cn(
              "text-muted-foreground animate-pulse",
              iconSizeClasses[size]
            )}
          />
        </div>
      )}
      <Image
        src={logoUrl}
        alt={`${companyName} logo`}
        fill
        className="object-contain"
        onError={handleImageError}
        onLoad={handleImageLoad}
        sizes={`${sizeClasses[size].split(" ")[0].replace("w-", "")}px`}
      />
    </div>
  )
}

interface CompanyLogoWithNameProps extends CompanyLogoProps {
  nameClassName?: string
  layout?: "horizontal" | "vertical"
  gap?: "xs" | "sm" | "md" | "lg"
}

const gapClasses = {
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4"
}

export function CompanyLogoWithName({
  companyName,
  logoUrl,
  size = "md",
  className,
  nameClassName,
  layout = "horizontal",
  gap = "sm",
  ...logoProps
}: CompanyLogoWithNameProps) {
  return (
    <div
      className={cn(
        "flex items-center",
        layout === "vertical" ? "flex-col" : "flex-row",
        gapClasses[gap],
        className
      )}
    >
      <CompanyLogo
        companyName={companyName}
        logoUrl={logoUrl}
        size={size}
        {...logoProps}
      />
      <span className={cn("font-medium", nameClassName)}>
        {companyName}
      </span>
    </div>
  )
}

export default CompanyLogo
