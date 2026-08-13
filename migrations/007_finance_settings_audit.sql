BEGIN;

DROP TRIGGER IF EXISTS prevent_moviment_log_mutation_trigger ON finance.moviment_logs;

ALTER TABLE finance.moviment_logs
    ADD COLUMN IF NOT EXISTS entity_type varchar(40),
    ADD COLUMN IF NOT EXISTS record_id bigint;

UPDATE finance.moviment_logs
   SET entity_type = coalesce(entity_type, 'movement'),
       record_id = coalesce(record_id, moviment_id)
 WHERE entity_type IS NULL
    OR record_id IS NULL;

ALTER TABLE finance.moviment_logs
    ALTER COLUMN entity_type SET DEFAULT 'movement',
    ALTER COLUMN entity_type SET NOT NULL,
    ALTER COLUMN record_id SET NOT NULL,
    ALTER COLUMN moviment_id DROP NOT NULL;

ALTER TABLE finance.moviment_logs
    DROP CONSTRAINT IF EXISTS moviment_logs_entity_chk;
ALTER TABLE finance.moviment_logs
    ADD CONSTRAINT moviment_logs_entity_chk CHECK (
        entity_type IN (
            'movement',
            'account',
            'category',
            'status',
            'credit_card_settings',
            'notification_settings',
            'contract_settings'
        )
    );

COMMENT ON COLUMN finance.moviment_logs.entity_type IS
    'Audited entity: movement, account, category, status or contract setting section.';
COMMENT ON COLUMN finance.moviment_logs.record_id IS
    'Primary identifier of the audited entity. For contract settings this is the contract id.';
COMMENT ON COLUMN finance.moviment_logs.moviment_id IS
    'Legacy convenience column populated only for movement audit rows.';

CREATE INDEX IF NOT EXISTS moviment_logs_contract_entity_record_idx
    ON finance.moviment_logs (contract_id, entity_type, record_id, occurred_at DESC);

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
        contract_id, actor_user_id, action, moviment_id, entity_type, record_id,
        transaction_id, request_id, database_user, old_data, new_data
    ) VALUES (
        audit_contract_id,
        audit_actor_user_id,
        substr(TG_OP, 1, 1),
        audit_moviment_id,
        'movement',
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

CREATE OR REPLACE FUNCTION finance.audit_settings_entity_change()
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
    audit_record_id bigint;
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
    audit_record_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;

    -- Global defaults have no contract owner and are not changed from the authenticated settings UI.
    IF audit_contract_id IS NULL THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;

        RETURN NEW;
    END IF;

    INSERT INTO finance.moviment_logs (
        contract_id, actor_user_id, action, moviment_id, entity_type, record_id,
        transaction_id, request_id, database_user, old_data, new_data
    ) VALUES (
        audit_contract_id,
        audit_actor_user_id,
        substr(TG_OP, 1, 1),
        NULL,
        TG_ARGV[0],
        audit_record_id,
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

DROP TRIGGER IF EXISTS audit_moviment_account_change_trigger ON finance.moviment_accounts;
CREATE TRIGGER audit_moviment_account_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON finance.moviment_accounts
FOR EACH ROW EXECUTE FUNCTION finance.audit_settings_entity_change('account');

DROP TRIGGER IF EXISTS audit_ledger_account_change_trigger ON finance.ledger_accounts;
CREATE TRIGGER audit_ledger_account_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON finance.ledger_accounts
FOR EACH ROW EXECUTE FUNCTION finance.audit_settings_entity_change('category');

DROP TRIGGER IF EXISTS audit_status_change_trigger ON finance.status;
CREATE TRIGGER audit_status_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON finance.status
FOR EACH ROW EXECUTE FUNCTION finance.audit_settings_entity_change('status');

CREATE OR REPLACE FUNCTION finance.audit_contract_settings_change()
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
    old_setup jsonb := coalesce(OLD.onboarding_setup, '{}'::jsonb);
    new_setup jsonb := coalesce(NEW.onboarding_setup, '{}'::jsonb);
    setting_key text;
    audit_entity_type text;
BEGIN
    IF old_setup = new_setup THEN
        RETURN NEW;
    END IF;

    IF actor_setting ~ '^[1-9][0-9]*$' THEN
        audit_actor_user_id := actor_setting::integer;
    END IF;

    IF request_setting ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
        audit_request_id := request_setting::uuid;
    END IF;

    FOREACH setting_key IN ARRAY ARRAY['creditBillSettings', 'notificationSettings']
    LOOP
        IF (old_setup -> setting_key) IS DISTINCT FROM (new_setup -> setting_key) THEN
            audit_entity_type := CASE setting_key
                WHEN 'creditBillSettings' THEN 'credit_card_settings'
                WHEN 'notificationSettings' THEN 'notification_settings'
            END;

            INSERT INTO finance.moviment_logs (
                contract_id, actor_user_id, action, moviment_id, entity_type, record_id,
                transaction_id, request_id, database_user, old_data, new_data
            ) VALUES (
                NEW.id,
                audit_actor_user_id,
                'U',
                NULL,
                audit_entity_type,
                NEW.id,
                txid_current(),
                audit_request_id,
                session_user,
                coalesce(old_setup -> setting_key, 'null'::jsonb),
                coalesce(new_setup -> setting_key, 'null'::jsonb)
            );
        END IF;
    END LOOP;

    -- Preserve other contract-level settings without duplicating card/notification payloads.
    IF (old_setup - 'creditBillSettings' - 'notificationSettings')
        IS DISTINCT FROM
       (new_setup - 'creditBillSettings' - 'notificationSettings') THEN
        INSERT INTO finance.moviment_logs (
            contract_id, actor_user_id, action, moviment_id, entity_type, record_id,
            transaction_id, request_id, database_user, old_data, new_data
        ) VALUES (
            NEW.id, audit_actor_user_id, 'U', NULL, 'contract_settings', NEW.id,
            txid_current(), audit_request_id, session_user,
            old_setup - 'creditBillSettings' - 'notificationSettings',
            new_setup - 'creditBillSettings' - 'notificationSettings'
        );
    END IF;

    RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS audit_contract_settings_change_trigger ON finance.contracts;
CREATE TRIGGER audit_contract_settings_change_trigger
AFTER UPDATE OF onboarding_setup ON finance.contracts
FOR EACH ROW EXECUTE FUNCTION finance.audit_contract_settings_change();

CREATE TRIGGER prevent_moviment_log_mutation_trigger
BEFORE UPDATE OR DELETE ON finance.moviment_logs
FOR EACH ROW
EXECUTE FUNCTION finance.prevent_moviment_log_mutation();

COMMIT;
