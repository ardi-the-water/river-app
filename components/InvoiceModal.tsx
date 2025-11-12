import React from 'react';
import { Invoice } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatter';

interface InvoiceModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  cafeName: string;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ invoice, onClose, cafeName }) => {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!invoice) return;

    const invoiceText = `
 ${cafeName}
 شماره فاکتور: ${invoice.id.slice(-6)}
 تاریخ: ${formatDateTime(invoice.createdAt)}
 
 --------------------
 
 ${invoice.items.map(item => `${item.name} (${item.quantity} عدد) - ${formatCurrency(item.price * item.quantity)} تومان`).join('\n')}
 
 --------------------
 
 جمع کل: ${formatCurrency(invoice.subtotal)} تومان
 تخفیف: ${formatCurrency(invoice.discount)} تومان
 مبلغ نهایی: ${formatCurrency(invoice.total)} تومان
 
 از خرید شما سپاسگزاریم!
    `.trim().replace(/^\s+/gm, '');

    if (navigator.share) {
      try {
        await navigator.share({
          title: `رسید فاکتور #${invoice.id.slice(-6)}`,
          text: invoiceText,
        });
      } catch (err) {
        console.error('خطا در اشتراک‌گذاری:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(invoiceText);
        alert('رسید در کلیپ‌بورد کپی شد!');
      } catch (err) {
        console.error('خطا در کپی کردن:', err);
        alert('کپی کردن رسید با خطا مواجه شد.');
      }
    }
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div id="print-area" className="p-6 text-gray-900 dark:text-gray-100">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">{cafeName}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">رسید مشتری</p>
          </div>
          <div className="flex justify-between text-sm mb-4 border-b pb-2 border-dashed">
            <span>شماره فاکتور: {invoice.id.slice(-6)}</span>
            <span>تاریخ: {formatDateTime(invoice.createdAt)}</span>
          </div>
          <div className="space-y-2 mb-4">
            {invoice.items.map((item) => (
              <div key={item.name} className="flex justify-between items-center text-sm">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.quantity} عدد × {formatCurrency(item.price)} تومان
                  </p>
                </div>
                <span className="font-mono">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>جمع کل</span>
              <span className="font-mono">{formatCurrency(invoice.subtotal)} تومان</span>
            </div>
            <div className="flex justify-between">
              <span>تخفیف</span>
              <span className="font-mono text-red-500">-{formatCurrency(invoice.discount)} تومان</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t border-gray-300 pt-2 mt-2">
              <span>مبلغ قابل پرداخت</span>
              <span className="font-mono">{formatCurrency(invoice.total)} تومان</span>
            </div>
          </div>
          <div className="text-center mt-6 text-xs text-gray-500 dark:text-gray-400">
            <p>از خرید شما سپاسگزاریم!</p>
          </div>
        </div>
        <div className="no-print p-4 bg-gray-50 dark:bg-gray-700 rounded-b-lg flex justify-end space-x-reverse space-x-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-400 transition">بستن</button>
          <button onClick={handleShare} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition">اشتراک</button>
          <button onClick={handlePrint} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition">چاپ</button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
