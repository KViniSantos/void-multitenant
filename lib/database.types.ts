export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Profile = {
  id: string;
  email: string | null;
  platform_role: "platform_admin" | "user";
  created_at: string;
  updated_at: string;
};

export type StorefrontTemplate = "technology" | "nature" | "sports" | "essentials";
export type StorefrontFont = "montserrat" | "inter" | "roboto" | "lora" | "playfair";
export type ProductAvailability = "in_stock" | "preorder" | "sold_out";
export type ProductCondition = "new" | "used" | "refurbished";
export type StorefrontSectionKey = "categories" | "featured" | "catalog" | "about" | "contact";
export type ProductDetailSection = { title: string; items: { label: string; value: string }[] };

export type StorefrontConfig = {
  font_family: StorefrontFont;
  navigation: { show_home_link: boolean; show_category_links: boolean; show_category_filters: boolean; show_featured_link: boolean; show_about_link: boolean; show_contact_link: boolean; show_whatsapp_cta: boolean };
  hero: {
    enabled: boolean;
    mode: "static" | "split" | "carousel";
    title: string;
    description: string;
    cta_label: string;
    image_urls: string[];
  };
  sections: {
    categories: { enabled: boolean; title: string };
    featured: { enabled: boolean; title: string; layout: "cards" | "banners" };
    catalog: { enabled: boolean; title: string; columns: 2 | 3 | 4 | 5 };
    about: { enabled: boolean; title: string; text: string; image_url: string | null };
    contact: { enabled: boolean; title: string };
  };
  section_order: StorefrontSectionKey[];
  footer: {
    enabled: boolean;
    show_logo: boolean;
    show_categories: boolean;
    show_contact: boolean;
    cnpj: string;
    hours: string;
    email: string;
    address: string;
    instagram: string;
    facebook: string;
    tiktok: string;
    youtube: string;
    show_platform_credit: boolean;
  };
};

export const DEFAULT_STOREFRONT_CONFIG: StorefrontConfig = {
  font_family: "montserrat",
  navigation: { show_home_link: true, show_category_links: true, show_category_filters: true, show_featured_link: true, show_about_link: false, show_contact_link: true, show_whatsapp_cta: true },
  hero: {
    enabled: true,
    mode: "split",
    title: "Escolhas feitas para você.",
    description: "Conheça nossa seleção e fale com a loja pelo WhatsApp.",
    cta_label: "Explorar produtos",
    image_urls: [],
  },
  sections: {
    categories: { enabled: true, title: "Categorias" },
    featured: { enabled: true, title: "Produtos em destaque", layout: "cards" },
    catalog: { enabled: true, title: "Todos os produtos", columns: 4 },
    about: { enabled: false, title: "Sobre a loja", text: "", image_url: null },
    contact: { enabled: true, title: "Fale com a gente" },
  },
  section_order: ["categories", "featured", "catalog", "about", "contact"],
  footer: {
    enabled: true,
    show_logo: true,
    show_categories: true,
    show_contact: true,
    cnpj: "",
    hours: "",
    email: "",
    address: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    youtube: "",
    show_platform_credit: true,
  },
};

export type Tenant = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  whatsapp_number: string | null;
  storefront_template: StorefrontTemplate;
  storefront_config: StorefrontConfig;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type TenantSummary = Pick<Tenant, "id" | "name" | "slug" | "domain" | "logo_url" | "active" | "created_at">;

export type Category = {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string;
  price: number;
  image_url: string | null;
  image_urls: string[];
  availability: ProductAvailability;
  product_condition: ProductCondition;
  stock_quantity: number | null;
  featured: boolean;
  highlights: string[];
  detail_sections: ProductDetailSection[];
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type StorefrontCategory = Pick<Category, "id" | "name" | "slug">;
export type StorefrontProduct = Pick<
  Product,
  | "id"
  | "category_id"
  | "name"
  | "slug"
  | "description"
  | "price"
  | "image_url"
  | "image_urls"
  | "availability"
  | "product_condition"
  | "stock_quantity"
  | "featured"
  | "highlights"
> & { category_name: string | null };

export type StorefrontBrand = Pick<
  Tenant,
  "id" | "name" | "slug" | "domain" | "logo_url" | "storefront_template" | "storefront_config" | "whatsapp_number" | "primary_color" | "secondary_color"
>;

export type PublicStorefront = StorefrontBrand & {
  categories: StorefrontCategory[];
  products: StorefrontProduct[];
  featured_products: StorefrontProduct[];
  total_products: number;
};

export type PublicProductDetail = {
  store: StorefrontBrand;
  product: StorefrontProduct & { tenant_id: string; detail_sections: ProductDetailSection[] };
};

type Defaulted<T, Keys extends keyof T> = Omit<T, Keys> & Partial<Pick<T, Keys>>;

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Defaulted<Profile, "platform_role" | "created_at" | "updated_at">>;
      tenants: Table<Tenant, Defaulted<Tenant, "id" | "logo_url" | "primary_color" | "secondary_color" | "whatsapp_number" | "storefront_template" | "storefront_config" | "active" | "created_at" | "updated_at">>;
      categories: Table<Category, Defaulted<Category, "id" | "created_at" | "updated_at">>;
      products: Table<Product, Defaulted<Product, "id" | "image_url" | "image_urls" | "availability" | "product_condition" | "stock_quantity" | "featured" | "highlights" | "detail_sections" | "active" | "created_at" | "updated_at">>;
      product_daily_metrics: Table<
        { tenant_id: string; product_id: string; metric_date: string; views: number },
        { tenant_id: string; product_id: string; metric_date: string; views?: number }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      get_public_storefront_by_domain: { Args: { p_domain: string }; Returns: Json };
      get_public_storefront_by_slug: { Args: { p_slug: string }; Returns: Json };
      get_public_storefront_by_domain_page: { Args: { p_category_id: string | null; p_domain: string; p_limit: number; p_offset: number; p_availability: string | null }; Returns: Json };
      get_public_storefront_by_slug_page: { Args: { p_category_id: string | null; p_slug: string; p_limit: number; p_offset: number; p_availability: string | null }; Returns: Json };
      get_public_product_by_domain: { Args: { p_domain: string; p_product_slug: string }; Returns: Json };
      get_public_product_by_store_slug: { Args: { p_product_slug: string; p_store_slug: string }; Returns: Json };
      increment_product_view: { Args: { p_product_id: string; p_tenant_id: string }; Returns: undefined };
      get_tenant_product_metrics: { Args: { p_since: string | null; p_tenant_id: string }; Returns: Json };
      get_platform_product_metrics: { Args: { p_since: string | null }; Returns: Json };
      is_platform_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      owns_tenant: { Args: { p_tenant_id: string }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
