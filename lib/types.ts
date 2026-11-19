export type Role = "customer" | "owner" | "admin";
export type User = {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: Role;
  phone?: string;
  address?: string;
  disabled?: boolean;
  createdAt?: string;
};
export type Equipment = {
  demoId?: string;
  demoOnly?: boolean;
  demoImageSource?: string;
  id: string;
  name: string;
  description: string;
  category: string;
  location: string;
  price: number;
  rentalType: string;
  quantity: number;
  condition: string;
  brand: string;
  model: string;
  image: string;
  terms: string;
  ownerName: string;
  ownerId: string;
  status: string;
};
export const categories = [
  "Construction Equipment",
  "Photography Equipment",
  "Vehicles & Transportation",
  "Agriculture Equipment",
  "Electronics",
  "Event Equipment",
];
export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
