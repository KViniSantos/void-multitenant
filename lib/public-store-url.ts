export type PublicStoreIdentity = {
  slug: string;
  domain: string | null;
};

const STORE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CUSTOM_DOMAIN_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

function assertValidSlug(slug: string): void {
  if (typeof slug !== "string" || !STORE_SLUG_PATTERN.test(slug)) {
    throw new TypeError("Store slug must contain lowercase letters, numbers, and single hyphens only.");
  }
}

function normalizeDomain(domain: string): string {
  if (typeof domain !== "string" || !CUSTOM_DOMAIN_PATTERN.test(domain.toLowerCase())) {
    throw new TypeError("Custom domain must be a valid hostname without a scheme, port, or path.");
  }

  return domain.toLowerCase();
}

function getPlatformOrigin(platformUrl: string | null | undefined): string {
  if (typeof platformUrl !== "string" || platformUrl.trim() !== platformUrl || platformUrl.length === 0) {
    throw new TypeError("A canonical HTTP(S) platform URL is required.");
  }

  let parsed: URL;
  try {
    parsed = new URL(platformUrl);
  } catch {
    throw new TypeError("A canonical HTTP(S) platform URL is required.");
  }

  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    parsed.hostname.length === 0 ||
    parsed.username.length > 0 ||
    parsed.password.length > 0
  ) {
    throw new TypeError("Platform URL must be an absolute HTTP(S) URL without credentials.");
  }

  return parsed.origin;
}

export function buildPublicStoreUrl(
  { slug, domain }: PublicStoreIdentity,
  platformUrl: string | null | undefined,
): string {
  assertValidSlug(slug);

  if (domain !== null) {
    return `https://${normalizeDomain(domain)}/`;
  }

  return `${getPlatformOrigin(platformUrl)}/${slug}`;
}
