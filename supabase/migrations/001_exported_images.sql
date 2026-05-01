-- Enable uuid extension if not already enabled
create extension if not exists "uuid-ossp";

-- exported_images table: stores exported measurement sheets with inventory metadata
create table if not exists exported_images (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamp default now(),
  user_email      text not null,
  image_url       text,
  brand           text,
  clothing_type   text,
  condition       text,
  tagged_size     text,
  flaws           text,
  measurements    jsonb,
  suggested_price numeric,
  listing_price   numeric,
  sold_price      numeric,
  sold_date       timestamp
);

create index if not exists exported_images_user_email_idx on exported_images(user_email);
create index if not exists exported_images_created_at_idx on exported_images(created_at desc);

-- Storage bucket setup (run in Supabase dashboard or via storage API):
-- 1. Create bucket named "exported-images" with public access enabled
-- 2. Add RLS policy allowing service role to insert/select
