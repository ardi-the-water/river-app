import React, { useState } from 'react';
import { AppSettings, Invoice } from '../types';

interface SettingsProps {
    settings: AppSettings;
    updateSettings: (newSettings: Partial<AppSettings>) => void;
    invoices: Invoice[];
    replaceAllInvoices: (newInvoices: Invoice[]) => void;
    clearAllInvoices: () => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, updateSettings, invoices, replaceAllInvoices, clearAllInvoices }) => {
    const [localCafeName, setLocalCafeName] = useState(settings.cafeName);
    const [localSheetURL, setLocalSheetURL] = useState(settings.googleSheetURL);

    const handleSave = () => {
        updateSettings({ cafeName: localCafeName, googleSheetURL: localSheetURL });
        alert('تنظیمات ذخیره شد!');
    };
    
    const handleBackup = () => {
        if (invoices.length === 0) {
            alert('هیچ فاکتوری برای پشتیبان‌گیری وجود ندارد.');
            return;
        }
        const dataStr = JSON.stringify(invoices, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `cafe_backup_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("File content is not valid");
                
                const restoredInvoices = JSON.parse(text);
                
                // Basic validation
                if (Array.isArray(restoredInvoices) && restoredInvoices.every(inv => 'id' in inv && 'items' in inv && 'total' in inv)) {
                    replaceAllInvoices(restoredInvoices);
                } else {
                    throw new Error('فایل پشتیبان معتبر نیست.');
                }
            } catch (error) {
                console.error("Restore failed:", error);
                alert(error instanceof Error ? error.message : "خطا در بازیابی اطلاعات.");
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input for re-uploading same file
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 h-full flex flex-col space-y-6">
            <h2 className="text-xl font-semibold border-b pb-2 dark:border-gray-600">تنظیمات</h2>
            
            <div className="space-y-4">
                <div>
                    <label htmlFor="cafeName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نام کافه</label>
                    <input 
                        type="text" 
                        id="cafeName"
                        value={localCafeName}
                        onChange={(e) => setLocalCafeName(e.target.value)}
                        className="w-full p-2 text-base rounded-md bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                 <div>
                    <label htmlFor="sheetURL" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">لینک گوگل شیت منو (CSV)</label>
                    <input 
                        type="url"
                        id="sheetURL"
                        value={localSheetURL}
                        onChange={(e) => setLocalSheetURL(e.target.value)}
                        className="w-full p-2 text-base rounded-md bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none ltr text-left"
                    />
                </div>
                <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition">ذخیره تنظیمات</button>
            </div>

            <div className="space-y-4 border-t pt-6 dark:border-gray-600">
                <h3 className="text-lg font-semibold">پشتیبان‌گیری و بازیابی</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={handleBackup} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition">دانلود فایل پشتیبان (JSON)</button>
                    <div>
                        <label htmlFor="restore" className="cursor-pointer px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition">
                            بازیابی از فایل
                        </label>
                        <input type="file" id="restore" accept=".json" onChange={handleRestore} className="hidden" />
                    </div>
                </div>
            </div>
            
            <div className="space-y-4 border-t pt-6 dark:border-gray-600">
                 <h3 className="text-lg font-semibold text-red-500">منطقه خطر</h3>
                 <p className="text-sm text-gray-600 dark:text-gray-400">این عملیات غیرقابل بازگشت هستند. لطفا با احتیاط عمل کنید.</p>
                 <button onClick={clearAllInvoices} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition">حذف تمام فاکتورها</button>
            </div>
        </div>
    );
};

export default Settings;
