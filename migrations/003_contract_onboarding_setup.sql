ALTER TABLE finance.contracts
    ADD COLUMN IF NOT EXISTS onboarding_setup jsonb;
