"use client"

import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from './ui/button';

interface SignaturePadProps {
  // Props you might want to pass to SignatureCanvas, like penColor, canvasProps, etc.
}

export interface SignaturePadRef {
  clear: () => void;
  getTrimmedCanvas: () => HTMLCanvasElement;
  isEmpty: () => boolean;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>((props, ref) => {
  const sigCanvas = useRef<SignatureCanvas>(null);

  useImperativeHandle(ref, () => ({
    clear: () => {
      sigCanvas.current?.clear();
    },
    getTrimmedCanvas: () => {
      if (!sigCanvas.current) {
        throw new Error("Signature canvas not available");
      }
      return sigCanvas.current.getTrimmedCanvas();
    },
    isEmpty: () => {
      return sigCanvas.current?.isEmpty() ?? true;
    }
  }));

  return (
    <div className="relative w-full h-64 border rounded-lg bg-muted/20">
      <SignatureCanvas
        ref={sigCanvas}
        penColor='black'
        canvasProps={{ className: 'w-full h-full' }}
        {...props}
      />
    </div>
  );
});

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;
