import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatLocalized(date: Date, pattern: string): string {
  return format(date, pattern, { locale: ptBR });
}

function parseLocalized(text: string, pattern: string): Date {
  return parse(text, pattern, new Date(), { locale: ptBR });
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function handleTextFileExport(
  content: string,
  fileName: string,
  toastTitle: string,
  toastDescription: string,
) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast({
    title: toastTitle,
    description: toastDescription,
  });
}

export { cn, formatLocalized, parseLocalized, randomInt, handleTextFileExport };
