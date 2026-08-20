import { categories, customers, orders, products, promotions, reviews } from '../data/store'
import type { Category, Order, Product, Promotion, Review, User } from '../types'
import { storage } from './storage'
const resource=<T>(key:string,seed:T[])=>({list:()=>storage.get<T[]>(key,seed),save:(items:T[])=>storage.set(key,items),reset:()=>storage.set(key,seed)})
export const productService=resource<Product>('products',products)
export const categoryService=resource<Category>('categories',categories)
export const orderService=resource<Order>('orders',orders)
export const customerService=resource<User>('customers',customers)
export const reviewService=resource<Review>('reviews',reviews)
export const promotionService=resource<Promotion>('promotions',promotions)
export const cartService={get:()=>storage.get('cart',[]),save:(v:unknown)=>storage.set('cart',v)}
