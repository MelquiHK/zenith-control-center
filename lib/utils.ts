import { type ClassValue, clsx } from 'clsx'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function toCUP(amount: number, currency: string, rate: number): number {
  return currency === 'USD' ? amount * rate : amount
}

export function fmtCUP(amount: number): string {
  return new Intl.NumberFormat('es-CU', { maximumFractionDigits: 0 }).format(amount) + ' CUP'
}

export function fmtUSD(amount: number): string {
  return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

export function fmtMoney(amount: number, currency: string): string {
  return currency === 'USD' ? fmtUSD(amount) : fmtCUP(amount)
}

export function fmtDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd MMM yyyy, HH:mm", { locale: es })
  } catch {
    return dateStr
  }
}

export function fmtDateShort(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd/MM/yy", { locale: es })
  } catch {
    return dateStr
  }
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export const SERVICE_TYPES = [
  'Mantenimiento Split',
  'Instalación Split',
  'Reparación Split',
  'Reparación Electrónica',
  'Configuración/Programación',
  'Diagnóstico General',
  'Otro servicio',
]

export const INCOME_CATEGORIES = [
  'Venta producto',
  'Servicio técnico',
  'Reparación',
  'Instalación split',
  'Comisión recibida',
  'Otro ingreso',
]

export const EXPENSE_CATEGORIES = [
  'Compra inventario',
  'Transporte',
  'Herramientas',
  'Suplementos',
  'Servicios',
  'Salida personal',
  'Comisión pagada',
  'Otro gasto',
]

export const STATUS_COLORS: Record<string, string> = {
  'Pendiente':  'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  'En Proceso': 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
  'Cobrado':    'text-green-400 bg-green-400/10 border-green-400/30',
}
