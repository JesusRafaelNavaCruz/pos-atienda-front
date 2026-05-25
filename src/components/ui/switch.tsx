// src/components/ui/switch.tsx
import * as React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { cn } from '@/lib/utils'

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-200 outline-none',
      // Estado de enfoque (Focus) adaptado al estilo suave azul
      'focus-visible:ring-4 focus-visible:ring-blue-50 focus-visible:border-blue-600', 
      // Estados de color (Encendido: Azul brillante / Apagado: Gris claro limpio)
      'data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-200', 'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    {/* El botón deslizante interno (Thumb) */}
    <SwitchPrimitive.Thumb 
      className={cn(
        'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0'
      )} 
    />
  </SwitchPrimitive.Root>
))
Switch.displayName = SwitchPrimitive.Root.displayName
export { Switch }