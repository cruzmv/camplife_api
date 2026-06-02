ALTER TABLE finance.contracts
    ADD COLUMN IF NOT EXISTS join_code varchar(12);

UPDATE finance.contracts
   SET join_code = upper(substr(md5(random()::text || clock_timestamp()::text || id::text), 1, 12))
 WHERE join_code IS NULL;

ALTER TABLE finance.contracts
    ALTER COLUMN join_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS contracts_join_code_uidx
    ON finance.contracts (join_code);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_uidx
    ON finance.users (lower(username));

CREATE UNIQUE INDEX IF NOT EXISTS users_email_uidx
    ON finance.users (lower(email))
    WHERE email IS NOT NULL;
