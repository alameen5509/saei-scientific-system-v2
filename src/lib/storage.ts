// Supabase Storage — رفع وتنزيل ملفات تسليمات الأعمال العلمية
// — يستخدم Service Role Key على السيرفر فقط (يتجاوز RLS)
// — لا تستورد هذا الملف من Client Components
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const BUCKET_NAME =
  process.env.SUPABASE_BUCKET_NAME ?? "saei-uploads";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "تخزين Supabase غير مهيّأ — أضف SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في .env"
    );
  }
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

/** هل خدمة التخزين مهيّأة؟ تُستخدم لتعطيل أزرار الواجهة بأمان */
export function isStorageConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

/** ينشئ الـbucket إن لم يكن موجوداً (idempotent). private + 50MB max */
export async function ensureBucket(): Promise<void> {
  const supabase = getClient();
  const { data: existing } = await supabase.storage.getBucket(BUCKET_NAME);
  if (existing) return;

  const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
    public: false,
    fileSizeLimit: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  });
  if (error) {
    throw new Error(`تعذّر إنشاء bucket: ${error.message}`);
  }
}

/** يبني مساراً منظّماً لتسليم الملف داخل الـbucket */
export function buildStoragePath(args: {
  workId: string;
  version: number;
  fileName: string;
}): string {
  // sanitize file name — keep extension and basics
  const safe = args.fileName
    .replace(/[^\w.\-؀-ۿ]+/g, "_")
    .slice(0, 120);
  return `works/${args.workId}/v${args.version}_${Date.now()}_${safe}`;
}

/**
 * يولّد signed URL لرفع ملف مباشرةً من المتصفح إلى Supabase
 * — مدّة الصلاحية: 5 دقائق
 * — على المتصفح: PUT request إلى الـURL الراجعة بـbody = الملف
 */
export async function createSignedUploadUrl(
  storagePath: string
): Promise<{ url: string; token: string; path: string }> {
  await ensureBucket();
  const supabase = getClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUploadUrl(storagePath);
  if (error || !data) {
    throw new Error(`تعذّر إنشاء رابط الرفع: ${error?.message ?? "unknown"}`);
  }
  return { url: data.signedUrl, token: data.token, path: data.path };
}

/**
 * يولّد signed URL لتنزيل ملف
 * — افتراضي: 5 دقائق
 * — تستخدم في API endpoint بعد التحقق من صلاحيات المستخدم
 */
export async function createSignedDownloadUrl(
  storagePath: string,
  expiresInSec = 300
): Promise<string> {
  const supabase = getClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, expiresInSec);
  if (error || !data?.signedUrl) {
    throw new Error(`تعذّر إنشاء رابط التنزيل: ${error?.message ?? "unknown"}`);
  }
  return data.signedUrl;
}

/** يحذف ملفاً (إن لزم تنظيف بعد فشل في DB write) */
export async function deleteObject(storagePath: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);
  if (error) {
    console.warn(`تعذّر حذف ${storagePath}: ${error.message}`);
  }
}

/** يتحقق من وجود ملف في Storage (للـverify بعد upload) */
export async function objectExists(storagePath: string): Promise<boolean> {
  const supabase = getClient();
  // listing parent prefix is the simplest existence check
  const slashIdx = storagePath.lastIndexOf("/");
  const prefix = slashIdx >= 0 ? storagePath.slice(0, slashIdx) : "";
  const target = slashIdx >= 0 ? storagePath.slice(slashIdx + 1) : storagePath;
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(prefix, { limit: 100, search: target });
  if (error) return false;
  return Array.isArray(data) && data.some((f) => f.name === target);
}
