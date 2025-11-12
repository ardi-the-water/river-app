import { useState, useEffect } from 'react';
import { MenuItem } from '../types';

const parseCSV = (csvText: string): MenuItem[] => {
  const lines = csvText.split(/\r?\n/).slice(1); // Skip header row
  return lines
    .map(line => {
      const values = line.split(',');
      if (values.length >= 3) {
        const name = values[0]?.trim();
        const category = values[1]?.trim();
        const price = parseInt(values[2]?.trim(), 10);
        if (category && name && !isNaN(price)) {
          return { category, name, price };
        }
      }
      return null;
    })
    .filter((item): item is MenuItem => item !== null);
};


export const useMenu = (googleSheetURL: string) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!googleSheetURL) {
        setError("لینک گوگل شیت در تنظیمات مشخص نشده است.");
        setIsLoading(false);
        setMenuItems([]);
        return;
    }
    const fetchMenu = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Add a timestamp to bypass cache
        const url = `${googleSheetURL}&_=${new Date().getTime()}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('خطا در دریافت اطلاعات منو. لینک را در تنظیمات بررسی کنید.');
        }
        const csvText = await response.text();
        const parsedData = parseCSV(csvText);
        setMenuItems(parsedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'یک خطای ناشناخته رخ داد');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenu();
  }, [googleSheetURL]);

  return { menuItems, isLoading, error, setMenuItems };
};
