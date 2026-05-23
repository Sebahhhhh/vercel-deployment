
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke execute on function public.assign_bracket_slot() from public, anon, authenticated;
revoke execute on function public.maybe_create_matches() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
