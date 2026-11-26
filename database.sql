-- Officina di Casa - schema Supabase. Eseguire nell'SQL Editor di un progetto NUOVO.
create sequence wo_seq; create sequence po_seq;

create table profiles(id uuid primary key references auth.users on delete cascade, email text, first_name text, last_name text,
  role text not null default 'titolare' check(role in('admin','titolare')), avatar_url text,
  created_at timestamptz default now(), updated_at timestamptz default now());

-- Unico punto in cui si decide chi può accedere. Per differenziare i ruoli: cambiare le policy usando profiles.role.
create function is_staff() returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from profiles where id=auth.uid() and role in('admin','titolare')) $$;

create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,email,first_name,last_name,role) values(new.id,new.email,new.raw_user_meta_data->>'first_name',
  new.raw_user_meta_data->>'last_name',coalesce(new.raw_user_meta_data->>'role','titolare')); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create table customers(id uuid primary key default gen_random_uuid(), first_name text, last_name text not null, phone text, email text,
  address text, contact_pref text, notes text, archived_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid references profiles, updated_by uuid references profiles);

create table assets(id uuid primary key default gen_random_uuid(), customer_id uuid not null references customers on delete restrict,
  type text not null check(type in('motociclo','motosega','decespugliatore','tagliasiepi','soffiatore','rasaerba','generatore','altro')),
  brand text, model text, serial_number text, plate text, frame_number text, year int check(year between 1900 and 2100), color text,
  displacement_cc numeric check(displacement_cc>=0), mileage_km int check(mileage_km>=0), hours_used numeric check(hours_used>=0),
  fuel text, engine_model text, accessories text, inspection_notes text, purchase_date date, notes text,
  status text not null default 'attivo' check(status in('attivo','archiviato')), archived_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now(), created_by uuid references profiles, updated_by uuid references profiles,
  unique(id,customer_id));
create unique index assets_plate_uq on assets(upper(plate)) where plate is not null;
create index on assets(customer_id); create index on assets(serial_number);

create table work_orders(id uuid primary key default gen_random_uuid(),
  number text unique not null default 'OL-'||lpad(nextval('wo_seq')::text,5,'0'),
  customer_id uuid not null, asset_id uuid not null,
  category text, reported_problem text not null, diagnosis text, work_done text, notes text,
  status text not null default 'da verificare' check(status in('da verificare','accettato','in diagnosi','in attesa','in attesa di ricambi','in lavorazione','pronto','consegnato','annullato')),
  priority text not null default 'normale' check(priority in('bassa','normale','alta','urgente')),
  opened_at timestamptz not null default now(), due_date date, closed_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now(), created_by uuid references profiles, updated_by uuid references profiles,
  foreign key(asset_id,customer_id) references assets(id,customer_id)); -- il mezzo deve appartenere al cliente
create index on work_orders(status); create index on work_orders(customer_id);

create table work_order_events(id uuid primary key default gen_random_uuid(), work_order_id uuid not null references work_orders on delete cascade,
  event text not null check(event in('ordine creato','mezzo ricevuto','diagnosi iniziata','diagnosi completata','ricambio richiesto','ricambio ricevuto','lavorazione iniziata','lavorazione completata','pronto','consegnato')),
  notes text, created_at timestamptz default now(), created_by uuid default auth.uid());

create table appointments(id uuid primary key default gen_random_uuid(), starts_at timestamptz not null, duration_min int not null default 60 check(duration_min>0),
  customer_id uuid references customers, asset_id uuid references assets, work_order_id uuid references work_orders, reason text,
  status text not null default 'prenotato' check(status in('prenotato','confermato','arrivato','in lavorazione','completato','annullato','da ricontattare')),
  notes text, reminder_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid references profiles, updated_by uuid references profiles);
create index on appointments(starts_at);

create table parts(id uuid primary key default gen_random_uuid(), code text unique not null, oem_code text, aftermarket_code text,
  description text not null, category text, brand text, supplier text, location text, notes text,
  qty_on_hand numeric not null default 0 check(qty_on_hand>=0), qty_min numeric not null default 0 check(qty_min>=0),
  qty_reserved numeric not null default 0 check(qty_reserved>=0), qty_ordered numeric not null default 0 check(qty_ordered>=0),
  archived_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid references profiles, updated_by uuid references profiles);
create index on parts(oem_code); create index on parts(aftermarket_code);

create table part_compatibilities(id uuid primary key default gen_random_uuid(), part_id uuid not null references parts on delete cascade,
  brand text, model text, category text, year_from int, year_to int, displacement_cc numeric, engine_code text, notes text,
  status text not null default 'da controllare' check(status in('verificata','da controllare')), created_at timestamptz default now());

create table purchase_orders(id uuid primary key default gen_random_uuid(),
  number text unique not null default 'OA-'||lpad(nextval('po_seq')::text,5,'0'), supplier text not null, expected_date date,
  status text not null default 'bozza' check(status in('bozza','da inviare','ordinato','parzialmente ricevuto','ricevuto','annullato')),
  work_order_id uuid references work_orders, notes text, created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid references profiles, updated_by uuid references profiles);

create table purchase_order_items(id uuid primary key default gen_random_uuid(), purchase_order_id uuid not null references purchase_orders on delete cascade,
  part_id uuid not null references parts, qty_ordered numeric not null check(qty_ordered>0), qty_received numeric not null default 0,
  check(qty_received>=0 and qty_received<=qty_ordered), created_at timestamptz default now());

-- quantity: sempre >=0 per carico/scarico/trasferimento; per 'rettifica' è la differenza con segno (+/-)
create table inventory_movements(id uuid primary key default gen_random_uuid(), part_id uuid not null references parts,
  kind text not null check(kind in('carico','scarico','rettifica','trasferimento')), quantity numeric not null check(kind='rettifica' or quantity>=0),
  location_to text, work_order_id uuid references work_orders, purchase_order_id uuid references purchase_orders, notes text,
  created_at timestamptz default now(), created_by uuid default auth.uid());
create index on inventory_movements(part_id);

create table attachments(id uuid primary key default gen_random_uuid(), bucket text not null default 'workshop-files', storage_path text unique not null,
  original_name text not null, internal_name text, mime_type text, size_bytes bigint, category text, description text,
  customer_id uuid references customers on delete cascade, asset_id uuid references assets on delete cascade,
  work_order_id uuid references work_orders on delete cascade, part_id uuid references parts on delete cascade,
  created_at timestamptz default now(), uploaded_by uuid default auth.uid());

create table activity_log(id uuid primary key default gen_random_uuid(), table_name text, record_id uuid, action text, details jsonb,
  changed_by uuid default auth.uid(), created_at timestamptz default now());
create index on activity_log(created_at desc);

-- Trigger ------------------------------------------------------------------
create function set_audit() returns trigger language plpgsql as $$
begin new.updated_at=now(); new.updated_by=auth.uid(); if tg_op='INSERT' then new.created_by=auth.uid(); end if; return new; end $$;

create function log_activity() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into activity_log(table_name,record_id,action,details)
  values(tg_table_name, case when tg_op='DELETE' then old.id else new.id end, tg_op, to_jsonb(case when tg_op='DELETE' then old else new end)); return null; end $$;

create function apply_movement() returns trigger language plpgsql as $$
begin update parts set qty_on_hand=qty_on_hand+case new.kind when 'scarico' then -new.quantity when 'trasferimento' then 0 else new.quantity end,
  location=case when new.kind='trasferimento' then coalesce(new.location_to,location) else location end where id=new.part_id; return new; end $$;
create trigger movement_apply after insert on inventory_movements for each row execute function apply_movement();

-- Ricezione ordine di acquisto: ogni aumento di qty_received genera un 'carico' e aggiorna lo stato dell'ordine.
create function receive_item() returns trigger language plpgsql as $$
begin if new.qty_received>old.qty_received then
    insert into inventory_movements(part_id,kind,quantity,purchase_order_id,notes)
    values(new.part_id,'carico',new.qty_received-old.qty_received,new.purchase_order_id,'Ricezione ordine di acquisto');
    update purchase_orders set status=case when not exists(select 1 from purchase_order_items where purchase_order_id=new.purchase_order_id and qty_received<qty_ordered)
      then 'ricevuto' else 'parzialmente ricevuto' end where id=new.purchase_order_id;
  end if; return new; end $$;
create trigger item_receive after update of qty_received on purchase_order_items for each row execute function receive_item();

do $$ declare t text; begin
  foreach t in array array['customers','assets','work_orders','appointments','parts','purchase_orders'] loop
    execute format('create trigger audit_%1$s before insert or update on %1$I for each row execute function set_audit()',t); end loop;
  foreach t in array array['customers','assets','work_orders','work_order_events','appointments','parts','part_compatibilities','purchase_orders','purchase_order_items','inventory_movements','attachments'] loop
    execute format('create trigger log_%1$s after insert or update or delete on %1$I for each row execute function log_activity()',t);
    execute format('alter table %I enable row level security',t);
    -- Admin e titolare: stesse autorizzazioni (leggere, creare, modificare, eliminare). Nessun accesso anonimo.
    execute format('create policy staff_all on %I for all to authenticated using (is_staff()) with check (is_staff())',t); end loop;
end $$;

-- profiles: lettura per lo staff; ciascuno modifica solo il proprio profilo (il ruolo si cambia dal Dashboard).
alter table profiles enable row level security;
create policy profiles_read on profiles for select to authenticated using (is_staff());
create policy profiles_own on profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid() and role=(select role from profiles where id=auth.uid()));
-- activity_log: solo lettura (scritto dai trigger, non modificabile dagli utenti).
alter table activity_log enable row level security;
create policy log_read on activity_log for select to authenticated using (is_staff());

-- Storage privato: accesso solo con URL firmati.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('workshop-files','workshop-files',false,10485760,array['image/jpeg','image/png','image/webp','image/heic','application/pdf']) on conflict(id) do nothing;
create policy workshop_files on storage.objects for all to authenticated
  using (bucket_id='workshop-files' and is_staff()) with check (bucket_id='workshop-files' and is_staff());
