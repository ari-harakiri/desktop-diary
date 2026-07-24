-- Owner-controlled Guest Book page appearance.

create table if not exists public.dtd_guestbook_settings (
  owner_user_id uuid primary key references auth.users(id) on delete cascade,
  owner_handle text not null unique,
  heading_text text not null default 'Sign My Guest Book',
  page_color text not null default '#ffffff',
  font_key text not null default 'handwritten',
  font_color text not null default '#222222',
  font_size text not null default 'large',
  updated_at timestamptz not null default now(),
  constraint dtd_guestbook_heading_length check (char_length(heading_text) between 1 and 48),
  constraint dtd_guestbook_page_color check (page_color ~ '^#[0-9a-fA-F]{6}$'),
  constraint dtd_guestbook_font_key check (font_key in ('handwritten','serif','sans','typewriter','comic','artsy','minecraft','oldenglish')),
  constraint dtd_guestbook_font_color check (font_color ~ '^#[0-9a-fA-F]{6}$'),
  constraint dtd_guestbook_font_size check (font_size in ('small','medium','large'))
);

alter table public.dtd_guestbook_settings enable row level security;
revoke all on public.dtd_guestbook_settings from anon,authenticated;

create or replace function public.get_dtd_guestbook_settings(requested_handle text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  profile_data jsonb;
  result jsonb;
begin
  profile_data := public.dtd_guestbook_profile_access(requested_handle);
  select jsonb_build_object(
    'heading',coalesce(s.heading_text,'Sign My Guest Book'),
    'page_color',coalesce(s.page_color,'#ffffff'),
    'font_key',coalesce(s.font_key,'handwritten'),
    'font_color',coalesce(s.font_color,'#222222'),
    'font_size',coalesce(s.font_size,'large')
  ) into result
  from public.dtd_profiles p
  left join public.dtd_guestbook_settings s on s.owner_user_id=p.user_id
  where p.handle=lower(trim(requested_handle))
  limit 1;
  return coalesce(result,jsonb_build_object(
    'heading','Sign My Guest Book',
    'page_color','#ffffff',
    'font_key','handwritten',
    'font_color','#222222',
    'font_size','large'
  ));
end;
$$;

create or replace function public.save_dtd_guestbook_settings(
  requested_handle text,
  heading_text text,
  selected_page_color text,
  selected_font_key text,
  selected_font_color text,
  selected_font_size text
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  profile_data jsonb;
  clean_heading text;
begin
  profile_data := public.dtd_guestbook_profile_access(requested_handle);
  if coalesce(profile_data->>'friend_status','') <> 'self' then
    raise exception 'Only the Guest Book owner can customize this page.';
  end if;
  clean_heading:=left(coalesce(nullif(trim(heading_text),''),'Sign My Guest Book'),48);
  insert into public.dtd_guestbook_settings(owner_user_id,owner_handle,heading_text,page_color,font_key,font_color,font_size,updated_at)
  values(auth.uid(),lower(trim(requested_handle)),clean_heading,selected_page_color,selected_font_key,selected_font_color,selected_font_size,now())
  on conflict(owner_user_id) do update set
    owner_handle=excluded.owner_handle,
    heading_text=excluded.heading_text,
    page_color=excluded.page_color,
    font_key=excluded.font_key,
    font_color=excluded.font_color,
    font_size=excluded.font_size,
    updated_at=now();
  return true;
end;
$$;

revoke all on function public.get_dtd_guestbook_settings(text) from public,anon,authenticated;
revoke all on function public.save_dtd_guestbook_settings(text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.get_dtd_guestbook_settings(text) to authenticated;
grant execute on function public.save_dtd_guestbook_settings(text,text,text,text,text,text) to authenticated;
