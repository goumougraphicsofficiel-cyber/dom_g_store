import { admin, categories, customers, orders, products, promotions, reviews } from '../data/store'
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
export const authService={login:(email:string,password:string)=>{if(email===admin.email&&password==='Admin123!')return admin;if(email==='client@domgstore.com'&&password==='Client123!')return customers[0];const users=customerService.list();return users.find(u=>u.email===email&&storage.get(`password:${u.id}`,'')===password)??null},register:(user:User,password:string)=>{customerService.save([...customerService.list(),user]);storage.set(`password:${user.id}`,password);return user}}
