-- ── Coluna archived nos squads ────────────────────────────────────────────────
ALTER TABLE public.squads ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

-- Squads arquivados: somente membros do squad + admin podem ver
CREATE POLICY "squad_archived_visibility" ON public.squads
  FOR SELECT USING (
    NOT archived
    OR public.is_global_admin()
    OR id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid())
  );

-- ── Seed de dados iniciais (perfis padrao) ───────────────────────────────────
-- Os perfis de sistema já são criados na migration 000006.
-- Esta migration garante que os dados existam se alguém rodar do zero.

-- Garantir que o squad QualityBeta exista
INSERT INTO public.squads (id, name, description, color, created_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'QualityBeta',
  'Squad padrao para onboarding e dados iniciais',
  '#185FA5',
  now()
)
ON CONFLICT (id) DO NOTHING;
