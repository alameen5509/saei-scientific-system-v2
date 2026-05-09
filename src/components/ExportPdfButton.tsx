"use client";

// زر تصدير PDF — يستخدم jsPDF
// ⚠️ ملاحظة عن العربية: jsPDF base لا يدعم خطوط عربية افتراضياً.
// النصوص العربية ستظهر معكوسة/مكسّرة. لتصدير PDF عربي حقيقي، يحتاج:
//   - تحميل ملف خط عربي (.ttf) كـ Base64
//   - استخدام doc.addFileToVFS و doc.addFont
//   - استخدام مكتبة bidi للـRTL handling
//   - هذا عمل طويل غير مكتمل في هذه الجلسة
// لهذا، الـPDF يولّد بالأرقام والإنجليزية فقط (مناسب للتقارير الكمية).
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";

interface Props {
  filename: string;
  title: string;
  subtitle?: string;
  // كل صف عبارة عن قائمة [label, value]
  rows: [string, string | number][];
  /** استخدم encoding بسيط — يحوي حروف لاتينية وأرقام فقط */
  asciiOnly?: boolean;
}

function ascii(s: string): string {
  // استبدل العربية بـ romanization تقريبي للحالة الافتراضية
  // استخدم asciiOnly=true لو أردت تنظيفاً صارماً
  return s.replace(/[^\x20-\x7E]/g, "?");
}

export function ExportPdfButton({
  filename,
  title,
  subtitle,
  rows,
  asciiOnly = true,
}: Props) {
  function generate() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(asciiOnly ? ascii(title) : title, 14, 20);
    if (subtitle) {
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(asciiOnly ? ascii(subtitle) : subtitle, 14, 28);
    }
    doc.setTextColor(0);
    doc.setFontSize(10);

    let y = 42;
    for (const [label, value] of rows) {
      const l = asciiOnly ? ascii(label) : label;
      const v = String(value);
      doc.text(`${l}: ${v}`, 14, y);
      y += 7;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    }
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Generated: ${new Date().toISOString()}`,
      14,
      290
    );
    doc.save(filename);
  }
  return (
    <Button variant="outline" onClick={generate}>
      <FileDown className="h-4 w-4" />
      PDF
    </Button>
  );
}
