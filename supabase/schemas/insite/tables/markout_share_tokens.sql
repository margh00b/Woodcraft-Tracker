CREATE TABLE insite.markout_share_tokens (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  markout_id bigint NOT NULL UNIQUE
    REFERENCES insite.markouts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  recipient_email text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT markout_share_tokens_hash_check
    CHECK (token_hash ~ '^[a-f0-9]{64}$')
);

ALTER TABLE insite.markout_share_tokens
  ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON insite.markout_share_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

REVOKE ALL ON TABLE insite.markout_share_tokens
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE
  ON TABLE insite.markout_share_tokens
  TO service_role;

GRANT USAGE, SELECT
  ON SEQUENCE insite.markout_share_tokens_id_seq
  TO service_role;