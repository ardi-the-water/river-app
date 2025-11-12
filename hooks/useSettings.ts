import { useState, useEffect, useCallback } from 'react';
import { AppSettings } from '../types';

const STORAGE_KEY = 'cafe-settings';
const DEFAULT_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRElfB1B4GhD8R7KlodrSoNY_CNMpRYD-yQFXo7lGnkS-f1sipqbjV5AWFIRIXOzNRCptPQK_lV3ZCF/pub?output=csv';

const defaultSettings: AppSettings = {
    cafeName: 'کافه ما',
    googleSheetURL: DEFAULT_URL,
};

export const useSettings = () => {
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        try {
            const savedSettings = localStorage.getItem(STORAGE_KEY);
            if (savedSettings) {
                // Merge with defaults to ensure all keys are present
                setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
            }
        } catch (error) {
            console.error("Failed to load settings from localStorage", error);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
        setSettings(prevSettings => {
            const updated = { ...prevSettings, ...newSettings };
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch (error) {
                console.error("Failed to save settings to localStorage", error);
            }
            return updated;
        });
    }, []);

    return { settings, updateSettings, isLoaded };
};
