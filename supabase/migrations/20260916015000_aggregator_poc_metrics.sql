CREATE TABLE IF NOT EXISTS public.aggregator_poc_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  aggregator text NOT NULL,
  operation text NOT NULL,
  provider_code text,
  game_code text,
  device_type text,
  success boolean NOT NULL,
  latency_ms numeric(12,2),
  error_code text,
  environment text NOT NULL DEFAULT 'staging',
  country text,
  CONSTRAINT aggregator_poc_metrics_aggregator_nonempty CHECK (length(trim(aggregator)) > 0),
  CONSTRAINT aggregator_poc_metrics_operation_nonempty CHECK (length(trim(operation)) > 0),
  CONSTRAINT aggregator_poc_metrics_device_valid CHECK (device_type IS NULL OR device_type IN ('mobile','desktop')),
  CONSTRAINT aggregator_poc_metrics_latency_valid CHECK (latency_ms IS NULL OR latency_ms >= 0),
  CONSTRAINT aggregator_poc_metrics_environment_valid CHECK (environment IN ('staging','sandbox','production')),
  CONSTRAINT aggregator_poc_metrics_country_valid CHECK (country IS NULL OR country ~ '^[A-Z]{2}$')
);

CREATE INDEX IF NOT EXISTS idx_aggregator_poc_metrics_created_at
  ON public.aggregator_poc_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aggregator_poc_metrics_grouping
  ON public.aggregator_poc_metrics(aggregator, operation, provider_code, created_at DESC);

ALTER TABLE public.aggregator_poc_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aggregator_poc_metrics_admin_read ON public.aggregator_poc_metrics;
CREATE POLICY aggregator_poc_metrics_admin_read
ON public.aggregator_poc_metrics
FOR SELECT TO authenticated
USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS aggregator_poc_metrics_admin_insert ON public.aggregator_poc_metrics;
CREATE POLICY aggregator_poc_metrics_admin_insert
ON public.aggregator_poc_metrics
FOR INSERT TO authenticated
WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS aggregator_poc_metrics_admin_delete ON public.aggregator_poc_metrics;
CREATE POLICY aggregator_poc_metrics_admin_delete
ON public.aggregator_poc_metrics
FOR DELETE TO authenticated
USING ((SELECT public.is_admin()));

COMMENT ON TABLE public.aggregator_poc_metrics IS
  'No-PII technical benchmark metrics for authorized game-aggregator POCs.';
