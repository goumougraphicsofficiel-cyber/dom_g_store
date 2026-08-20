export type Category = { id:string; name:string; slug:string; description:string; image:string; active:boolean; productCount?:number }
export type Product = { id:string; reference:string; name:string; slug:string; category:string; categoryName?:string; brand:string; description:string; details:string; price:number; oldPrice?:number; cost?:number; stock:number; alertStock:number; image:string; images:string[]; rating:number; reviews:number; featured?:boolean; isNew?:boolean; colors?:string[]; sizes?:string[]; specs:Record<string,string>; active:boolean }
export type CartLine = { productId:string; quantity:number; color?:string; size?:string }
export type Address = { id:string; firstName:string; lastName:string; phone:string; address:string; district:string; city:string; country:string; instructions?:string; primary:boolean }
export type User = { id:string; firstName:string; lastName:string; email:string; phone:string; role:'client'|'admin'; avatar?:string; birthDate?:string; addresses:Address[]; active:boolean; joinedAt:string }
export type OrderStatus = 'en attente'|'confirmée'|'en préparation'|'expédiée'|'livrée'|'annulée'|'remboursée'
export type Order = { id:string; customerId:string; customerName:string; date:string; items:CartLine[]; subtotal:number; discount:number; shipping:number; total:number; payment:string; delivery:string; status:OrderStatus; address:Address; tracking:string }
export type Review = { id:string; productId:string; customerId:string; customer:string; rating:number; title:string; comment:string; date:string; status:'approuvé'|'masqué' }
export type Promotion = { id:string; code:string; type:'pourcentage'|'fixe'|'flash'; value:number; min:number; start:string; end:string; limit:number; active:boolean }
export type ProfileRole = 'admin' | 'client' | string
export type ProfileStatus = 'actif' | 'inactif' | string
export type AuthProfile = {
 id:string
 first_name:string|null
 last_name:string|null
 phone:string|null
 avatar_url:string|null
 role:ProfileRole
 status:ProfileStatus
}
export type AuthState = {
 profile:AuthProfile|null
 loading:boolean
 error:string|null
}
