import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const allowedTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

async function detectImageType(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const ascii = (start: number, length: number) => String.fromCharCode(...bytes.slice(start, start + length));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (ascii(0, 8) === "\x89PNG\r\n\x1a\n") return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
  if (ascii(4, 4) === "ftyp" && ["avif", "avis"].includes(ascii(8, 4))) return "image/avif";
  return null;
}

export async function uploadTenantAsset(
  supabase: SupabaseClient<Database>,
  file: FormDataEntryValue | null,
  tenantId: string,
  folder: "logo" | "products",
) {
  if (!(file instanceof File) || file.size === 0) return { url: null, path: null, error: null };
  if (!allowedTypes[file.type]) {
    return { url: null, path: null, error: "Use uma imagem JPG, PNG, WebP ou AVIF." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { url: null, path: null, error: "A imagem deve ter no máximo 5 MB." };
  }
  if (await detectImageType(file) !== file.type) {
    return { url: null, path: null, error: "O arquivo enviado não corresponde ao formato de imagem selecionado." };
  }

  const path = `${tenantId}/${folder}/${crypto.randomUUID()}.${allowedTypes[file.type]}`;
  const { error } = await supabase.storage.from("store-assets").upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) return { url: null, path: null, error: "Não foi possível enviar a imagem. Tente novamente." };
  const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
  return { url: data.publicUrl, path, error: null };
}
