BEGIN;

DROP TRIGGER IF EXISTS audit_moviment_change_trigger ON finance.moviments;
DROP TRIGGER IF EXISTS audit_moviment_account_change_trigger ON finance.moviment_accounts;
DROP TRIGGER IF EXISTS audit_ledger_account_change_trigger ON finance.ledger_accounts;
DROP TRIGGER IF EXISTS audit_status_change_trigger ON finance.status;
DROP TRIGGER IF EXISTS audit_contract_settings_change_trigger ON finance.contracts;

DROP FUNCTION IF EXISTS finance.audit_moviment_change();
DROP FUNCTION IF EXISTS finance.audit_settings_entity_change();
DROP FUNCTION IF EXISTS finance.audit_contract_settings_change();

DROP INDEX IF EXISTS finance.moviment_logs_contract_moviment_idx;

ALTER TABLE finance.moviment_logs
    DROP COLUMN IF EXISTS moviment_id;

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

    INSERT INTO finance.moviment_logs (
        contract_id, actor_user_id, action, entity_type, record_id,
        transaction_id, request_id, database_user, old_data, new_data
    ) VALUES (
        audit_contract_id,
        audit_actor_user_id,
        substr(TG_OP, 1, 1),
        'movement',
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

    IF audit_contract_id IS NULL THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;

        RETURN NEW;
    END IF;

    INSERT INTO finance.moviment_logs (
        contract_id, actor_user_id, action, entity_type, record_id,
        transaction_id, request_id, database_user, old_data, new_data
    ) VALUES (
        audit_contract_id,
        audit_actor_user_id,
        substr(TG_OP, 1, 1),
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
                contract_id, actor_user_id, action, entity_type, record_id,
                transaction_id, request_id, database_user, old_data, new_data
            ) VALUES (
                NEW.id,
                audit_actor_user_id,
                'U',
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

    IF (old_setup - 'creditBillSettings' - 'notificationSettings')
        IS DISTINCT FROM
       (new_setup - 'creditBillSettings' - 'notificationSettings') THEN
        INSERT INTO finance.moviment_logs (
            contract_id, actor_user_id, action, entity_type, record_id,
            transaction_id, request_id, database_user, old_data, new_data
        ) VALUES (
            NEW.id, audit_actor_user_id, 'U', 'contract_settings', NEW.id,
            txid_current(), audit_request_id, session_user,
            old_setup - 'creditBillSettings' - 'notificationSettings',
            new_setup - 'creditBillSettings' - 'notificationSettings'
        );
    END IF;

    RETURN NEW;
END
$function$;

CREATE TRIGGER audit_moviment_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON finance.moviments
FOR EACH ROW EXECUTE FUNCTION finance.audit_moviment_change();

CREATE TRIGGER audit_moviment_account_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON finance.moviment_accounts
FOR EACH ROW EXECUTE FUNCTION finance.audit_settings_entity_change('account');

CREATE TRIGGER audit_ledger_account_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON finance.ledger_accounts
FOR EACH ROW EXECUTE FUNCTION finance.audit_settings_entity_change('category');

CREATE TRIGGER audit_status_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON finance.status
FOR EACH ROW EXECUTE FUNCTION finance.audit_settings_entity_change('status');

CREATE TRIGGER audit_contract_settings_change_trigger
AFTER UPDATE OF onboarding_setup ON finance.contracts
FOR EACH ROW EXECUTE FUNCTION finance.audit_contract_settings_change();

COMMIT;
