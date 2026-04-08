// src/hooks/useScale.ts
// Integración con báscula digital via Web Serial API.
// La mayoría de básculas envían el peso en formato ASCII: "  1.250 kg\r\n"
// Se parsea el número con regex para extraer solo el valor numérico.

import { useState, useRef, useCallback, useEffect } from "react";

interface UseScale {
  isSupported: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  weight: number | null; // peso actual en kg
  rawData: string; // último string recibido (para debug)
  connect: () => Promise<void>;
  disconnect: () => void;
  capture: () => number | null; // capturar el peso actual para usarlo en una venta
  error: string | null;
}

// Regex para extraer el número de la mayoría de protocolos de básculas
// Soporta formatos: "  1.250 kg", "0001250g", "1,250", "1.250"
const WEIGHT_REGEX = /(\d+[.,]\d+|\d+)/;

function parseWeight(raw: string): number | null {
  const match = raw.match(WEIGHT_REGEX);
  if (!match) return null;
  const value = parseFloat(match[1].replace(",", "."));
  return isNaN(value) ? null : value;
}

export function useScale(): UseScale {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [weight, setWeight] = useState<number | null>(null);
  const [rawData, setRawData] = useState("");
  const [error, setError] = useState<string | null>(null);

  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(
    null,
  );
  const readingRef = useRef(false);

  const isSupported = "serial" in navigator;

  // Loop de lectura continua del stream serial
  const startReading = useCallback(async (port: SerialPort) => {
    const decoder = new TextDecoder();
    readingRef.current = true;

    try {
      while (port.readable && readingRef.current) {
        const reader = port.readable.getReader();
        readerRef.current = reader;
        try {
          while (readingRef.current) {
            const { value, done } = await reader.read();
            if (done) break;
            const text = decoder.decode(value);
            setRawData(text);
            const parsed = parseWeight(text);
            if (parsed !== null) setWeight(parsed);
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (err: unknown) {
      if (readingRef.current) {
        setError(
          err instanceof Error ? err.message : "Error de lectura de báscula",
        );
      }
    }
  }, []);

  const connect = useCallback(async () => {
    if (!isSupported) {
      setError("Web Serial API no disponible. Usa Chrome o Edge.");
      return;
    }
    try {
      setIsConnecting(true);
      setError(null);
      const port = await navigator.serial.requestPort();
      // La mayoría de básculas usan 9600 baud, 8N1
      await port.open({
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: "none",
      });
      portRef.current = port;
      setIsConnected(true);
      // Iniciar lectura en background
      startReading(port);
    } catch (err: unknown) {
      if ((err as Error).name !== "NotSelectedError") {
        setError(
          err instanceof Error ? err.message : "Error al conectar la báscula",
        );
      }
    } finally {
      setIsConnecting(false);
    }
  }, [isSupported, startReading]);

  const disconnect = useCallback(() => {
    readingRef.current = false;
    readerRef.current?.cancel().catch(() => {});
    portRef.current?.close().catch(() => {});
    portRef.current = null;
    readerRef.current = null;
    setIsConnected(false);
    setWeight(null);
  }, []);

  // Capturar peso actual para usar en el carrito
  const capture = useCallback(() => weight, [weight]);

  // Limpiar al desmontar
  useEffect(() => () => disconnect(), [disconnect]);

  return {
    isSupported,
    isConnected,
    isConnecting,
    weight,
    rawData,
    connect,
    disconnect,
    capture,
    error,
  };
}
