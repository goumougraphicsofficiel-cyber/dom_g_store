import type { Category, Order, Product, Promotion, Review, User } from '../types'

// Sources locales volontairement vides. Elles pourront être remplacées par
// des adaptateurs Supabase sans modifier les composants consommateurs.
export const categories: Category[] = []
export const products: Product[] = []
export const customers: User[] = []
export const orders: Order[] = []
export const reviews: Review[] = []
export const promotions: Promotion[] = []
