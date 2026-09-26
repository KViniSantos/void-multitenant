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
  active: boolean;
  created_at: string;
  updated_at: string;
};

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
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type StorefrontCategory = Pick<Category, "id" | "name" | "slug">;
export type StorefrontProduct = Pick<
  Product,
  "id" | "category_id" | "name" | "slug" | "description" | "price" | "image_url"
> & { category_name: string | null };
export type PublicStorefront = Pick<
  Tenant,
  "id" | "name" | "slug" | "domain" | "logo_url" | "primary_color" | "secondary_color" | "whatsapp_number"
> & { categories: StorefrontCategory[]; products: StorefrontProduct[] };

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Pick<Profile, "id" | "email"> & Partial<Pick<Profile, "platform_role">>>;
      tenants: Table<Tenant, Omit<Tenant, "id" | "created_at" | "updated_at"> & Partial<Pick<Tenant, "id" | "created_at" | "updated_at">>>;
      categories: Table<Category, Omit<Category, "id" | "created_at" | "updated_at"> & Partial<Pick<Category, "id" | "created_at" | "updated_at">>>;
      products: Table<Product, Omit<Product, "id" | "created_at" | "updated_at"> & Partial<Pick<Product, "id" | "created_at" | "updated_at">>>;
    };
    Views: Record<string, never>;
    Functions: {
      get_public_storefront_by_domain: { Args: { p_domain: string }; Returns: Json };
      get_public_storefront_by_slug: { Args: { p_slug: string }; Returns: Json };
      is_platform_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      owns_tenant: { Args: { p_tenant_id: string }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
