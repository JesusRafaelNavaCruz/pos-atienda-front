// src/hooks/useThermalPrinter.ts
// Integración con impresora térmica via Web Serial API.
// Soporta protocolo ESC/POS (Epson, Bixolon, Star, y compatibles).

import { useState, useRef, useCallback } from "react";
import type { Sale } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";

// Comandos ESC/POS básicos
const ESC = 0x1b;
const GS = 0x1d;

const CMD = {
  INIT: [ESC, 0x40],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT: [ESC, 0x21, 0x10],
  NORMAL_SIZE: [ESC, 0x21, 0x00],
  LINE_FEED: [0x0a],
  CUT_PAPER: [GS, 0x56, 0x42, 0x00],
  DRAWER_KICK: [ESC, 0x70, 0x00, 0x19, 0xfa],
};

const CHARS_PER_LINE = 42;

function encodeText(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function padRight(text: string, width: number): string {
  return text.slice(0, width).padEnd(width, " ");
}

function padLeft(text: string, width: number): string {
  return text.slice(0, width).padStart(width, " ");
}

function divider(): Uint8Array {
  return encodeText("-".repeat(CHARS_PER_LINE) + "\n");
}

function buildTicket(sale: Sale, tenantName: string): Uint8Array {
  const chunks: number[] = [];

  const push = (...bytes: number[]) => chunks.push(...bytes);
  const pushCmd = (cmd: number[]) => push(...cmd);
  const pushText = (text: string) => push(...encodeText(text));

  pushCmd(CMD.INIT);
  pushCmd(CMD.ALIGN_CENTER);
  pushCmd(CMD.BOLD_ON);
  pushCmd(CMD.DOUBLE_HEIGHT);
  pushText(tenantName.toUpperCase() + "\n");
  pushCmd(CMD.NORMAL_SIZE);
  pushCmd(CMD.BOLD_OFF);
  pushText("\n");

  pushCmd(CMD.ALIGN_LEFT);
  push(...divider());
  pushText(`Folio: ${sale.folio}\n`);
  pushText(`Fecha: ${formatDateTime(sale.created_at)}\n`);
  if (sale.customer) pushText(`Cliente: ${sale.customer.name}\n`);
  if (sale.user) pushText(`Cajero: ${sale.user.full_name}\n`);
  push(...divider());

  // Encabezado de artículos
  pushText(
    padRight("ARTÍCULO", 24) +
      padLeft("CANT", 6) +
      padLeft("PRECIO", 12) +
      "\n",
  );
  push(...divider());

  // Items
  for (const item of sale.items ?? []) {
    const name = padRight(item.product?.name ?? "Producto", 24);
    const qty = padLeft(String(item.quantity), 6);
    const price = padLeft(formatCurrency(item.subtotal), 12);
    pushText(name + qty + price + "\n");
    if (item.discount > 0) {
      pushText(
        padRight(
          `  Descuento: -${formatCurrency(item.discount)}`,
          CHARS_PER_LINE,
        ) + "\n",
      );
    }
  }

  push(...divider());

  // Totales
  if (sale.discount > 0) {
    pushText(
      padRight("Subtotal:", 30) +
        padLeft(formatCurrency(sale.subtotal), 12) +
        "\n",
    );
    pushText(
      padRight("Descuento:", 30) +
        padLeft(`-${formatCurrency(sale.discount)}`, 12) +
        "\n",
    );
    push(...divider());
  }

  pushCmd(CMD.BOLD_ON);
  pushText(
    padRight("TOTAL:", 30) + padLeft(formatCurrency(sale.total), 12) + "\n",
  );
  pushCmd(CMD.BOLD_OFF);
  push(...divider());

  // Pagos
  for (const payment of sale.payments ?? []) {
    const methodLabel: Record<string, string> = {
      cash: "Efectivo",
      card: "Tarjeta",
      transfer: "Transferencia",
      credit: "Crédito",
    };
    pushText(
      padRight(methodLabel[payment.method] ?? payment.method, 30) +
        padLeft(formatCurrency(payment.amount), 12) +
        "\n",
    );
    if (payment.change_given > 0) {
      pushText(
        padRight("Cambio:", 30) +
          padLeft(formatCurrency(payment.change_given), 12) +
          "\n",
      );
    }
  }

  push(...divider());
  pushCmd(CMD.ALIGN_CENTER);
  pushText("\n¡Gracias por su compra!\n\n\n");
  pushCmd(CMD.CUT_PAPER);

  return new Uint8Array(chunks);
}

// ─── Hook principal ───────────────────────────────────────────────────────────

interface UseThermalPrinter {
  isSupported: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  printSale: (sale: Sale, tenantName: string) => Promise<void>;
  openDrawer: () => Promise<void>;
  error: string | null;
}

export function useThermalPrinter(): UseThermalPrinter {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const portRef = useRef<SerialPort | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(
    null,
  );

  const isSupported = "serial" in navigator;

  const connect = useCallback(async () => {
    if (!isSupported) {
      setError(
        "Web Serial API no está disponible en este navegador. Usa Chrome o Edge.",
      );
      return;
    }
    try {
      setIsConnecting(true);
      setError(null);
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      portRef.current = port;
      writerRef.current = port.writable!.getWriter();
      setIsConnected(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al conectar la impresora",
      );
    } finally {
      setIsConnecting(false);
    }
  }, [isSupported]);

  const disconnect = useCallback(() => {
    writerRef.current?.releaseLock();
    portRef.current?.close().catch(() => {});
    portRef.current = null;
    writerRef.current = null;
    setIsConnected(false);
  }, []);

  const send = useCallback(async (data: Uint8Array) => {
    if (!writerRef.current) throw new Error("Impresora no conectada");
    await writerRef.current.write(data);
  }, []);

  const printSale = useCallback(
    async (sale: Sale, tenantName: string) => {
      try {
        setError(null);
        await send(buildTicket(sale, tenantName));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al imprimir";
        setError(msg);
        throw new Error(msg);
      }
    },
    [send],
  );

  const openDrawer = useCallback(async () => {
    try {
      await send(new Uint8Array(CMD.DRAWER_KICK));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al abrir cajón");
    }
  }, [send]);

  return {
    isSupported,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    printSale,
    openDrawer,
    error,
  };
}
