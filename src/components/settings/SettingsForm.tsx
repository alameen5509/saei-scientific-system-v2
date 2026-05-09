"use client";

// نموذج تحرير الإعدادات العامة (key/value JSON)
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

interface Item {
  key: string;
  description: string;
  placeholder: string;
  value?: string | number;
}

export function SettingsForm({ items }: { items: Item[] }) {
  const toast = useToast();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((i) => [i.key, i.value != null ? String(i.value) : ""]))
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const payload = items.map((i) => {
        const raw = values[i.key];
        const num = raw === "" ? null : Number(raw);
        return {
          key: i.key,
          description: i.description,
          value: Number.isFinite(num) ? num : raw,
        };
      });
      const r = await fetch("/api/system-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error);
      toast.success("تم حفظ الإعدادات");
    } catch (e) {
      toast.error("فشل الحفظ", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div key={it.key} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
          <div>
            <Label className="font-bold">{it.key}</Label>
            <p className="text-xs text-stone-500 mt-1">{it.description}</p>
          </div>
          <div className="md:col-span-2">
            <Input
              value={values[it.key] ?? ""}
              onChange={(e) =>
                setValues({ ...values, [it.key]: e.target.value })
              }
              placeholder={it.placeholder}
              className="ltr text-left"
            />
          </div>
        </div>
      ))}
      <Button variant="primary" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        حفظ الإعدادات
      </Button>
    </div>
  );
}
