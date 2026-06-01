CREATE TABLE public.vetri_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  transcript TEXT,
  summary TEXT,
  takes JSONB NOT NULL DEFAULT '[]'::jsonb,
  positions TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vetri_notes_published_at ON public.vetri_notes (published_at DESC NULLS LAST);

ALTER TABLE public.vetri_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read vetri notes"
ON public.vetri_notes
FOR SELECT
TO authenticated
USING (true);

CREATE TRIGGER vetri_notes_set_updated_at
BEFORE UPDATE ON public.vetri_notes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();