CREATE OR REPLACE FUNCTION finance.balance(p_contract integer)
RETURNS TABLE(
    id integer,
    datetime timestamp without time zone,
    description character varying,
    ledger_account_id integer,
    ledger_account character varying,
    moviment_account_id integer,
    moviment_account character varying,
    status_id integer,
    status character varying,
    value numeric,
    balances jsonb
)
LANGUAGE plpgsql
AS $function$
DECLARE
    moviment RECORD;
    account RECORD;
    balance jsonb;
    last_cycle jsonb := '{}'::jsonb;
    cycle_start date;
BEGIN
    SELECT jsonb_object_agg(
               x.description,
               CASE
                   WHEN x.account_type = 0 THEN COALESCE(NULLIF(x.start_value::text, '')::numeric, 0)
                   ELSE 0::numeric
               END
           )
      INTO balance
      FROM finance.moviment_accounts x
     WHERE x.contract = p_contract;

    FOR moviment IN
        SELECT a.id,
               a.datetime,
               a.description,
               b.description AS ledger_account,
               a.ledger_account AS ledger_account_id,
               c.description AS moviment_account,
               a.moviment_account AS moviment_account_id,
               d.description AS status,
               a.status AS status_id,
               a.value
          FROM finance.moviments a
          LEFT JOIN finance.ledger_accounts b ON b.id = a.ledger_account
          LEFT JOIN finance.moviment_accounts c ON c.id = a.moviment_account
          LEFT JOIN finance.status d ON d.id = a.status
         WHERE a.contract = p_contract
         ORDER BY a.datetime
    LOOP
        FOR account IN
            SELECT x.description,
                   x.closing_day,
                   x.account_type,
                   CASE
                       WHEN x.account_type = 0 THEN COALESCE(NULLIF(x.start_value::text, '')::numeric, 0)
                       ELSE 0::numeric
                   END AS start_value
              FROM finance.moviment_accounts x
             WHERE x.contract = p_contract
        LOOP
            cycle_start :=
                CASE
                    WHEN account.closing_day > 0
                         AND EXTRACT(DAY FROM moviment.datetime) >= account.closing_day
                    THEN date_trunc('month', moviment.datetime)::date + (account.closing_day - 1)
                    WHEN account.closing_day > 0
                    THEN (date_trunc('month', moviment.datetime) - interval '1 month')::date
                         + (account.closing_day - 1)
                    ELSE NULL
                END;

            IF account.closing_day > 0 AND cycle_start IS NOT NULL THEN
                IF (last_cycle ->> account.description) IS DISTINCT FROM cycle_start::text THEN
                    balance := balance || jsonb_build_object(account.description, account.start_value);
                    last_cycle := last_cycle || jsonb_build_object(account.description, cycle_start);
                END IF;
            END IF;

            IF account.description = moviment.moviment_account THEN
                balance := balance || jsonb_build_object(
                    account.description,
                    COALESCE((balance ->> account.description)::numeric, 0) + moviment.value
                );
            END IF;
        END LOOP;

        RETURN QUERY
            SELECT moviment.id::int,
                   moviment.datetime::timestamp,
                   moviment.description::varchar(255),
                   moviment.ledger_account_id::int,
                   moviment.ledger_account::varchar(50),
                   moviment.moviment_account_id::int,
                   moviment.moviment_account::varchar(250),
                   moviment.status_id::int,
                   moviment.status::varchar(250),
                   moviment.value::numeric,
                   balance::jsonb;
    END LOOP;
END
$function$;
