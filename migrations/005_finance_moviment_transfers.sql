BEGIN;

CREATE TABLE IF NOT EXISTS finance.moviment_transfers (
    id bigserial PRIMARY KEY,
    contract integer NOT NULL REFERENCES finance.contracts(id) ON DELETE CASCADE,
    series_id bigint,
    source_moviment_id integer NOT NULL REFERENCES finance.moviments(id) ON DELETE RESTRICT,
    destination_moviment_id integer NOT NULL REFERENCES finance.moviments(id) ON DELETE RESTRICT,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT moviment_transfers_distinct_moviments_chk
        CHECK (source_moviment_id <> destination_moviment_id),
    CONSTRAINT moviment_transfers_source_uidx UNIQUE (source_moviment_id),
    CONSTRAINT moviment_transfers_destination_uidx UNIQUE (destination_moviment_id)
);

CREATE INDEX IF NOT EXISTS moviment_transfers_contract_idx
    ON finance.moviment_transfers (contract);

CREATE INDEX IF NOT EXISTS moviment_transfers_series_idx
    ON finance.moviment_transfers (contract, series_id)
    WHERE series_id IS NOT NULL;

COMMIT;
