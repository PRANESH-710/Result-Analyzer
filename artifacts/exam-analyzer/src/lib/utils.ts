import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDecimals(num: number, decimals: number = 2) {
  return Number(Math.round(Number(num + 'e' + decimals)) + 'e-' + decimals).toFixed(decimals);
}

export function getGradeColor(score: number, passPercentage: number) {
  if (score < passPercentage) return "text-red-500 font-semibold";
  if (score >= 90) return "text-emerald-400 font-semibold";
  if (score >= 75) return "text-blue-400";
  return "text-foreground";
}

export function getHeatmapColor(score: number, passPercentage: number) {
  if (score < passPercentage) return "bg-red-500/20 text-red-200 border-red-500/30";
  if (score >= 90) return "bg-emerald-500/20 text-emerald-200 border-emerald-500/30";
  if (score >= 75) return "bg-blue-500/20 text-blue-200 border-blue-500/30";
  return "bg-secondary/50 text-foreground border-border";
}
