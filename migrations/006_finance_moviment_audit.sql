BEGIN;

CREATE TABLE IF NOT EXISTS finance.moviment_logs (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    occurred_at timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
    contract_id integer NOT NULL,
    actor_user_id integer,
    action character(1) NOT NULL CHECK (action IN ('I', 'U', 'D')),
    moviment_id integer NOT NULL,
    transaction_id bigint NOT NULL DEFAULT txid_current(),
    request_id uuid,
    database_user name NOT NULL DEFAULT session_user,
    old_data jsonb,
    new_data jsonb,
    CONSTRAINT moviment_logs_snapshot_chk CHECK (
        (action = 'I' AND old_data IS NULL AND new_data IS NOT NULL)
        OR (action = 'U' AND old_data IS NOT NULL AND new_data IS NOT NULL)
        OR (action = 'D' AND old_data IS NOT NULL AND new_data IS NULL)
    )
);

COMMENT ON TABLE finance.moviment_logs IS
    'Append-only audit trail for every insert, update and delete in finance.moviments.';
COMMENT ON COLUMN finance.moviment_logs.actor_user_id IS
    'Authenticated application user. NULL means the write did not provide application audit context.';
COMMENT ON COLUMN finance.moviment_logs.request_id IS
    'Groups all movement changes made by the same API request.';
COMMENT ON COLUMN finance.moviment_logs.transaction_id IS
    'Groups all movement changes committed by the same PostgreSQL transaction.';

CREATE INDEX IF NOT EXISTS moviment_logs_contract_moviment_idx
    ON finance.moviment_logs (contract_id, moviment_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS moviment_logs_occurred_at_brin
    ON finance.moviment_logs USING brin (occurred_at);

CREATE OR REPLACE FUNCTION finance.audit_moviment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, finance
AS $function$
DECLARE
    actor_setting text := nullif(current_setting('app.user_id', true), '');
    request_setting text := nullif(current_setting('app.request_id', true), '');
    audit_actor_user_id integer;
    audit_request_id uuid;
    audit_contract_id integer;
    audit_moviment_id integer;
BEGIN
    IF TG_OP = 'UPDATE' AND to_jsonb(OLD) = to_jsonb(NEW) THEN
        RETURN NEW;
    END IF;

    IF actor_setting ~ '^[1-9][0-9]*$' THEN
        audit_actor_user_id := actor_setting::integer;
    END IF;

    IF request_setting ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
        audit_request_id := request_setting::uuid;
    END IF;

    audit_contract_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.contract ELSE NEW.contract END;
    audit_moviment_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;

    INSERT INTO finance.moviment_logs (
        contract_id,
        actor_user_id,
        action,
        moviment_id,
        transaction_id,
        request_id,
        database_user,
        old_data,
        new_data
    ) VALUES (
        audit_contract_id,
        audit_actor_user_id,
        substr(TG_OP, 1, 1),
        audit_moviment_id,
        txid_current(),
        audit_request_id,
        session_user,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS audit_moviment_change_trigger ON finance.moviments;
CREATE TRIGGER audit_moviment_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON finance.moviments
FOR EACH ROW
EXECUTE FUNCTION finance.audit_moviment_change();

CREATE OR REPLACE FUNCTION finance.prevent_moviment_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, finance
AS $function$
BEGIN
    RAISE EXCEPTION 'finance.moviment_logs is append-only';
END
$function$;

DROP TRIGGER IF EXISTS prevent_moviment_log_mutation_trigger ON finance.moviment_logs;
CREATE TRIGGER prevent_moviment_log_mutation_trigger
BEFORE UPDATE OR DELETE ON finance.moviment_logs
FOR EACH ROW
EXECUTE FUNCTION finance.prevent_moviment_log_mutation();

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON finance.moviment_logs FROM PUBLIC;

COMMIT;
