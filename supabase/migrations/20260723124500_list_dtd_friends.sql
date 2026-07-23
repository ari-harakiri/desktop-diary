-- Give DesktopDiary one authoritative, privacy-safe list of accepted E-Buddies.
-- The browser uses this to rebuild its local E-Buddies cache after a refresh,
-- account switch, cleared browser data, or acceptance on another device.

create or replace function public.list_dtd_friends()
returns table (
  handle text,
  display_name text,
  profile_picture text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    profile.handle::text,
    coalesce(profile.display_name,'')::text,
    coalesce(profile.profile_picture,'')::text
  from public.dtd_friend_requests friend_request
  join public.dtd_profiles profile
    on profile.user_id = case
      when friend_request.requester_id = auth.uid() then friend_request.recipient_id
      else friend_request.requester_id
    end
  where auth.uid() is not null
    and friend_request.status = 'accepted'
    and auth.uid() in (friend_request.requester_id,friend_request.recipient_id)
  order by lower(coalesce(profile.display_name,profile.handle)),profile.handle;
$$;

revoke all on function public.list_dtd_friends() from public,anon,authenticated;
grant execute on function public.list_dtd_friends() to authenticated;
