// src/hooks/useBarcodeScan.ts
// Escucha el lector de código de barras USB (actúa como teclado HID).
// Acumula caracteres y dispara onScan cuando recibe Enter.
// Detecta automáticamente si es un lector (velocidad de tipeo < 50ms entre teclas)
// vs. el usuario escribiendo manualmente.

import { useEffect, useRef, useCallback } from 'react'
import type { IScannerControls } from '@zxing/browser'

interface UseBarcodeScanOptions {
  onScan: (code: string) => void
  minLength?: number      // longitud mínima para considerarlo válido (default: 3)
  maxKeyInterval?: number // ms máx entre teclas para considerarlo lector (default: 50)
  enabled?: boolean
}

export function useBarcodeScan({
  onScan,
  minLength = 3,
  maxKeyInterval = 50,
  enabled = true,
}: UseBarcodeScanOptions) {
  const buffer     = useRef('')
  const lastKeyAt  = useRef(0)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return

      // Ignorar si el foco está en un input/textarea/select (el usuario está
      // escribiendo), salvo que ese campo se haya marcado explícitamente como
      // apto para recibir el lector (data-barcode-input="true"), como el buscador
      // del POS: un lector físico dispara los mismos eventos de teclado que un
      // usuario, así que si el buscador tiene foco (autoFocus) el escaneo debe
      // seguir funcionando ahí. El propio umbral de velocidad (maxKeyInterval)
      // ya evita confundir tecleo humano normal con un lector.
      const target = e.target as HTMLElement
      const tag = target.tagName
      const isScanFriendly = target.dataset.barcodeInput === 'true'
      if (!isScanFriendly && (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')) return

      const now = Date.now()

      if (e.key === 'Enter') {
        const code = buffer.current.trim()
        if (code.length >= minLength) {
          onScan(code)
        }
        buffer.current = ''
        lastKeyAt.current = 0
        return
      }

      // Si pasó demasiado tiempo desde la última tecla, resetear buffer
      if (lastKeyAt.current && now - lastKeyAt.current > maxKeyInterval) {
        buffer.current = ''
      }

      // Solo acumular caracteres imprimibles
      if (e.key.length === 1) {
        buffer.current += e.key
        lastKeyAt.current = now
      }
    },
    [enabled, minLength, maxKeyInterval, onScan],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// ─── Hook de cámara con zxing ─────────────────────────────────────────────────

import { useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

interface UseCameraBarcode {
  isScanning: boolean
  startScan: (videoElement: HTMLVideoElement) => Promise<void>
  stopScan: () => void
  error: string | null
}

export function useCameraBarcode(onScan: (code: string) => void): UseCameraBarcode {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)

  const startScan = useCallback(async (videoElement: HTMLVideoElement) => {
    try {
      setError(null)
      setIsScanning(true)
      const reader = new BrowserMultiFormatReader()
      readerRef.current = reader

      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoElement,
        (res) => {
          if (res) {
            onScan(res.getText())
          }
        }
      )

      controlsRef.current = controls;
      
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al acceder a la cámara')
      setIsScanning(false)
    }
  }, [onScan])

  const stopScan = useCallback(() => {
    controlsRef.current?.stop()
    readerRef.current = null
    setIsScanning(false)
  }, [])

  return { isScanning, startScan, stopScan, error }
}
