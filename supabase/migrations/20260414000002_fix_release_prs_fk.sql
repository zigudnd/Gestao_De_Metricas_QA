-- SEC-007: Add FK constraint for release_prs.release_id → releases.id
-- release_prs.release_id is TEXT with no FK, allowing orphan data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_release_prs_release' AND table_name = 'release_prs'
  ) THEN
    ALTER TABLE public.release_prs
      ADD CONSTRAINT fk_release_prs_release
      FOREIGN KEY (release_id) REFERENCES public.releases(id) ON DELETE CASCADE;
  END IF;
END $$;

-- SEC-008: Update releases status CHECK to include all 13 valid statuses
ALTER TABLE public.releases DROP CONSTRAINT IF EXISTS chk_releases_status;
ALTER TABLE public.releases ADD CONSTRAINT chk_releases_status CHECK (
  status IN (
    'planejada','em_desenvolvimento','corte','em_homologacao','em_regressivo',
    'em_qa','aguardando_aprovacao','aprovada','em_producao','concluida',
    'uniu_escopo','rollback','cancelada'
  )
);
