"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

type AssetFolder = "logo" | "products" | "banners" | "about" | "gallery";

async function detectedImageType(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const ascii = (start: number, length: number) => String.fromCharCode(...bytes.slice(start, start + length));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (ascii(0, 8) === "\x89PNG\r\n\x1a\n") return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
  if (ascii(4, 4) === "ftyp" && ["avif", "avis"].includes(ascii(8, 4))) return "image/avif";
  return null;
}

export async function uploadTenantImages(
  supabase: SupabaseClient<Database>,
  files: File[],
  tenantId: string,
  folder: AssetFolder,
  maxFiles = 8,
) {
  const selected = files.filter((file) => file.size > 0);
  if (selected.length > maxFiles) {
    return { urls: [] as string[], paths: [] as string[], error: `Envie no máximo ${maxFiles} imagens.` };
  }
  for (const file of selected) {
    if (!imageExtensions[file.type] || file.size > 5 * 1024 * 1024) {
      return { urls: [] as string[], paths: [] as string[], error: "Use imagens JPG, PNG, WebP ou AVIF de até 5 MB cada." };
    }
    if (await detectedImageType(file) !== file.type) {
      return { urls: [] as string[], paths: [] as string[], error: "Um dos arquivos não corresponde ao formato de imagem selecionado." };
    }
  }

  const urls: string[] = [];
  const paths: string[] = [];
  try {
    for (const file of selected) {
      const path = `${tenantId}/${folder}/${crypto.randomUUID()}.${imageExtensions[file.type]}`;
      const { error } = await supabase.storage.from("store-assets").upload(path, file, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) throw new Error(error.message);
      paths.push(path);
      urls.push(supabase.storage.from("store-assets").getPublicUrl(path).data.publicUrl);
    }
    return { urls, paths, error: null };
  } catch (error) {
    if (paths.length) await supabase.storage.from("store-assets").remove(paths);
    const message = error instanceof Error ? error.message : "falha de conexão";
    return {
      urls: [] as string[],
      paths: [] as string[],
      error: `Não foi possível enviar as imagens ao Supabase Storage (${message}). Confira a sessão e as políticas do bucket store-assets.`,
    };
  }
}
