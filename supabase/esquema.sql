-- PasaLista: estructura de la nube. Pégalo entero en Supabase → SQL Editor → Run.
-- Guarda cada dato de la app como un "documento" (tabla + clave + contenido JSON).
-- Así, si añadimos campos nuevos en la app, no hay que tocar la base de datos.

create table if not exists public.docs (
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  tabla       text        not null,                 -- grupos, participantes, asistencias...
  clave       text        not null,                 -- identificador del dato
  datos       jsonb,                                -- contenido (null si está borrado)
  borrado     boolean     not null default false,   -- "tumba": avisa a los demás dispositivos de un borrado
  actualizado timestamptz not null default now(),   -- lo pone el servidor
  primary key (user_id, tabla, clave)
);

create index if not exists docs_por_fecha on public.docs (user_id, actualizado);

-- Seguridad: cada cuenta solo puede ver y tocar sus propias filas.
alter table public.docs enable row level security;

drop policy if exists "solo lo mio" on public.docs;
create policy "solo lo mio" on public.docs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- La fecha de cambio la pone siempre el servidor (así el "último cambio" es fiable).
create or replace function public.docs_sello() returns trigger
language plpgsql as $$
begin
  new.actualizado = clock_timestamp();
  return new;
end $$;

drop trigger if exists docs_sello on public.docs;
create trigger docs_sello before insert or update on public.docs
  for each row execute function public.docs_sello();

-- Aviso en directo a los otros dispositivos cuando algo cambia.
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null;
end $$;
