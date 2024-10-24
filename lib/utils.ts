import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatLocalized(selectedMonth: Date, pattern: string): string {
  return format(selectedMonth, pattern, { locale: ptBR });
}

export { cn, formatLocalized };
