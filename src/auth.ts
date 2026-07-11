import { randomBytes } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { dbloglife } from './services/postgresql';
import { getAuthConfig } from './config';

export interface AuthSession {
    userId: number;
    contractId: number;
    username: string;
}

declare global {
    namespace Express {
        interface Request {
            auth?: AuthSession;
        }
    }
}

interface UserRecord {
    id: number;
    contrato: number;
    username: string;
    password: string | null;
    google_sub: string | null;
    email: string | null;
}

interface GoogleProfile {
    sub: string;
    email: string;
    name: string;
}

const googleClient = new OAuth2Client();

function issueSession(user: UserRecord) {
    const session: AuthSession = {
        userId: user.id,
        contractId: user.contrato,
        username: user.username
    };

    return {
        token: jwt.sign(session, getAuthConfig().jwtSecret, { expiresIn: '30d' }),
        user: session
    };
}

function normalizeRequired(value: unknown): string {
    return String(value ?? '').trim();
}

function generateJoinCode(): string {
    return randomBytes(6).toString('hex').toUpperCase();
}

async function createContract(transaction: any, name: string) {
    const contract = await transaction.one(
        `INSERT INTO finance.contracts (name, join_code)
         VALUES ($1, $2)
         RETURNING id`,
        [name, generateJoinCode()]
    ) as { id: number };

    await initializeContractDefaults(transaction, contract.id);

    return contract;
}

async function initializeContractDefaults(transaction: any, contractId: number) {
    await transaction.none(
        `INSERT INTO finance.ledger_accounts (description, contract)
         SELECT description, $1
           FROM finance.ledger_accounts_default`,
        [contractId]
    );

    await transaction.none(
        `INSERT INTO finance.moviment_accounts (
            description,
            contract,
            start_date,
            start_value,
            closing_day,
            account_type
         )
         SELECT description,
                $1,
                start_date,
                start_value,
                closing_day,
                account_type
           FROM finance.moviment_accounts_default`,
        [contractId]
    );

    await transaction.none(
        `INSERT INTO finance.status (description, contract)
         SELECT description, $1
           FROM finance.status_default`,
        [contractId]
    );
}

async function resolveJoinCode(transaction: any, joinCode: unknown) {
    const normalizedCode = normalizeRequired(joinCode).toUpperCase();
    if (!normalizedCode) {
        return null;
    }

    return transaction.oneOrNone(
        `SELECT id
           FROM finance.contracts
          WHERE join_code = $1
          LIMIT 1`,
        [normalizedCode]
    ) as Promise<{ id: number } | null>;
}

async function getGoogleProfile(credential: unknown): Promise<GoogleProfile | null> {
    const googleClientId = getAuthConfig().googleClientId;
    const idToken = normalizeRequired(credential);

    if (!googleClientId) {
        throw new Error('config.auth.googleClientId is required for Google sign-in');
    }

    if (!idToken) {
        return null;
    }

    const ticket = await googleClient.verifyIdToken({ idToken, audience: googleClientId });
    const payload = ticket.getPayload();
    const sub = payload?.sub;
    const email = payload?.email?.trim().toLowerCase();

    if (!sub || !email || !payload?.email_verified) {
        return null;
    }

    return {
        sub,
        email,
        name: payload.name?.trim() || email.split('@')[0]
    };
}

async function buildUniqueGoogleUsername(transaction: any, email: string): Promise<string> {
    const base = email.split('@')[0].replace(/[^a-z0-9._-]/gi, '') || 'google-user';
    let username = base;
    let suffix = 1;

    while (await transaction.oneOrNone('SELECT 1 FROM finance.users WHERE lower(username) = lower($1)', [username])) {
        suffix += 1;
        username = `${base}-${suffix}`;
    }

    return username;
}

export async function signInWithPassword(username: unknown, password: unknown) {
    const normalizedUsername = normalizeRequired(username);
    const normalizedPassword = String(password ?? '');

    if (!normalizedUsername || !normalizedPassword) {
        return null;
    }

    const user = await dbloglife.oneOrNone<UserRecord>(
        `SELECT id, contrato, username, password, google_sub, email
           FROM finance.users
          WHERE lower(username) = lower($1)
          LIMIT 1`,
        [normalizedUsername]
    );

    if (!user?.password || !(await bcrypt.compare(normalizedPassword, user.password))) {
        return null;
    }

    return issueSession(user);
}

export async function registerWithPassword(
    email: unknown,
    username: unknown,
    password: unknown,
    joinCode: unknown
) {
    const normalizedEmail = normalizeRequired(email).toLowerCase();
    const normalizedUsername = normalizeRequired(username);
    const normalizedPassword = String(password ?? '');

    if (!normalizedEmail || !normalizedEmail.includes('@') || !normalizedUsername || normalizedPassword.length < 8) {
        throw new Error('Invalid registration fields');
    }

    return dbloglife.tx(async (transaction) => {
        const existingUser = await transaction.oneOrNone(
            `SELECT 1 FROM finance.users
              WHERE lower(username) = lower($1) OR lower(email) = lower($2)`,
            [normalizedUsername, normalizedEmail]
        );
        if (existingUser) {
            throw new Error('Username or email already registered');
        }

        const requestedContract = await resolveJoinCode(transaction, joinCode);
        if (normalizeRequired(joinCode) && !requestedContract) {
            throw new Error('Invalid contract join code');
        }

        const contract = requestedContract ?? await createContract(transaction, normalizedUsername);
        const passwordHash = await bcrypt.hash(normalizedPassword, 12);
        const user = await transaction.one<UserRecord>(
            `INSERT INTO finance.users (contrato, username, password, email)
             VALUES ($1, $2, $3, $4)
             RETURNING id, contrato, username, password, google_sub, email`,
            [contract.id, normalizedUsername, passwordHash, normalizedEmail]
        );

        return issueSession(user);
    });
}

export async function signInWithGoogle(credential: unknown) {
    const profile = await getGoogleProfile(credential);
    if (!profile) {
        return null;
    }

    return dbloglife.tx(async (transaction) => {
        const existingUser = await transaction.oneOrNone<UserRecord>(
            `SELECT id, contrato, username, password, google_sub, email
               FROM finance.users
              WHERE google_sub = $1
              LIMIT 1`,
            [profile.sub]
        );
        if (existingUser) {
            return issueSession(existingUser);
        }

        const duplicateEmail = await transaction.oneOrNone(
            'SELECT 1 FROM finance.users WHERE lower(email) = lower($1)',
            [profile.email]
        );
        if (duplicateEmail) {
            throw new Error('Email already registered. Sign in with your password first.');
        }

        const contract = await createContract(transaction, profile.name);
        const username = await buildUniqueGoogleUsername(transaction, profile.email);
        const user = await transaction.one<UserRecord>(
            `INSERT INTO finance.users (contrato, username, email, google_sub)
             VALUES ($1, $2, $3, $4)
             RETURNING id, contrato, username, password, google_sub, email`,
            [contract.id, username, profile.email, profile.sub]
        );

        return issueSession(user);
    });
}

export async function getContractJoinCode(contractId: number) {
    return dbloglife.one<{ joinCode: string }>(
        `SELECT join_code AS "joinCode"
           FROM finance.contracts
          WHERE id = $1`,
        [contractId]
    );
}

export async function getContractOnboardingSetup(contractId: number) {
    return dbloglife.one<{ onboardingSetup: any | null }>(
        `SELECT onboarding_setup AS "onboardingSetup"
           FROM finance.contracts
          WHERE id = $1`,
        [contractId]
    );
}

export async function saveContractOnboardingSetup(contractId: number, onboardingSetup: unknown) {
    return dbloglife.one<{ onboardingSetup: any }>(
        `UPDATE finance.contracts
            SET onboarding_setup = $2::jsonb
          WHERE id = $1
          RETURNING onboarding_setup AS "onboardingSetup"`,
        [contractId, JSON.stringify(onboardingSetup ?? {})]
    );
}

export function requireFinanceAuth(req: Request, res: Response, next: NextFunction): void {
    const authorization = req.header('Authorization') ?? '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

    if (!token) {
        res.status(401).json({ message: 'Authentication required' });
        return;
    }

    try {
        req.auth = jwt.verify(token, getAuthConfig().jwtSecret) as AuthSession;
        next();
    } catch {
        res.status(401).json({ message: 'Invalid or expired session' });
    }
}

export function withFinanceIdentity(body: any, req: Request) {
    const identity = {
        contract: req.auth!.contractId,
        user: req.auth!.userId
    };
    const securedBody = {
        ...(body ?? {}),
        ...identity
    };

    Object.keys(securedBody).forEach((key) => {
        const value = securedBody[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            securedBody[key] = { ...value, ...identity };
        }
    });

    return securedBody;
}
