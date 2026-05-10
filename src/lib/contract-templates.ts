// قوالب العقود — توليد body من بيانات العمل والباحث
// — تُستخدم في POST /api/contracts/from-work/[workId]
import type { ContractKind } from "@/generated/prisma/enums";
import { TRACK_LABEL, type WorkTrack } from "@/types/works";

interface WorkInfo {
  code: string;
  title: string;
  track: WorkTrack;
  startedAt: Date;
  deadline: Date;
  researcher: { displayName: string };
}

const CURRENCY_AR: Record<string, string> = {
  SAR: "ريالاً سعودياً",
  USD: "دولاراً أمريكياً",
  EUR: "يورو",
};

function arabicDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function generateContractTemplate(args: {
  kind: ContractKind;
  work: WorkInfo;
  partyName?: string;
  value?: number;
  currency?: string;
}): { title: string; body: string; partyName: string } {
  const { kind, work } = args;
  const partyName = args.partyName ?? work.researcher.displayName;
  const value = args.value;
  const currency = args.currency ?? "SAR";
  const currencyName = CURRENCY_AR[currency] ?? currency;
  const trackLabel = TRACK_LABEL[work.track];
  const startsAt = arabicDate(work.startedAt);
  const endsAt = arabicDate(work.deadline);
  const valueText = value
    ? `${value.toLocaleString("ar-SA")} ${currencyName}`
    : "[يُحدَّد لاحقاً]";

  if (kind === "RESEARCH") {
    return {
      title: `عقد إعداد ${trackLabel}: ${work.title}`,
      partyName,
      body: `بسم الله الرحمن الرحيم

عقد إعداد عمل علمي
كود العمل: ${work.code}

أبرم هذا العقد بين:
الطرف الأول: مؤسسة ساعي للأعمال العلمية.
الطرف الثاني: ${partyName}.

البند الأول — موضوع العقد:
يلتزم الطرف الثاني بإعداد ${trackLabel} بعنوان "${work.title}" وفق المعايير العلمية المعتمَدة في المؤسسة.

البند الثاني — المدة:
يبدأ التنفيذ من ${startsAt} وينتهي بحد أقصى في ${endsAt}.

البند الثالث — المقابل المالي:
المقابل الإجمالي: ${valueText}، يُدفع وفق دفعات مرتبطة بالتسليمات (تُحدَّد في ملحق العقد).

البند الرابع — الالتزامات:
- يلتزم الطرف الثاني بتسليم النسخ الأوّلية والمنقّحة في المواعيد المتفَّق عليها داخل النظام.
- يحتفظ الطرف الأول بكافة حقوق الملكية الفكرية والنشر للعمل المُسلَّم.
- المراجعة العلمية المجهولة (Blind Peer-Review) جزء أصيل من العملية.

البند الخامس — الاعتماد والنشر:
يُعتمد العمل بعد اكتمال جولة التحكيم العلمي وإجراء التعديلات المطلوبة. يصبح العمل جزءاً من إصدارات المؤسسة بعد توقيع هذا العقد.

تحرَّر هذا العقد من نسختين، بيد كل طرف نسخة، بتاريخ ${arabicDate(new Date())}.

الطرف الأول: مؤسسة ساعي                  الطرف الثاني: ${partyName}
التوقيع: ____________                     التوقيع: ____________`,
    };
  }

  if (kind === "PUBLISHING") {
    return {
      title: `عقد نشر: ${work.title}`,
      partyName,
      body: `بسم الله الرحمن الرحيم

عقد نشر
كود العمل: ${work.code}

أبرم هذا العقد بين:
الطرف الأول: مؤسسة ساعي للأعمال العلمية.
الطرف الثاني (الناشر): ${partyName}.

البند الأول — الموضوع:
يلتزم الطرف الثاني بطباعة ونشر ${trackLabel} "${work.title}" وفق المواصفات الفنية المرفقة.

البند الثاني — المدة:
تسليم نهائي بحد أقصى ${endsAt}.

البند الثالث — التكلفة:
${valueText}.

البند الرابع — الكميات والتوزيع:
يحدَّد عدد النسخ وآلية التوزيع في ملحق هذا العقد.

البند الخامس — المعايير:
- الالتزام بالمعايير الإملائية والنحوية المعتمَدة.
- مراجعة التصميم قبل الطباعة الفعلية.
- التحقُّق من جودة الطباعة قبل التسليم النهائي.

تحرَّر بتاريخ ${arabicDate(new Date())}.

الطرف الأول: مؤسسة ساعي                  الطرف الثاني: ${partyName}
التوقيع: ____________                     التوقيع: ____________`,
    };
  }

  // EDITING
  return {
    title: `عقد تحرير وتدقيق: ${work.title}`,
    partyName,
    body: `بسم الله الرحمن الرحيم

عقد تحرير وتدقيق
كود العمل: ${work.code}

أبرم هذا العقد بين:
الطرف الأول: مؤسسة ساعي.
الطرف الثاني: ${partyName}.

البند الأول — موضوع العقد:
يلتزم الطرف الثاني بمراجعة وتدقيق ${trackLabel} "${work.title}" لغوياً ومنهجياً.

البند الثاني — المدة:
تسليم بحد أقصى ${endsAt}.

البند الثالث — المقابل المالي:
${valueText}.

تحرَّر بتاريخ ${arabicDate(new Date())}.

الطرف الأول: مؤسسة ساعي                  الطرف الثاني: ${partyName}
التوقيع: ____________                     التوقيع: ____________`,
  };
}
