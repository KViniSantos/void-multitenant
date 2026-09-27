export type TenantAssetFolder = "logo" | "products" | "banners" | "about" | "gallery";

const allowedExtensions = new Set(["jpg", "png", "webp", "avif"]);
const allowedFolders = new Set<TenantAssetFolder>(["logo", "products", "banners", "about", "gallery"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Resolve an owned public store asset URL into its Storage path. */
export function getTenantAssetPath(
  url: string,
  tenantId: string,
  folder: TenantAssetFolder,
  supabaseOrigin: string,
): string | null {
  if (!uuidPattern.test(tenantId) || !allowedFolders.has(folder)) return null;
  try {
    const asset = new URL(url);
    const configuredSupabase = new URL(supabaseOrigin);
    if (asset.origin !== configuredSupabase.origin || asset.username || asset.password || asset.search || asset.hash) return null;

    const prefix = "/storage/v1/object/public/store-assets/";
    if (!asset.pathname.startsWith(prefix)) return null;

    const segments = asset.pathname.slice(prefix.length).split("/");
    if (segments.length !== 3 || segments[0] !== tenantId || segments[1] !== folder) return null;

    const filename = segments[2];
    const extension = filename.split(".").at(-1)?.toLowerCase();
    if (!filename || filename.includes("%") || !extension || !allowedExtensions.has(extension)) return null;

    return `${segments[0]}/${segments[1]}/${filename}`;
  } catch {
    return null;
  }
}

/** Return only unique, owned gallery paths which are no longer retained. */
export function getRemovedGalleryPaths(
  previousUrls: string[],
  nextUrls: string[],
  tenantId: string,
  supabaseOrigin: string,
): string[] {
  const retainedPaths = new Set(
    nextUrls
      .map((url) => getTenantAssetPath(url, tenantId, "gallery", supabaseOrigin))
      .filter((path): path is string => path !== null),
  );
  const removedPaths = new Set<string>();

  for (const url of previousUrls) {
    const path = getTenantAssetPath(url, tenantId, "gallery", supabaseOrigin);
    if (path && !retainedPaths.has(path)) removedPaths.add(path);
  }

  return [...removedPaths];
}
