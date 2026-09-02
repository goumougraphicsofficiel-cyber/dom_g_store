import type { Category, Order, Product, Promotion, User } from '../types'

// Sources locales volontairement vides. Elles pourront être remplacées par
// des adaptateurs Supabase sans modifier les composants consommateurs.
export const categories: Category[] = []
export const products: Product[] = []
export const customers: User[] = []
export const orders: Order[] = []
export const promotions: Promotion[] = []
