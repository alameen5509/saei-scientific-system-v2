// خدمة العقود — تحقق المدخلات + serialization للواجهة
import type { ContractModel as Contract } from "@/generated/prisma/models/Contract";

export interface ContractMilestone {
  label: string;
  dueDate: string; // ISO yyyy-mm-dd
  amount: number;
  paidAt?: string | null; // ISO
}

export type ContractDto = Omit<Contract, "value" | "milestones"> & {
  value: number | null;
  milestones: ContractMilestone[];
};

export function serializeContract(c: Contract): ContractDto {
  return {
    ...c,
    value: c.value ? Number(c.value) : null,
    milestones: Array.isArray(c.milestones)
      ? (c.milestones as unknown as ContractMilestone[])
      : [],
  };
}

const VALID_KINDS = ["RESEARCH", "PUBLISHING", "EDITING"] as const;
const VALID_STATUSES = [
  "DRAFT",
  "SENT",
  "SIGNED",
  "EXPIRED",
  "CANCELLED",
] as const;

export interface ContractInput {
  workId: string;
  kind: (typeof VALID_KINDS)[number];
  title: string;
  body: string;
  startsAt?: string;
  endsAt?: string;
  value?: number;
  currency?: string;
  partyName: string;
  partyEmail?: string;
  milestones?: ContractMilestone[];
}

export function validateContractInput(input: unknown):
  | { ok: true; data: ContractInput }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "بيانات العقد غير صالحة" };
  }
  const i = input as Partial<ContractInput>;

  if (!i.workId || typeof i.workId !== "string")
    return { ok: false, error: "العمل المرتبط مطلوب" };
  if (!i.kind || !VALID_KINDS.includes(i.kind as never))
    return { ok: false, error: "نوع العقد غير صالح" };
  if (!i.title || typeof i.title !== "string" || i.title.trim().length < 3)
    return { ok: false, error: "عنوان العقد قصير جداً" };
  if (!i.body || typeof i.body !== "string" || i.body.trim().length < 10)
    return { ok: false, error: "نصّ العقد قصير جداً" };
  if (!i.partyName || typeof i.partyName !== "string" || !i.partyName.trim())
    return { ok: false, error: "اسم الطرف الآخر مطلوب" };

  if (i.value !== undefined && (typeof i.value !== "number" || i.value < 0))
    return { ok: false, error: "قيمة العقد يجب أن تكون موجبة" };
  if (i.milestones !== undefined && !Array.isArray(i.milestones))
    return { ok: false, error: "قائمة الدفعات غير صالحة" };

  return {
    ok: true,
    data: {
      workId: i.workId,
      kind: i.kind as ContractInput["kind"],
      title: i.title.trim(),
      body: i.body.trim(),
      startsAt: i.startsAt,
      endsAt: i.endsAt,
      value: typeof i.value === "number" ? i.value : undefined,
      currency: typeof i.currency === "string" ? i.currency : "SAR",
      partyName: i.partyName.trim(),
      partyEmail:
        typeof i.partyEmail === "string" && i.partyEmail.trim()
          ? i.partyEmail.trim()
          : undefined,
      milestones: Array.isArray(i.milestones) ? i.milestones : undefined,
    },
  };
}

export const VALID_STATUS_TRANSITIONS: Record<
  (typeof VALID_STATUSES)[number],
  (typeof VALID_STATUSES)[number][]
> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["SIGNED", "EXPIRED", "CANCELLED"],
  SIGNED: ["EXPIRED"],
  EXPIRED: [],
  CANCELLED: [],
};
