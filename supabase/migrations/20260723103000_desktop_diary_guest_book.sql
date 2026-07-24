-- DesktopDiary profile Guest Book.
-- Apply in the Supabase SQL editor before publishing the matching website build.

create table if not exists public.dtd_guestbook_signings (
  signing_id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  owner_handle text not null,
  signer_user_id uuid not null references auth.users(id) on delete cascade,
  signer_handle text not null,
  signer_display_name text not null default '',
  message_text text not null default '',
  sticker_source text not null default '',
  sticker_upload text not null default '',
  sticker_shape text not null default '',
  sticker_size text not null default 'medium',
  sticker_x numeric(6,3) not null default 50,
  sticker_y numeric(6,3) not null default 50,
  sticker_rotation numeric(7,3) not null default 0,
  gift_choice text not null default '',
  page_no integer not null default 1,
  created_at timestamptz not null default now(),
  signing_day date generated always as ((created_at at time zone 'utc')::date) stored,
  constraint dtd_guestbook_note_length check (char_length(message_text) between 1 and 180),
  constraint dtd_guestbook_source check (
    (sticker_source ~ '^stickers/s[0-9]+[.]png$' and sticker_upload = '')
    or
    (sticker_source = '' and sticker_upload ~ '^data:image/(webp|png|jpeg);base64,' and char_length(sticker_upload) <= 320000)
  ),
  constraint dtd_guestbook_shape check (sticker_shape in ('','circle','square')),
  constraint dtd_guestbook_size check (sticker_size in ('small','medium','large')),
  constraint dtd_guestbook_x check (sticker_x between 4 and 96),
  constraint dtd_guestbook_y check (sticker_y between 6 and 94),
  constraint dtd_guestbook_rotation check (sticker_rotation between -180 and 180),
  constraint dtd_guestbook_gift check (gift_choice in ('','flower','treat','mystery')),
  constraint dtd_guestbook_page check (page_no between 1 and 10000),
  constraint dtd_guestbook_one_visit_daily unique (owner_user_id, signer_user_id, signing_day)
);

create index if not exists dtd_guestbook_owner_page_idx
  on public.dtd_guestbook_signings(owner_user_id,page_no,created_at);

alter table public.dtd_guestbook_signings enable row level security;
revoke all on public.dtd_guestbook_signings from anon,authenticated;

create or replace function public.dtd_guestbook_profile_access(target_handle text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  profile_data jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to open this Guest Book.'; end if;
  select public.get_dtd_public_profile(lower(trim(target_handle)))::jsonb into profile_data;
  if profile_data is null then raise exception 'This profile is unavailable.'; end if;
  if coalesce(profile_data->>'friend_status','') not in ('friends','self') then
    raise exception 'Only E-Buddies can open this Guest Book.';
  end if;
  return profile_data;
end;
$$;

revoke all on function public.dtd_guestbook_profile_access(text) from public,anon,authenticated;

create or replace function public.get_dtd_guestbook(requested_handle text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  profile_data jsonb;
  owner_id uuid;
  result jsonb;
begin
  profile_data := public.dtd_guestbook_profile_access(requested_handle);
  select user_id into owner_id from public.dtd_profiles where handle=lower(trim(requested_handle)) limit 1;
  select coalesce(jsonb_agg(jsonb_build_object(
    'signing_id',s.signing_id,
    'signer_handle',s.signer_handle,
    'signer_display_name',s.signer_display_name,
    'message_text',s.message_text,
    'sticker_source',s.sticker_source,
    'sticker_upload',s.sticker_upload,
    'sticker_shape',s.sticker_shape,
    'sticker_size',s.sticker_size,
    'sticker_x',s.sticker_x,
    'sticker_y',s.sticker_y,
    'sticker_rotation',s.sticker_rotation,
    'gift_choice',s.gift_choice,
    'page_no',s.page_no,
    'created_at',s.created_at
  ) order by s.page_no,s.created_at),'[]'::jsonb)
  into result
  from public.dtd_guestbook_signings s
  where s.owner_user_id=owner_id;
  return result;
end;
$$;

revoke all on function public.get_dtd_guestbook(text) from public,anon,authenticated;

create or replace function public.sign_dtd_guestbook(
  requested_owner_handle text,
  note_text text,
  selected_sticker_source text,
  uploaded_sticker_data text,
  uploaded_sticker_shape text,
  selected_sticker_size text,
  sticker_x_percent numeric,
  sticker_y_percent numeric,
  sticker_rotation_degrees numeric,
  selected_gift text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  profile_data jsonb;
  owner_id uuid;
  signer_profile public.dtd_profiles%rowtype;
  current_page integer;
  current_count integer;
  new_id uuid;
begin
  profile_data := public.dtd_guestbook_profile_access(requested_owner_handle);
  select user_id into owner_id from public.dtd_profiles where handle=lower(trim(requested_owner_handle)) limit 1;
  select * into signer_profile from public.dtd_profiles where user_id=auth.uid() limit 1;
  if signer_profile.user_id is null then raise exception 'Reserve your DesktopDiary address before signing.'; end if;
  if owner_id=auth.uid() then raise exception 'Ask an E-Buddy to sign your Guest Book!'; end if;

  select coalesce(max(page_no),1) into current_page from public.dtd_guestbook_signings where owner_user_id=owner_id;
  select count(*) into current_count from public.dtd_guestbook_signings where owner_user_id=owner_id and page_no=current_page;
  if current_count>=16 then current_page:=current_page+1; end if;

  insert into public.dtd_guestbook_signings(
    owner_user_id,owner_handle,signer_user_id,signer_handle,signer_display_name,message_text,
    sticker_source,sticker_upload,sticker_shape,sticker_size,sticker_x,sticker_y,sticker_rotation,gift_choice,page_no
  ) values (
    owner_id,lower(trim(requested_owner_handle)),auth.uid(),signer_profile.handle,coalesce(nullif(signer_profile.display_name,''),signer_profile.handle),
    left(coalesce(nullif(trim(note_text),''),coalesce(nullif(signer_profile.display_name,''),signer_profile.handle)||' was here!'),180),
    coalesce(selected_sticker_source,''),coalesce(uploaded_sticker_data,''),coalesce(uploaded_sticker_shape,''),
    coalesce(selected_sticker_size,'medium'),sticker_x_percent,sticker_y_percent,sticker_rotation_degrees,coalesce(selected_gift,''),current_page
  )
  returning signing_id into new_id;
  return new_id;
exception
  when unique_violation then raise exception 'You already signed this Guest Book today. Come back tomorrow!';
end;
$$;

revoke all on function public.sign_dtd_guestbook(text,text,text,text,text,text,numeric,numeric,numeric,text) from public,anon,authenticated;

create or replace function public.remove_dtd_guestbook_signing(signing_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  removed integer;
begin
  delete from public.dtd_guestbook_signings
  where dtd_guestbook_signings.signing_id=$1
    and (owner_user_id=auth.uid() or signer_user_id=auth.uid());
  get diagnostics removed=row_count;
  return removed>0;
end;
$$;

revoke all on function public.remove_dtd_guestbook_signing(uuid) from public,anon,authenticated;

grant execute on function public.get_dtd_guestbook(text) to authenticated;
grant execute on function public.sign_dtd_guestbook(text,text,text,text,text,text,numeric,numeric,numeric,text) to authenticated;
grant execute on function public.remove_dtd_guestbook_signing(uuid) to authenticated;
