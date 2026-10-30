export type MedicationUse = {
  medicationId: string;
  effectiveness: "gut" | "mittel" | "schlecht";
  painBefore?: number;
  painAfter?: number;
  reliefDurationHours?: number;
};

export type MedicationDetail = "painBefore" | "painAfter" | "reliefDurationHours";

// Missing answers stay missing; zero is a valid, explicit answer.
export function medicationDetailValue(field: MedicationDetail, value: unknown): number | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  if (typeof value === "string" && !value.trim()) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return undefined;
  if (field !== "reliefDurationHours" && (number > 10 || !Number.isInteger(number))) return undefined;
  return number;
}

export function normalizeMedicationUse(use: MedicationUse): MedicationUse {
  return {
    ...use,
    painBefore: medicationDetailValue("painBefore", use.painBefore),
    painAfter: medicationDetailValue("painAfter", use.painAfter),
    reliefDurationHours: medicationDetailValue("reliefDurationHours", use.reliefDurationHours),
  };
}
