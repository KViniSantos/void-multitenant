import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getTenantAssetPath, type TenantAssetFolder } from "./tenant-assets.ts";

const allowedTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export function isTenantAssetUrl(url: string, tenantId: string, folder: TenantAssetFolder) {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!configuredUrl) return false;
  return getTenantAssetPath(url, tenantId, folder, configuredUrl) !== null;
}

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
  folder: TenantAssetFolder,
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

export async function uploadTenantAssets(
  supabase: SupabaseClient<Database>,
  files: FormDataEntryValue[],
  tenantId: string,
  folder: "products" | "banners",
  maxFiles = 8,
) {
  const selected = files.filter((file): file is File => file instanceof File && file.size > 0);
  if (selected.length > maxFiles) return { urls: [] as string[], paths: [] as string[], error: `Envie no máximo ${maxFiles} imagens.` };
  const urls: string[] = [];
  const paths: string[] = [];
  for (const file of selected) {
    const result = await uploadTenantAsset(supabase, file, tenantId, folder);
    if (result.error) {
      if (paths.length) await supabase.storage.from("store-assets").remove(paths);
      return { urls: [] as string[], paths: [] as string[], error: result.error };
    }
    if (result.url && result.path) { urls.push(result.url); paths.push(result.path); }
  }
  return { urls, paths, error: null };
}
