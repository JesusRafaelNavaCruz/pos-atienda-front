import { useState } from "react";
import { Button } from "../ui/button";
import { Barcode } from "lucide-react";

interface BarcodegeneratorProps {
  tenantId?: string;
  sku?: string; // Opcional, por si quieren generar uno basado puramente en Tenant
  existingBarcode?: string; // Para saber si el input ya tiene un código y desactivar el botón
  onGenerated: (code: string) => void; // Alerta al formulario padre del nuevo código
}

const BarcodeGenerator: React.FC<BarcodegeneratorProps> = ({
  tenantId,
  sku,
  existingBarcode,
  onGenerated,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateBarcode = () => {
    setIsGenerating(true);

    let finalBarcode = "";
    if (sku && sku.trim().length > 0) {
      // Opción A: El usuario escribió un SKU, lo sanitizamos para CODE 128
      finalBarcode = sku
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9_-]/g, ""); // Remueve caracteres raros que rompen escáneres
    } else {
      // Opción B: No hay SKU (es granel o vacío), generamos uno seguro por Tenant
      const timestampCorto = Date.now().toString().slice(-4);
      finalBarcode = `T${tenantId}-${timestampCorto}`.toUpperCase();
    }

    // Enviamos el código generado al componente padre
    onGenerated(finalBarcode);

    setIsGenerating(false);
  };

  const isDisabled = isGenerating || !!existingBarcode;

  return (
    <Button
      type="button"
      onClick={generateBarcode}
      disabled={isDisabled}
      className={`
        px-3 py-2 rounded-md text-sm font-medium transition-colors h-10
        ${
          !existingBarcode
            ? "bg-blue-600 hover:bg-blue-700 text-white"
            : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      <Barcode className="h-5 w-5" />
    </Button>
  );
};

export default BarcodeGenerator;
