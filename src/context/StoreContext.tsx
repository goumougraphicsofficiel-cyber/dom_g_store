/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { fetchProfile, signIn, signOut, signUpClient, type ClientRegistrationInput, type ClientRegistrationResult } from '../services/authService'
import { customerService, orderService, promotionService } from '../services'
import { storefrontProductService } from '../services/storefrontProductService'
import { supabaseCategoryService } from '../services/supabaseCategoryService'
import { supabaseAddressService } from '../services/supabaseAddressService'
import { supabaseProfileService, type ProfileUpdate } from '../services/supabaseProfileService'
import { supabaseReviewService } from '../services/supabaseReviewService'
import { storage } from '../services/storage'
import type { Address, AuthProfile, CartLine, Category, Order, Product, Promotion, Review, User } from '../types'

type StoreValue={
 products:Product[];setProducts:(v:Product[])=>void
 categories:Category[];setCategories:(v:Category[])=>void
 catalogLoading:boolean;catalogError:string|null
 orders:Order[];setOrders:(v:Order[])=>void
 customers:User[];setCustomers:(v:User[])=>void
 reviews:Review[]
 promotions:Promotion[];setPromotions:(v:Promotion[])=>void
 cart:CartLine[];favorites:string[];user:User|null
 authUser:SupabaseUser|null;profile:AuthProfile|null;authLoading:boolean;authError:string|null
 addressesLoading:boolean;addressesError:string|null
 theme:'light'|'dark'
 addCart:(id:string,q?:number,color?:string,size?:string)=>void
 updateCart:(id:string,q:number,color?:string,size?:string)=>void
 removeCart:(id:string,color?:string,size?:string)=>void
 clearCart:()=>void
 toggleFavorite:(id:string)=>void
 login:(email:string,password:string)=>Promise<AuthProfile>
 register:(input:ClientRegistrationInput)=>Promise<ClientRegistrationResult>
 logout:()=>Promise<void>;updateUser:(u:User)=>void;updateProfile:(input:ProfileUpdate)=>Promise<void>
 saveAddress:(address:Address)=>Promise<Address>;deleteAddress:(id:string)=>Promise<void>;setPrimaryAddress:(id:string)=>Promise<void>
 toggleTheme:()=>void;saveOrder:(o:Order)=>void
}

const Ctx=createContext<StoreValue|null>(null)

const sameCartLine=(line:CartLine,id:string,color?:string,size?:string)=>line.productId===id&&line.color===color&&line.size===size

function normalizeCart(lines:CartLine[],products:Product[]){
 const remaining=new Map(products.map(product=>[product.id,Math.max(0,Math.floor(product.stock))]))
 return lines.flatMap(line=>{
  const available=remaining.get(line.productId)??0
  const requested=Number.isFinite(line.quantity)?Math.max(0,Math.floor(line.quantity)):0
  const quantity=Math.min(requested,available)
  if(quantity<=0)return []
  remaining.set(line.productId,available-quantity)
  return [{...line,quantity}]
 })
}

const favoritesKey=(userId:string|null)=>userId?`favorites:${userId}`:'favorites:guest'

function toAppUser(authUser:SupabaseUser,profile:AuthProfile,addresses:Address[]=[]):User{
 return {
  id:profile.id,
  firstName:profile.first_name??'',
  lastName:profile.last_name??'',
  email:authUser.email??'',
  phone:profile.phone??'',
  role:profile.role==='admin'?'admin':'client',
  avatar:profile.avatar_url??undefined,
  addresses,
  active:profile.status==='actif',
  joinedAt:authUser.created_at.slice(0,10),
 }
}

export function StoreProvider({children}:{children:ReactNode}){
 const [products,setP]=useState<Product[]>([]),[categories,setC]=useState<Category[]>([]),[orders,setO]=useState(()=>orderService.list()),[customers,setCu]=useState(()=>customerService.list()),[reviews,setR]=useState<Review[]>([]),[promotions,setPr]=useState(()=>promotionService.list())
 const [catalogLoading,setCatalogLoading]=useState(true),[catalogError,setCatalogError]=useState<string|null>(null)
 const [cart,setCart]=useState<CartLine[]>(()=>storage.get('cart',[])),[favorites,setFavorites]=useState<string[]>(()=>storage.get(favoritesKey(null),storage.get('favorites',[]))),[theme,setTheme]=useState<'light'|'dark'>(()=>storage.get('theme','light'))
 const favoritesOwner=useRef<string|null>(null)
 const [authUser,setAuthUser]=useState<SupabaseUser|null>(null),[profile,setProfile]=useState<AuthProfile|null>(null),[user,setUser]=useState<User|null>(null),[authLoading,setAuthLoading]=useState(true),[authError,setAuthError]=useState<string|null>(null)
 const [addressesLoading,setAddressesLoading]=useState(false),[addressesError,setAddressesError]=useState<string|null>(null)

 useEffect(()=>{document.documentElement.classList.toggle('dark',theme==='dark');storage.set('theme',theme)},[theme])
 useEffect(()=>storage.set('cart',cart),[cart])
 useEffect(()=>storage.set(favoritesKey(favoritesOwner.current),favorites),[favorites])

 useEffect(()=>{
  let active=true
  void Promise.all([storefrontProductService.list(),supabaseCategoryService.list()])
   .then(([nextProducts,nextCategories])=>{
    if(!active)return
    setP(nextProducts)
    setCart(current=>normalizeCart(current,nextProducts))
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

 useEffect(()=>{let active=true;void supabaseReviewService.listPublic().then(rows=>{if(active)setR(rows)}).catch(error=>{console.error('Impossible de charger les avis publics depuis Supabase.',error)});return()=>{active=false}},[])

 const applyAuthenticatedUser=useCallback(async(nextUser:SupabaseUser|null)=>{
  const nextOwner=nextUser?.id??null
  favoritesOwner.current=nextOwner
  setFavorites(storage.get(favoritesKey(nextOwner),nextOwner?[]:storage.get('favorites',[])))
  if(!nextUser){setAuthUser(null);setProfile(null);setUser(null);setAuthError(null);setAddressesError(null);setAuthLoading(false);return}
  setAuthLoading(true);setAuthUser(nextUser);setAuthError(null)
  try{
   const nextProfile=await fetchProfile(nextUser.id)
   setAddressesLoading(true)
   let addresses:Address[]=[]
   try{addresses=await supabaseAddressService.listOwn();setAddressesError(null)}catch(error){setAddressesError(error instanceof Error?error.message:'Impossible de charger vos adresses.')}
   setProfile(nextProfile)
   setUser(toAppUser(nextUser,nextProfile,addresses))
  }catch(error){
   setProfile(null);setUser(null)
   setAuthError(error instanceof Error?error.message:'Impossible de charger le profil.')
  }finally{setAddressesLoading(false);setAuthLoading(false)}
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
 const addCart=(id:string,q=1,color?:string,size?:string)=>{const product=products.find(item=>item.id===id);if(!product)return toast.error('Ce produit est introuvable.');if(product.stock<=0)return toast.error('Produit actuellement indisponible.');const requested=Math.max(1,Math.floor(q)),inCart=cart.filter(line=>line.productId===id).reduce((total,line)=>total+line.quantity,0),available=product.stock-inCart;if(available<=0)return toast.error('Stock maximum atteint.');const added=Math.min(requested,available);setCart(old=>{const hit=old.find(line=>sameCartLine(line,id,color,size));return hit?old.map(line=>line===hit?{...line,quantity:line.quantity+added}:line):[...old,{productId:id,quantity:added,color,size}]});if(added<requested)toast.warning(`Stock maximum atteint : ${product.stock} disponible${product.stock>1?'s':''}.`);else toast.success('Produit ajouté au panier.')}
 const updateCart=(id:string,q:number,color?:string,size?:string)=>{const product=products.find(item=>item.id===id);if(!product||product.stock<=0){setCart(old=>old.filter(line=>line.productId!==id));toast.error('Produit actuellement indisponible.');return}const requested=Math.floor(q);if(requested<1){setCart(old=>old.filter(line=>!sameCartLine(line,id,color,size)));toast.success('Produit retiré.');return}const reservedByOtherLines=cart.filter(line=>line.productId===id&&!sameCartLine(line,id,color,size)).reduce((total,line)=>total+line.quantity,0),available=Math.max(0,product.stock-reservedByOtherLines),quantity=Math.min(requested,available);if(quantity<1){toast.error('Stock maximum atteint.');return}setCart(old=>old.map(line=>sameCartLine(line,id,color,size)?{...line,quantity}:line));if(requested>available)toast.warning(`Stock maximum atteint : ${product.stock} disponible${product.stock>1?'s':''}.`);else toast.success('Quantité mise à jour.')}
 const removeCart=(id:string,color?:string,size?:string)=>{setCart(old=>old.filter(line=>!sameCartLine(line,id,color,size)));toast.success('Produit retiré.')}
 const clearCart=()=>{if(!cart.length)return;setCart([]);toast.success('Panier vidé.')}
 const toggleFavorite=(id:string)=>setFavorites(old=>{const has=old.includes(id);toast.success(has?'Retiré des favoris':'Ajouté aux favoris');return has?old.filter(x=>x!==id):[...old,id]})
 const login=async(email:string,password:string)=>{const result=await signIn(email,password);favoritesOwner.current=result.user.id;setFavorites(storage.get(favoritesKey(result.user.id),[]));setAuthUser(result.user);setProfile(result.profile);setUser(toAppUser(result.user,result.profile));setAuthError(null);return result.profile}
 const register=async(input:ClientRegistrationInput)=>{const result=await signUpClient(input);if(result.profile){favoritesOwner.current=result.user.id;setFavorites(storage.get(favoritesKey(result.user.id),[]));setAuthUser(result.user);setProfile(result.profile);setUser(toAppUser(result.user,result.profile));setAuthError(null)}return result}
 const logout=async()=>{try{await signOut()}catch(error){toast.error(error instanceof Error?error.message:'La déconnexion a échoué.')}finally{favoritesOwner.current=null;setFavorites(storage.get(favoritesKey(null),storage.get('favorites',[])));setAuthUser(null);setProfile(null);setUser(null);setAuthError(null)}toast.success('Vous êtes déconnecté')}
 const updateUser=(nextUser:User)=>{setUser(nextUser);const all=customers.map(x=>x.id===nextUser.id?nextUser:x);setCu(all);customerService.save(all)}
 const updateProfile=async(input:ProfileUpdate)=>{const nextProfile=await supabaseProfileService.updateOwn(input);setProfile(nextProfile);setUser(current=>current?{...current,firstName:nextProfile.first_name??'',lastName:nextProfile.last_name??'',phone:nextProfile.phone??'',avatar:nextProfile.avatar_url??undefined}:current)}
 const saveAddress=async(address:Address)=>{const saved=address.id?await supabaseAddressService.update(address):await supabaseAddressService.create(address);setUser(current=>{if(!current)return current;const next=current.addresses.some(item=>item.id===saved.id)?current.addresses.map(item=>item.id===saved.id?saved:item):[...current.addresses,saved];return {...current,addresses:saved.primary?next.map(item=>({...item,primary:item.id===saved.id})):next}});return saved}
 const deleteAddress=async(id:string)=>{await supabaseAddressService.remove(id);setUser(current=>current?{...current,addresses:current.addresses.filter(item=>item.id!==id)}:current)}
 const setPrimaryAddress=async(id:string)=>{await supabaseAddressService.setDefault(id);setUser(current=>current?{...current,addresses:current.addresses.map(item=>({...item,primary:item.id===id}))}:current)}
 const saveOrder=(order:Order)=>{const all=[order,...orders];setO(all);orderService.save(all);setCart([])}
 const value={products,setProducts:setP,categories,setCategories:setC,catalogLoading,catalogError,orders,setOrders:persist(setO,orderService),customers,setCustomers:persist(setCu,customerService),reviews,promotions,setPromotions:persist(setPr,promotionService),cart,favorites,user,authUser,profile,authLoading,authError,addressesLoading,addressesError,theme,addCart,updateCart,removeCart,clearCart,toggleFavorite,login,register,logout,updateUser,updateProfile,saveAddress,deleteAddress,setPrimaryAddress,toggleTheme:()=>setTheme(x=>x==='light'?'dark':'light'),saveOrder}
 return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useStore=()=>{const value=useContext(Ctx);if(!value)throw new Error('StoreProvider manquant');return value}
export const emptyAddress=():Address=>({id:'',firstName:'',lastName:'',phone:'',address:'',district:'',city:'Conakry',country:'Guinée',primary:false})
