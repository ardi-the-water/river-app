import { useState, useEffect, useCallback } from 'react';
import { Invoice } from '../types';

const STORAGE_KEY = 'cafe-invoices';

export const useInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    try {
      const savedInvoices = localStorage.getItem(STORAGE_KEY);
      if (savedInvoices) {
        setInvoices(JSON.parse(savedInvoices));
      }
    } catch (error) {
      console.error("Failed to load invoices from localStorage", error);
    }
  }, []);

  const saveInvoicesToStorage = (updatedInvoices: Invoice[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedInvoices));
    } catch (error) {
      console.error("Failed to save invoices to localStorage", error);
    }
  };

  const addInvoice = useCallback((invoice: Omit<Invoice, 'id' | 'createdAt'>) => {
    setInvoices(prevInvoices => {
      const newInvoice: Invoice = {
        ...invoice,
        id: new Date().getTime().toString(),
        createdAt: new Date().toISOString(),
      };
      const updatedInvoices = [newInvoice, ...prevInvoices];
      saveInvoicesToStorage(updatedInvoices);
      return updatedInvoices;
    });
  }, []);

  const updateInvoice = useCallback((updatedInvoice: Invoice) => {
    setInvoices(prevInvoices => {
      const updatedInvoices = prevInvoices.map(inv =>
        inv.id === updatedInvoice.id ? updatedInvoice : inv
      );
      saveInvoicesToStorage(updatedInvoices);
      return updatedInvoices;
    });
  }, []);

  const deleteInvoice = useCallback((invoiceId: string) => {
    setInvoices(prevInvoices => {
      const updatedInvoices = prevInvoices.filter(inv => inv.id !== invoiceId);
      saveInvoicesToStorage(updatedInvoices);
      return updatedInvoices;
    });
  }, []);
  
  const clearAllInvoices = useCallback(() => {
    if (window.confirm("آیا از حذف تمام فاکتورها مطمئن هستید؟ این عمل غیرقابل بازگشت است.")) {
        setInvoices([]);
        saveInvoicesToStorage([]);
    }
  }, []);

  const replaceAllInvoices = useCallback((newInvoices: Invoice[]) => {
      if (window.confirm("آیا مطمئن هستید؟ با این کار تمام فاکتورهای فعلی با اطلاعات فایل پشتیبان جایگزین خواهند شد.")) {
          setInvoices(newInvoices);
          saveInvoicesToStorage(newInvoices);
          alert("اطلاعات با موفقیت بازیابی شد!");
      }
  }, []);

  return { invoices, addInvoice, updateInvoice, deleteInvoice, clearAllInvoices, replaceAllInvoices };
};
