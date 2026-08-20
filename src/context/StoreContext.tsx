/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { AuthenticationError, fetchProfile, signIn, signOut } from '../services/authService'
import { customerService, orderService, promotionService, reviewService } from '../services'
import { storefrontProductService } from '../services/storefrontProductService'
import { supabaseCategoryService } from '../services/supabaseCategoryService'
import { storage } from '../services/storage'
import type { Address, AuthProfile, CartLine, Category, Order, Product, Promotion, Review, User } from '../types'

type StoreValue={
 products:Product[];setProducts:(v:Product[])=>void
 categories:Category[];setCategories:(v:Category[])=>void
 catalogLoading:boolean;catalogError:string|null
 orders:Order[];setOrders:(v:Order[])=>void
 customers:User[];setCustomers:(v:User[])=>void
 reviews:Review[];setReviews:(v:Review[])=>void
 promotions:Promotion[];setPromotions:(v:Promotion[])=>void
 cart:CartLine[];favorites:string[];user:User|null
 authUser:SupabaseUser|null;profile:AuthProfile|null;authLoading:boolean;authError:string|null
 theme:'light'|'dark'
 addCart:(id:string,q?:number,color?:string,size?:string)=>void
 updateCart:(id:string,q:number)=>void;removeCart:(id:string)=>void;clearCart:()=>void
 toggleFavorite:(id:string)=>void
 login:(email:string,password:string)=>Promise<AuthProfile>
 register:()=>Promise<void>
 logout:()=>Promise<void>;updateUser:(u:User)=>void;toggleTheme:()=>void;saveOrder:(o:Order)=>void
}

const Ctx=createContext<StoreValue|null>(null)

function toAppUser(authUser:SupabaseUser,profile:AuthProfile):User{
 return {
  id:profile.id,
  firstName:profile.first_name??'',
  lastName:profile.last_name??'',
  email:authUser.email??'',
  phone:profile.phone??'',
  role:profile.role==='admin'?'admin':'client',
  avatar:profile.avatar_url??undefined,
  addresses:[],
  active:profile.status==='actif',
  joinedAt:authUser.created_at.slice(0,10),
 }
}

export function StoreProvider({children}:{children:ReactNode}){
 const [products,setP]=useState<Product[]>([]),[categories,setC]=useState<Category[]>([]),[orders,setO]=useState(()=>orderService.list()),[customers,setCu]=useState(()=>customerService.list()),[reviews,setR]=useState(()=>reviewService.list()),[promotions,setPr]=useState(()=>promotionService.list())
 const [catalogLoading,setCatalogLoading]=useState(true),[catalogError,setCatalogError]=useState<string|null>(null)
 const [cart,setCart]=useState<CartLine[]>(()=>storage.get('cart',[])),[favorites,setFavorites]=useState<string[]>(()=>storage.get('favorites',[])),[theme,setTheme]=useState<'light'|'dark'>(()=>storage.get('theme','light'))
 const [authUser,setAuthUser]=useState<SupabaseUser|null>(null),[profile,setProfile]=useState<AuthProfile|null>(null),[user,setUser]=useState<User|null>(null),[authLoading,setAuthLoading]=useState(true),[authError,setAuthError]=useState<string|null>(null)

 useEffect(()=>{document.documentElement.classList.toggle('dark',theme==='dark');storage.set('theme',theme)},[theme])
 useEffect(()=>storage.set('cart',cart),[cart])
 useEffect(()=>storage.set('favorites',favorites),[favorites])

 useEffect(()=>{
  let active=true
  void Promise.all([storefrontProductService.list(),supabaseCategoryService.list()])
   .then(([nextProducts,nextCategories])=>{
    if(!active)return
    setP(nextProducts)
    setC(nextCategories.filter(category=>category.active))
    setCatalogError(null)
   })
   .catch(error=>{
    if(!active)return
    console.error('Impossible de charger le catalogue public depuis Supabase.',error)
    setCatalogError(error instanceof Error?error.message:'Impossible de charger le catalogue.')
   })
   .finally(()=>{if(active)setCatalogLoading(false)})
  return()=>{active=false}
 },[])

 const applyAuthenticatedUser=useCallback(async(nextUser:SupabaseUser|null)=>{
  if(!nextUser){setAuthUser(null);setProfile(null);setUser(null);setAuthError(null);setAuthLoading(false);return}
  setAuthLoading(true);setAuthUser(nextUser);setAuthError(null)
  try{
   const nextProfile=await fetchProfile(nextUser.id)
   setProfile(nextProfile)
   setUser(toAppUser(nextUser,nextProfile))
  }catch(error){
   setProfile(null);setUser(null)
   setAuthError(error instanceof Error?error.message:'Impossible de charger le profil.')
  }finally{setAuthLoading(false)}
 },[])

 useEffect(()=>{
  let active=true
  void supabase.auth.getSession().then(({data,error})=>{
   if(!active)return
   if(error){setAuthError('Impossible de restaurer la session.');setAuthLoading(false);return}
   void applyAuthenticatedUser(data.session?.user??null)
  })
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
   if(active)void applyAuthenticatedUser(session?.user??null)
  })
  return()=>{active=false;subscription.unsubscribe()}
 },[applyAuthenticatedUser])

 const persist=<T,>(setter:(v:T[])=>void,service:{save:(v:T[])=>void})=>(v:T[])=>{setter(v);service.save(v)}
 const addCart=(id:string,q=1,color?:string,size?:string)=>{const product=products.find(item=>item.id===id);if(!product)return toast.error('Ce produit est introuvable.');if(product.stock<=0)return toast.error('Ce produit est en rupture de stock.');const requested=Math.max(1,Math.floor(q)),inCart=cart.filter(line=>line.productId===id).reduce((total,line)=>total+line.quantity,0),available=product.stock-inCart;if(available<=0)return toast.error('Le stock disponible est déjà dans votre panier.');const added=Math.min(requested,available);setCart(old=>{const hit=old.find(x=>x.productId===id&&x.color===color&&x.size===size);return hit?old.map(x=>x===hit?{...x,quantity:x.quantity+added}:x):[...old,{productId:id,quantity:added,color,size}]});toast.success(added<requested?`Quantité ajustée au stock disponible (${product.stock}).`:'Produit ajouté au panier')}
 const updateCart=(id:string,q:number)=>{const product=products.find(item=>item.id===id);if(!product||product.stock<=0){setCart(old=>old.filter(line=>line.productId!==id));toast.error('Ce produit est en rupture de stock.');return}const quantity=Math.min(Math.floor(q),product.stock);setCart(old=>quantity<1?old.filter(x=>x.productId!==id):old.map(x=>x.productId===id?{...x,quantity}:x));if(q>product.stock)toast.error(`La quantité maximale disponible est ${product.stock}.`)}
 const toggleFavorite=(id:string)=>setFavorites(old=>{const has=old.includes(id);toast.success(has?'Retiré des favoris':'Ajouté aux favoris');return has?old.filter(x=>x!==id):[...old,id]})
 const login=async(email:string,password:string)=>{const result=await signIn(email,password);setAuthUser(result.user);setProfile(result.profile);setUser(toAppUser(result.user,result.profile));setAuthError(null);return result.profile}
 const register=async()=>{throw new AuthenticationError('L’inscription publique n’est pas encore disponible.','unknown')}
 const logout=async()=>{try{await signOut()}catch(error){toast.error(error instanceof Error?error.message:'La déconnexion a échoué.')}finally{setAuthUser(null);setProfile(null);setUser(null);setAuthError(null)}toast.success('Vous êtes déconnecté')}
 const updateUser=(nextUser:User)=>{setUser(nextUser);const all=customers.map(x=>x.id===nextUser.id?nextUser:x);setCu(all);customerService.save(all)}
 const saveOrder=(order:Order)=>{const all=[order,...orders];setO(all);orderService.save(all);setCart([])}
 const value={products,setProducts:setP,categories,setCategories:setC,catalogLoading,catalogError,orders,setOrders:persist(setO,orderService),customers,setCustomers:persist(setCu,customerService),reviews,setReviews:persist(setR,reviewService),promotions,setPromotions:persist(setPr,promotionService),cart,favorites,user,authUser,profile,authLoading,authError,theme,addCart,updateCart,removeCart:(id:string)=>setCart(x=>x.filter(v=>v.productId!==id)),clearCart:()=>setCart([]),toggleFavorite,login,register,logout,updateUser,toggleTheme:()=>setTheme(x=>x==='light'?'dark':'light'),saveOrder}
 return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useStore=()=>{const value=useContext(Ctx);if(!value)throw new Error('StoreProvider manquant');return value}
export const emptyAddress=():Address=>({id:'',firstName:'',lastName:'',phone:'',address:'',district:'',city:'Conakry',country:'Guinée',primary:false})
