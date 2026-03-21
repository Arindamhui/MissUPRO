alter table if exists users
  add column if not exists vip_type text,
  add column if not exists vip_expiry timestamp;

create index if not exists users_vip_expiry_idx on users (vip_expiry);

alter table if exists gifts
  add column if not exists deleted_at timestamp;

create index if not exists gifts_deleted_at_idx on gifts (deleted_at);

alter table if exists vip_tiers
  add column if not exists deleted_at timestamp;

create index if not exists vip_tiers_deleted_at_idx on vip_tiers (deleted_at);