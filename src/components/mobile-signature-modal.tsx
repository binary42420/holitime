'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RotateCcw, Check, X, Smartphone } from 'lucide-react'

interface MobileSignatureModalProps {
  isOpen: boolean
  onClose: () => void
  onSignatureSubmit: (signatureData: string) => void
  title?: string
  description?: string
  loading?: boolean
  approvalType?: 'client' | 'manager'
}

export const MobileSignatureModal: React.FC<MobileSignatureModalProps> = ({
  isOpen,
  onClose,
  onSignatureSubmit,
  title = "Digital Signature",
  description = "Please sign below to confirm approval",
  loading = false,
  approvalType = 'client'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Initialize canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size based on container
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = isMobile ? 3 : 2 // Thicker lines on mobile
    
    // Clear canvas
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [isOpen, isMobile])

  const getEventPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    
    if ('touches' in e) {
      // Touch event
      const touch = e.touches[0] || e.changedTouches[0]
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      }
    } else {
      // Mouse event
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDrawing(true)
    setHasSignature(true)
    
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const pos = getEventPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const pos = getEventPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const handleSubmit = () => {
    if (!hasSignature || !canvasRef.current) return

    const signatureData = canvasRef.current.toDataURL('image/png')
    onSignatureSubmit(signatureData)
  }

  const handleClose = () => {
    clearSignature()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "w-[95vw] max-w-md mx-auto",
        isMobile ? "h-[80vh] max-h-[600px]" : "max-w-2xl"
      )}>
        <DialogHeader className="text-center pb-4">
          <DialogTitle className="text-lg font-semibold flex items-center justify-center gap-2">
            {isMobile && <Smartphone className="h-5 w-5" />}
            {title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {description}
          </p>
          {isMobile && (
            <p className="text-xs text-muted-foreground mt-1 bg-blue-50 p-2 rounded">
              💡 Tip: Use your finger to sign. Turn your device to landscape for more space.
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4">
          {/* Signature Canvas */}
          <div className="relative flex-1 min-h-[200px] border-2 border-dashed border-gray-300 rounded-lg bg-white">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            
            {!hasSignature && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-gray-400">
                  <div className="text-2xl mb-2">✍️</div>
                  <p className="text-sm">
                    {isMobile ? 'Sign with your finger' : 'Click and drag to sign'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={clearSignature}
              disabled={!hasSignature || loading}
              className="flex-1 min-h-[48px]"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!hasSignature || loading}
            className="w-full min-h-[48px] text-base font-medium"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                {approvalType === 'manager' ? 'Approve Timesheet' : 'Submit Approval'}
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="w-full min-h-[48px]"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MobileSignatureModal
