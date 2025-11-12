export interface MenuItem {
  category: string;
  name: string;
  price: number;
}

export interface OrderItem extends MenuItem {
  quantity: number;
}

export interface Invoice {
  id: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  createdAt: string; // ISO string format
}

export interface AppSettings {
  cafeName: string;
  googleSheetURL: string;
}
