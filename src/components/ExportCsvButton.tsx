"use client";

// زر تصدير CSV — يبني الملف على الـclient ويُنزّله
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  filename: string;
  rows: (string | number)[][];
  label?: string;
}

function escape(v: string | number): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function ExportCsvButton({ filename, rows, label = "تصدير CSV" }: Props) {
  function handleClick() {
    // BOM للتوافق مع Excel على Windows مع UTF-8 العربي
    const csv = "﻿" + rows.map((r) => r.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" onClick={handleClick}>
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}
