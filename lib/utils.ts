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

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export { cn, formatLocalized, randomInt };
