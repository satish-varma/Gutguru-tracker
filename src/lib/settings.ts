import fs from 'fs/promises';
import path from 'path';

export interface AppSettings {
    emailSearchTerm: string;
    syncLookbackDays: number;
    emailUser?: string;
    emailPassword?: string;
}

const DEFAULT_SETTINGS: AppSettings = {
    emailSearchTerm: 'TheGutGuru',
    syncLookbackDays: 30,
    emailUser: '',
    emailPassword: '',
};

function getOrgSettingsPath(orgId: string) {
    return path.join(process.cwd(), 'data', orgId, 'settings.json');
}

export async function getSettings(orgId: string): Promise<AppSettings> {
    try {
        const data = await fs.readFile(getOrgSettingsPath(orgId), 'utf-8');
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch (error) {
        return DEFAULT_SETTINGS;
    }
}

export async function saveSettings(orgId: string, settings: AppSettings): Promise<void> {
    const newSettings = { ...DEFAULT_SETTINGS, ...settings };
    await fs.writeFile(getOrgSettingsPath(orgId), JSON.stringify(newSettings, null, 2));
}
