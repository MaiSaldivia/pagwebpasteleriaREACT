import type { Order } from "../types";

export const BASE_ORDERS: Order[] = [
  {
    id: "PED001",
    cliente: "Ana López",
    total: 25000,
    estado: "Pendiente",
    items: [
      { codigo: "P001", nombre: "Torta de Chocolate", qty: 1, price: 25000 }
    ]
  },
  {
    id: "PED002",
    cliente: "Juan Pérez",
    total: 18000,
    estado: "Enviado",
    items: [
      { codigo: "P003", nombre: "Pastel de Zanahoria", qty: 1, price: 18000 }
    ]
  },
  {
    id: "PED003",
    cliente: "Luis Ramírez",
    total: 32000,
    estado: "Pendiente",
    items: [
      { codigo: "P002", nombre: "Cheesecake Frutos Rojos", qty: 2, price: 16000 }
    ]
  }
];
