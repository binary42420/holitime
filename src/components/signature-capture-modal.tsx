"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { RotateCcw, Check, X } from "lucide-react"

interface SignatureCaptureModalProps {
  isOpen: boolean
  onClose: () => void
  onSignatureSubmit: (signatureData: string) => void
  title?: string
  description?: string
  loading?: boolean
}

export default function SignatureCaptureModal({
  isOpen,
  onClose,
  onSignatureSubmit,
  title = "Digital Signature",
  description = "Please sign below to approve this timesheet",
  loading = false
}: SignatureCaptureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (ctx) {
        // Set canvas size
        canvas.width = canvas.offsetWidth
        canvas.height = canvas.offsetHeight
        
        // Set drawing styles
        ctx.strokeStyle = "#000000"
        ctx.lineWidth = 2
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        setHasSignature(false)
      }
    }
  }, [isOpen])

  const getEventPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    
    if ("touches" in e) {
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
    const pos = getEventPos(e)
    setIsDrawing(true)
    setLastPoint(pos)
    setHasSignature(true)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing || !lastPoint || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const currentPos = getEventPos(e)
    
    ctx.beginPath()
    ctx.moveTo(lastPoint.x, lastPoint.y)
    ctx.lineTo(currentPos.x, currentPos.y)
    ctx.stroke()
    
    setLastPoint(currentPos)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    setLastPoint(null)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setHasSignature(false)
    }
  }

  const handleSubmit = () => {
    if (!hasSignature || !canvasRef.current) return

    // Convert canvas to base64 data URL
    const signatureData = canvasRef.current.toDataURL("image/png")
    onSignatureSubmit(signatureData)
  }

  const handleClose = () => {
    clearSignature()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Signature Canvas */}
          <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 bg-white">
            <canvas
              ref={canvasRef}
              className="w-full h-48 cursor-crosshair touch-none"
              style={{ touchAction: "none" }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>

          {/* Instructions */}
          <div className="text-sm text-muted-foreground text-center">
            <p>Sign above using your mouse or finger on touch devices</p>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={clearSignature}
              disabled={!hasSignature || loading}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!hasSignature || loading}
              >
                <Check className="h-4 w-4 mr-2" />
                {loading ? "Submitting..." : "Submit Signature"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
