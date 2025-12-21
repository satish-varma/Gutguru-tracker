import fs from 'fs/promises';
import path from 'path';

const SETTINGS_PATH = path.join(process.cwd(), 'data', 'settings.json');

export interface AppSettings {
    emailSearchTerm: string;
    syncLookbackDays: number;
}

const DEFAULT_SETTINGS: AppSettings = {
    emailSearchTerm: 'HungerBox',
    syncLookbackDays: 30,
};

export async function getSettings(): Promise<AppSettings> {
    try {
        const data = await fs.readFile(SETTINGS_PATH, 'utf-8');
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch (error) {
        // If file doesn't exist, return defaults
        return DEFAULT_SETTINGS;
    }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
    // Ensure we keep defaults for any missing keys
    const newSettings = { ...DEFAULT_SETTINGS, ...settings };
    await fs.writeFile(SETTINGS_PATH, JSON.stringify(newSettings, null, 2));
}
