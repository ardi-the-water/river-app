import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useMenu } from './hooks/useMenu';
import { useInvoices } from './hooks/useInvoices';
import { useSettings } from './hooks/useSettings';
import { OrderItem, Invoice, MenuItem } from './types';
import { formatCurrency, formatDateTime, getJalaliDateParts } from './utils/formatter';
import InvoiceModal from './components/InvoiceModal';
import Settings from './components/Settings';

type ViewMode = 'order' | 'invoices' | 'settings';
const ORDER_STORAGE_KEY = 'cafe-current-order';
const DISCOUNT_STORAGE_KEY = 'cafe-current-discount';

const App: React.FC = () => {
    const { settings, updateSettings, isLoaded: settingsLoaded } = useSettings();
    const { menuItems, isLoading: isMenuLoading, error: menuError, setMenuItems } = useMenu(settings.googleSheetURL);
    const { invoices, addInvoice, updateInvoice, deleteInvoice, clearAllInvoices, replaceAllInvoices } = useInvoices();

    const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
    const [discount, setDiscount] = useState<number>(0);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('order');
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);


    useEffect(() => {
        try {
            const savedOrder = localStorage.getItem(ORDER_STORAGE_KEY);
            if (savedOrder) setCurrentOrder(JSON.parse(savedOrder));
            const savedDiscount = localStorage.getItem(DISCOUNT_STORAGE_KEY);
            if (savedDiscount) setDiscount(JSON.parse(savedDiscount));
        } catch (error)
        {
            console.error("Failed to load current order from localStorage", error);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(currentOrder));
    }, [currentOrder]);

    useEffect(() => {
        localStorage.setItem(DISCOUNT_STORAGE_KEY, JSON.stringify(discount));
    }, [discount]);
    
    // Clear menu if settings are changed to an invalid URL
    useEffect(() => {
        if (!settings.googleSheetURL && settingsLoaded) {
            setMenuItems([]);
        }
    }, [settings.googleSheetURL, settingsLoaded, setMenuItems]);


    const menuByCategory = useMemo(() => {
        return menuItems.reduce((acc, item) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(item);
            return acc;
        }, {} as Record<string, MenuItem[]>);
    }, [menuItems]);

    const filteredMenu = useMemo(() => {
        if (!searchQuery) return menuByCategory;
        const lowercasedQuery = searchQuery.toLowerCase().trim();
        return Object.entries(menuByCategory).reduce((acc, [category, items]) => {
            const filteredItems = (items as MenuItem[]).filter(item => item.name.toLowerCase().includes(lowercasedQuery));
            if (filteredItems.length > 0) acc[category] = filteredItems;
            return acc;
        }, {} as Record<string, MenuItem[]>);
    }, [searchQuery, menuByCategory]);
    
    const isFilteredMenuEmpty = useMemo(() => {
        return filteredMenu ? Object.keys(filteredMenu).length === 0 : false;
    }, [filteredMenu]);

    const handleAddItem = (item: MenuItem) => {
        setCurrentOrder(prevOrder => {
            const existingItem = prevOrder.find(orderItem => orderItem.name === item.name);
            if (existingItem) {
                return prevOrder.map(orderItem =>
                    orderItem.name === item.name
                        ? { ...orderItem, quantity: orderItem.quantity + 1 }
                        : orderItem
                );
            }
            return [...prevOrder, { ...item, quantity: 1 }];
        });
    };

    const handleQuantityChange = (itemName: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            setCurrentOrder(prevOrder => prevOrder.filter(item => item.name !== itemName));
        } else {
            setCurrentOrder(prevOrder =>
                prevOrder.map(item =>
                    item.name === itemName ? { ...item, quantity: newQuantity } : item
                )
            );
        }
    };

    const subtotal = useMemo(() => currentOrder.reduce((sum, item) => sum + item.price * item.quantity, 0), [currentOrder]);
    const total = useMemo(() => Math.max(0, subtotal - discount), [subtotal, discount]);

    const resetOrder = useCallback(() => {
        setCurrentOrder([]);
        setDiscount(0);
        setEditingInvoice(null);
    }, []);

    const handleSaveInvoice = () => {
        if (currentOrder.length === 0) return alert('سبد خرید خالی است!');
        const invoiceData = { items: currentOrder, subtotal, discount, total };
        if (editingInvoice) {
            updateInvoice({ ...invoiceData, id: editingInvoice.id, createdAt: editingInvoice.createdAt });
        } else {
            addInvoice(invoiceData);
        }
        resetOrder();
        setViewMode('invoices');
    };
    
    const handleSaveAndCloseModal = () => {
        handleSaveInvoice();
        setIsOrderModalOpen(false);
    };

    const handleCancelAndCloseModal = () => {
        resetOrder();
        setIsOrderModalOpen(false);
    };

    const handleEditInvoice = (invoice: Invoice) => {
        setEditingInvoice(invoice);
        setCurrentOrder(Array.isArray(invoice.items) ? invoice.items : []);
        setDiscount(invoice.discount);
        setViewMode('order');
    };

    const handleDeleteInvoice = useCallback((invoiceId: string) => {
        if (window.confirm('آیا از حذف این فاکتور مطمئن هستید؟')) {
            deleteInvoice(invoiceId);
        }
    }, [deleteInvoice]);
    
    const exportInvoicesToCSV = () => {
        if (invoices.length === 0) return alert('هیچ فاکتوری برای خروجی گرفتن وجود ندارد.');

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += "ID,سال (شمسی),ماه (شمسی),روز (شمسی),ساعت,آیتم ها,تعداد کل,مبلغ خام,تخفیف,مبلغ نهایی\n";

        invoices.forEach(invoice => {
            if (!invoice) return;
            const { year, month, day } = getJalaliDateParts(invoice.createdAt);
            const time = new Date(invoice.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tehran' });

            const items = Array.isArray(invoice.items) ? invoice.items : [];
            const itemsString = `"${items.map(i => `${i.name} (${i.quantity})`).join('; ')}"`;
            const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
            
            const row = [invoice.id.slice(-6), year, month, day, time, itemsString, totalItems, invoice.subtotal, invoice.discount, invoice.total].join(',');
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `invoices_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderView = () => {
        switch (viewMode) {
            case 'invoices':
                return (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 h-full flex flex-col">
                        <div className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-center mb-4 border-b pb-2 dark:border-gray-600 gap-2">
                            <h2 className="text-xl font-semibold">لیست فاکتورها</h2>
                            <div className='flex gap-2'>
                                <button onClick={exportInvoicesToCSV} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition text-sm">خروجی CSV</button>
                            </div>
                        </div>
                        <div className="flex-grow overflow-y-auto">
                            {invoices.length === 0 ? <p className="text-center text-gray-500 py-8">هیچ فاکتوری ثبت نشده است.</p> :
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                                    {invoices.map(invoice => (
                                        <div key={invoice.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex flex-col justify-between shadow-sm">
                                            <div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-bold text-lg text-blue-600 dark:text-blue-400">#{invoice.id.slice(-6)}</span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(invoice.createdAt)}</span>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                                                    {(Array.isArray(invoice.items) ? invoice.items : []).reduce((acc, item) => acc + item.quantity, 0)} قلم کالا
                                                </p>
                                                <p className="font-bold text-xl text-right mb-4">{formatCurrency(invoice.total)} <span className="text-sm font-normal">تومان</span></p>
                                            </div>
                                            <div className="flex gap-2 flex-wrap border-t dark:border-gray-600 pt-3 justify-end">
                                                <button onClick={() => setSelectedInvoice(invoice)} className="text-sm px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">نمایش</button>
                                                <button onClick={() => handleEditInvoice(invoice)} className="text-sm px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">ویرایش</button>
                                                <button onClick={() => handleDeleteInvoice(invoice.id)} className="text-sm px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">حذف</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            }
                        </div>
                    </div>
                );
            case 'settings':
                return <Settings settings={settings} updateSettings={updateSettings} invoices={invoices} replaceAllInvoices={replaceAllInvoices} clearAllInvoices={clearAllInvoices}/>;
            case 'order':
            default:
                 const OrderManagerUI = ({ isModal }: { isModal: boolean }) => (
                    <div className={`flex flex-col h-full bg-white dark:bg-gray-800 ${isModal ? '' : 'rounded-lg shadow'}`}>
                        <div className="flex-shrink-0 p-4 border-b dark:border-gray-600 flex justify-between items-center">
                            <h2 className="text-xl font-semibold">{editingInvoice ? `ویرایش فاکتور #${editingInvoice.id.slice(-6)}` : isModal ? 'خلاصه سفارش' : 'سفارش فعلی'}</h2>
                            {isModal && <button onClick={() => setIsOrderModalOpen(false)} className="text-3xl font-light text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 leading-none">&times;</button>}
                        </div>
                        <div className="flex-grow overflow-y-auto space-y-3 p-4">
                             {currentOrder.length === 0 ? <p className="text-gray-500 text-center py-4">آیتمی انتخاب نشده است.</p> :
                                currentOrder.map(item => (
                                    <div key={item.name} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-2 rounded-md">
                                        <div>
                                            <p className="font-semibold text-sm">{item.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(item.price)} تومان</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleQuantityChange(item.name, item.quantity - 1)} className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 font-bold flex items-center justify-center">-</button>
                                            <span className="w-6 text-center font-mono">{item.quantity}</span>
                                            <button onClick={() => handleQuantityChange(item.name, item.quantity + 1)} className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 font-bold flex items-center justify-center">+</button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                        <div className={`flex-shrink-0 border-t dark:border-gray-600 p-4 space-y-3 bg-gray-50 dark:bg-gray-800/50 ${isModal ? '' : 'rounded-b-lg'}`}>
                            <div className="flex justify-between text-sm">
                                <span>جمع کل:</span><span className="font-mono">{formatCurrency(subtotal)} تومان</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <label htmlFor="discount">تخفیف (تومان):</label>
                                <input type="number" id="discount" value={discount === 0 ? '' : discount} placeholder="0" onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))} className="w-28 p-1 text-left rounded-md bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"/>
                            </div>
                            <div className="flex justify-between font-bold text-lg text-blue-600 dark:text-blue-400 pt-2 border-t dark:border-gray-600">
                                <span>مبلغ نهایی:</span><span className="font-mono">{formatCurrency(total)} تومان</span>
                            </div>
                            <div className="flex gap-2 mt-2">
                                <button onClick={isModal ? handleSaveAndCloseModal : handleSaveInvoice} className="flex-1 bg-green-500 text-white p-3 rounded-md hover:bg-green-600 transition font-bold">{editingInvoice ? 'بروزرسانی فاکتور' : 'ثبت فاکتور'}</button>
                                <button onClick={isModal ? handleCancelAndCloseModal : resetOrder} className="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 p-3 rounded-md hover:bg-gray-400 transition">لغو</button>
                            </div>
                        </div>
                    </div>
                 );
                 
                return (
                    <div className="h-full flex flex-col md:flex-row md:gap-6">
                        {/* Order Sidebar for Desktop */}
                        <div className="hidden md:block md:w-80 lg:w-96 md:flex-shrink-0">
                            <OrderManagerUI isModal={false} />
                        </div>

                        {/* Menu Section for All Screens */}
                        <div className="flex-grow flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                            <div className="p-4 border-b dark:border-gray-700">
                                 <input type="search" placeholder="جستجوی آیتم در منو..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full p-2 text-base rounded-md bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"/>
                            </div>
                            <div className="flex-grow p-4 overflow-y-auto pb-24 md:pb-4">
                                {isMenuLoading && <p className="text-center">در حال بارگذاری منو...</p>}
                                {menuError && <p className="text-red-500 text-center">{menuError}</p>}
                                {isFilteredMenuEmpty && !isMenuLoading && <p className="text-center text-gray-500">آیتمی با این نام یافت نشد.</p>}
                                {filteredMenu && <div className="space-y-6">
                                    {Object.entries(filteredMenu).map(([category, items]) => (
                                        <div key={category}>
                                            <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-3 pb-2 border-b-2 border-blue-100 dark:border-blue-900">{category}</h3>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                                                {(items as MenuItem[]).map(item => (
                                                    <button key={item.name} onClick={() => handleAddItem(item)} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-right hover:bg-blue-100 dark:hover:bg-blue-900 transition shadow-sm flex flex-col justify-between h-28">
                                                        <p className="font-semibold text-sm flex-grow">{item.name}</p>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">{formatCurrency(item.price)} تومان</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>}
                           </div>
                        </div>

                        {/* --- MOBILE ONLY UI --- */}
                        <div className="md:hidden">
                            {/* Sticky Footer Button */}
                            {currentOrder.length > 0 && !isOrderModalOpen && (
                                <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-[0_-2px_5px_rgba(0,0,0,0.1)] p-3 border-t dark:border-gray-700 z-40">
                                    <button onClick={() => setIsOrderModalOpen(true)} className="w-full bg-blue-500 text-white p-3 rounded-md flex justify-between items-center font-bold text-lg">
                                        <span>مشاهده سفارش ({currentOrder.reduce((acc, item) => acc + item.quantity, 0)} آیتم)</span>
                                        <span className="font-mono">{formatCurrency(total)} تومان</span>
                                    </button>
                                </div>
                            )}

                            {/* Order Summary Modal */}
                            {isOrderModalOpen && (
                                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col justify-end" onClick={() => setIsOrderModalOpen(false)}>
                                    <div className="bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl w-full h-[85vh] max-h-[700px] flex flex-col" onClick={(e) => e.stopPropagation()}>
                                        <OrderManagerUI isModal={true} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="h-screen flex flex-col text-gray-800 dark:text-gray-200">
            <header className="flex-shrink-0 bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{settings.cafeName}</h1>
                <nav className="flex gap-2">
                    <button onClick={() => setViewMode('order')} className={`px-3 py-2 text-sm md:px-4 md:text-base rounded-md transition ${viewMode === 'order' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>ثبت فاکتور</button>
                    <button onClick={() => setViewMode('invoices')} className={`px-3 py-2 text-sm md:px-4 md:text-base rounded-md transition ${viewMode === 'invoices' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>فاکتورها</button>
                    <button onClick={() => setViewMode('settings')} className={`px-3 py-2 text-sm md:px-4 md:text-base rounded-md transition ${viewMode === 'settings' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>تنظیمات</button>
                </nav>
            </header>

            <main className="flex-grow p-4 md:p-6 overflow-y-auto">
                {renderView()}
            </main>
            
            <InvoiceModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} cafeName={settings.cafeName} />
        </div>
    );
};

export default App;