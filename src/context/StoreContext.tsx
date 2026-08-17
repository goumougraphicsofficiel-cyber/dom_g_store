/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { authService, categoryService, customerService, orderService, productService, promotionService, reviewService } from '../services'
import { storage } from '../services/storage'
import type { Address, CartLine, Category, Order, Product, Promotion, Review, User } from '../types'

type StoreValue={products:Product[];setProducts:(v:Product[])=>void;categories:Category[];setCategories:(v:Category[])=>void;orders:Order[];setOrders:(v:Order[])=>void;customers:User[];setCustomers:(v:User[])=>void;reviews:Review[];setReviews:(v:Review[])=>void;promotions:Promotion[];setPromotions:(v:Promotion[])=>void;cart:CartLine[];favorites:string[];user:User|null;theme:'light'|'dark';addCart:(id:string,q?:number,color?:string,size?:string)=>void;updateCart:(id:string,q:number)=>void;removeCart:(id:string)=>void;clearCart:()=>void;toggleFavorite:(id:string)=>void;login:(e:string,p:string)=>boolean;register:(u:User,p:string)=>void;logout:()=>void;updateUser:(u:User)=>void;toggleTheme:()=>void;saveOrder:(o:Order)=>void}
const Ctx=createContext<StoreValue|null>(null)
export function StoreProvider({children}:{children:ReactNode}){
 const [products,setP]=useState(()=>productService.list()),[categories,setC]=useState(()=>categoryService.list()),[orders,setO]=useState(()=>orderService.list()),[customers,setCu]=useState(()=>customerService.list()),[reviews,setR]=useState(()=>reviewService.list()),[promotions,setPr]=useState(()=>promotionService.list())
 const [cart,setCart]=useState<CartLine[]>(()=>storage.get('cart',[])),[favorites,setFavorites]=useState<string[]>(()=>storage.get('favorites',[])),[user,setUser]=useState<User|null>(()=>storage.get('session',null)),[theme,setTheme]=useState<'light'|'dark'>(()=>storage.get('theme','light'))
 useEffect(()=>{document.documentElement.classList.toggle('dark',theme==='dark');storage.set('theme',theme)},[theme])
 useEffect(()=>storage.set('cart',cart),[cart]);useEffect(()=>storage.set('favorites',favorites),[favorites])
 const persist=<T,>(setter:(v:T[])=>void,service:{save:(v:T[])=>void})=>(v:T[])=>{setter(v);service.save(v)}
 const addCart=(id:string,q=1,color?:string,size?:string)=>{setCart(old=>{const hit=old.find(x=>x.productId===id&&x.color===color&&x.size===size);return hit?old.map(x=>x===hit?{...x,quantity:x.quantity+q}:x):[...old,{productId:id,quantity:q,color,size}]});toast.success('Produit ajouté au panier')}
 const updateCart=(id:string,q:number)=>setCart(old=>q<1?old.filter(x=>x.productId!==id):old.map(x=>x.productId===id?{...x,quantity:q}:x))
 const toggleFavorite=(id:string)=>setFavorites(old=>{const has=old.includes(id);toast.success(has?'Retiré des favoris':'Ajouté aux favoris');return has?old.filter(x=>x!==id):[...old,id]})
 const login=(e:string,p:string)=>{const u=authService.login(e,p);if(!u)return false;setUser(u);storage.set('session',u);return true}
 const register=(u:User,p:string)=>{authService.register(u,p);setCu(customerService.list());setUser(u);storage.set('session',u)}
 const logout=()=>{setUser(null);storage.remove('session');toast.success('Vous êtes déconnecté')}
 const updateUser=(u:User)=>{setUser(u);storage.set('session',u);const all=customers.map(x=>x.id===u.id?u:x);setCu(all);customerService.save(all)}
 const saveOrder=(o:Order)=>{const all=[o,...orders];setO(all);orderService.save(all);setCart([])}
 const value={products,setProducts:persist(setP,productService),categories,setCategories:persist(setC,categoryService),orders,setOrders:persist(setO,orderService),customers,setCustomers:persist(setCu,customerService),reviews,setReviews:persist(setR,reviewService),promotions,setPromotions:persist(setPr,promotionService),cart,favorites,user,theme,addCart,updateCart,removeCart:(id:string)=>setCart(x=>x.filter(v=>v.productId!==id)),clearCart:()=>setCart([]),toggleFavorite,login,register,logout,updateUser,toggleTheme:()=>setTheme(x=>x==='light'?'dark':'light'),saveOrder}
 return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useStore=()=>{const v=useContext(Ctx);if(!v)throw new Error('StoreProvider manquant');return v}
export const emptyAddress=():Address=>({id:'',firstName:'',lastName:'',phone:'',address:'',district:'',city:'Conakry',country:'Guinée',primary:false})
