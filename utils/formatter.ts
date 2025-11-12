
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fa-IR').format(amount);
};

export const formatDateTime = (isoString: string): string => {
  const date = new Date(isoString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tehran',
    hour12: false,
    calendar: 'persian',
  };
  return new Intl.DateTimeFormat('fa-IR', options).format(date);
};

export const getJalaliDateParts = (isoString: string): { year: string; month: string; day: string } => {
  const date = new Date(isoString);
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Tehran',
    calendar: 'persian',
  };
  // Using -u-nu-latn ensures that the numbers are in Latin format (0-9), which is better for CSV files.
  const year = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { ...options, year: 'numeric' }).format(date);
  const month = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { ...options, month: '2-digit' }).format(date);
  const day = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { ...options, day: '2-digit' }).format(date);
  return { year, month, day };
};