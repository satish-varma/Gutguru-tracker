import fs from 'fs/promises';
import path from 'path';

export interface AppSettings {
    emailSearchTerm: string;
    syncLookbackDays: number;
}

const DEFAULT_SETTINGS: AppSettings = {
    emailSearchTerm: 'HungerBox',
    syncLookbackDays: 30,
};

function getUserSettingsPath(userId: string) {
    return path.join(process.cwd(), 'data', userId, 'settings.json');
}

export async function getSettings(userId: string): Promise<AppSettings> {
    try {
        const data = await fs.readFile(getUserSettingsPath(userId), 'utf-8');
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch (error) {
        return DEFAULT_SETTINGS;
    }
}

export async function saveSettings(userId: string, settings: AppSettings): Promise<void> {
    const newSettings = { ...DEFAULT_SETTINGS, ...settings };
    await fs.writeFile(getUserSettingsPath(userId), JSON.stringify(newSettings, null, 2));
}
