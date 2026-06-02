import fs from 'fs';
import path from 'path';

interface AuthConfig {
    jwtSecret: string;
    googleClientId: string;
}

interface AppConfig {
    auth: AuthConfig;
}

let cachedConfig: AppConfig | null = null;

export function getAuthConfig(): AuthConfig {
    if (!cachedConfig) {
        cachedConfig = loadConfig();
    }

    return cachedConfig.auth;
}

function loadConfig(): AppConfig {
    const configPath = path.resolve(process.cwd(), 'config', 'local.config.json');

    if (!fs.existsSync(configPath)) {
        throw new Error(`Missing config file: ${configPath}`);
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Partial<AppConfig>;
    const jwtSecret = config.auth?.jwtSecret?.trim() ?? '';
    const googleClientId = config.auth?.googleClientId?.trim() ?? '';

    if (jwtSecret.length < 32) {
        throw new Error('config.auth.jwtSecret must contain at least 32 characters');
    }

    return {
        auth: {
            jwtSecret,
            googleClientId
        }
    };
}
