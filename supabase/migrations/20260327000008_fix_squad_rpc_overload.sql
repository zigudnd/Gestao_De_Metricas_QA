-- Remove a versão antiga (2 params) da função create_squad_with_lead
-- que causa ambiguidade no PostgREST quando a nova versão (4 params) coexiste.

drop function if exists public.create_squad_with_lead(text, uuid);
