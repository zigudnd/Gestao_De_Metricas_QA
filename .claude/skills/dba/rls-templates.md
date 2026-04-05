# Templates de RLS — ToStatos

Padrões prontos por tipo de tabela. Copiar e adaptar o nome da tabela e os campos.

---

## Padrão 1 — Tabela de dados do usuário (user-owned)

Usado em: `app_users`, dados pessoais, preferências.

```sql
-- Habilitar e forçar
ALTER TABLE public.{tabela} ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.{tabela} FORCE ROW LEVEL SECURITY;

-- SELECT: usuário vê só o próprio; admin vê todos
CREATE POLICY "{tabela}_select_own"
  ON public.{tabela} FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "{tabela}_select_admin"
  ON public.{tabela} FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users u
      JOIN public.access_profiles p ON p.id = u.profile_id
      WHERE u.auth_user_id = auth.uid() AND p.is_admin = true
    )
  );

-- INSERT: usuário cria só para si mesmo
CREATE POLICY "{tabela}_insert_own"
  ON public.{tabela} FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

-- UPDATE: usuário edita só o próprio; admin edita todos
CREATE POLICY "{tabela}_update_own"
  ON public.{tabela} FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "{tabela}_update_admin"
  ON public.{tabela} FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users u
      JOIN public.access_profiles p ON p.id = u.profile_id
      WHERE u.auth_user_id = auth.uid() AND p.is_admin = true
    )
  );

-- DELETE: só admin
CREATE POLICY "{tabela}_delete_admin"
  ON public.{tabela} FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users u
      JOIN public.access_profiles p ON p.id = u.profile_id
      WHERE u.auth_user_id = auth.uid() AND p.is_admin = true
    )
  );
```

---

## Padrão 2 — Tabela de referência compartilhada (read-all, write-admin)

Usado em: `access_profiles`, `squads` (ativos), configurações globais.

```sql
ALTER TABLE public.{tabela} ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.{tabela} FORCE ROW LEVEL SECURITY;

-- SELECT: qualquer autenticado lê
CREATE POLICY "{tabela}_select_auth"
  ON public.{tabela} FOR SELECT TO authenticated
  USING (true);

-- Anon NÃO lê (sem policy para anon = bloqueado por padrão com RLS+FORCE)

-- INSERT / UPDATE / DELETE: só admin
CREATE POLICY "{tabela}_write_admin"
  ON public.{tabela} FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users u
      JOIN public.access_profiles p ON p.id = u.profile_id
      WHERE u.auth_user_id = auth.uid() AND p.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users u
      JOIN public.access_profiles p ON p.id = u.profile_id
      WHERE u.auth_user_id = auth.uid() AND p.is_admin = true
    )
  );
```

---

## Padrão 3 — Tabela de membros (N:N com squad)

Usado em: `squad_members`.

```sql
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_members FORCE ROW LEVEL SECURITY;

-- SELECT: membro vê squads onde está; admin vê todos
CREATE POLICY "squad_members_select_own"
  ON public.squad_members FOR SELECT TO authenticated
  USING (user_id = (
    SELECT id FROM public.app_users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "squad_members_select_admin"
  ON public.squad_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users u
      JOIN public.access_profiles p ON p.id = u.profile_id
      WHERE u.auth_user_id = auth.uid() AND p.is_admin = true
    )
  );

-- Escrita: só admin ou QA Lead com permissão manage_squads
CREATE POLICY "squad_members_write_privileged"
  ON public.squad_members FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users u
      JOIN public.access_profiles p ON p.id = u.profile_id
      WHERE u.auth_user_id = auth.uid()
        AND (
          p.is_admin = true
          OR (p.permissions->>'manage_squads')::boolean = true
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users u
      JOIN public.access_profiles p ON p.id = u.profile_id
      WHERE u.auth_user_id = auth.uid()
        AND (
          p.is_admin = true
          OR (p.permissions->>'manage_squads')::boolean = true
        )
    )
  );
```

---

## Padrão 4 — Tabela de vínculo sprint↔squad (sprint_squads)

```sql
ALTER TABLE public.sprint_squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprint_squads FORCE ROW LEVEL SECURITY;

-- SELECT: usuário vê vínculos dos squads onde é membro; admin vê todos
CREATE POLICY "sprint_squads_select_member"
  ON public.sprint_squads FOR SELECT TO authenticated
  USING (
    squad_id IN (
      SELECT sm.squad_id
      FROM public.squad_members sm
      JOIN public.app_users u ON u.id = sm.user_id
      WHERE u.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.app_users u
      JOIN public.access_profiles p ON p.id = u.profile_id
      WHERE u.auth_user_id = auth.uid()
        AND (p.is_admin = true OR (p.permissions->>'view_all_squads')::boolean = true)
    )
  );

-- Escrita: admin ou quem tem manage_squads
CREATE POLICY "sprint_squads_write_privileged"
  ON public.sprint_squads FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users u
      JOIN public.access_profiles p ON p.id = u.profile_id
      WHERE u.auth_user_id = auth.uid()
        AND (
          p.is_admin = true
          OR (p.permissions->>'manage_squads')::boolean = true
        )
    )
  );
```

---

## Verificações pós-implementação

Sempre executar após criar ou modificar policies:

```sql
-- 1. Confirmar RLS habilitada em todas as tabelas
SELECT
  t.tablename,
  c.relrowsecurity    AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public'
ORDER BY t.tablename;
-- Resultado esperado: rls_enabled = true, rls_forced = true em toda tabela sensível

-- 2. Listar todas as policies da tabela recém-configurada
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = '{tabela}';

-- 3. Teste adversário — simular usuário comum lendo dados alheios
-- (executar como service_role e verificar com SET ROLE)
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "{uuid_de_outro_usuario}"}';
SELECT COUNT(*) FROM public.{tabela};
-- Esperado: 0 linhas para dados que não pertencem ao usuário simulado
RESET ROLE;
```

---

## Anti-padrões a evitar

```sql
-- ❌ NUNCA — policy permissiva em tabela sensível
CREATE POLICY "allow_all" ON app_users USING (true);

-- ❌ NUNCA — RLS habilitada mas sem nenhuma policy (bloqueia todos, incluso admin)
ALTER TABLE nova_tabela ENABLE ROW LEVEL SECURITY;
-- sem criar nenhuma policy → ninguém acessa, nem service_role com FORCE

-- ❌ NUNCA — policy que expõe auth.users diretamente sem app_users
CREATE POLICY "bad" ON dados FOR SELECT
  USING (user_id = auth.uid()); -- ok se user_id for auth_user_id, mas confuso

-- ✅ SEMPRE — referenciar app_users para consistência
CREATE POLICY "good" ON dados FOR SELECT
  USING (
    user_id = (SELECT id FROM app_users WHERE auth_user_id = auth.uid())
  );
```
