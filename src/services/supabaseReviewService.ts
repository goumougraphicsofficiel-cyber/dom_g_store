import { supabase } from '../lib/supabase'
import type { Review } from '../types'

type ReviewRow={id:string;user_id:string;product_id:string;rating:number;title:string;comment:string;status:string;created_at:string;updated_at:string}
const columns='id, user_id, product_id, rating, title, comment, status, created_at, updated_at'

function mapReview(row:ReviewRow,customer='Client Dom G'):Review{return {id:row.id,productId:row.product_id,customerId:row.user_id,customer,rating:row.rating,title:row.title,comment:row.comment,date:row.created_at.slice(0,10),status:row.status}}
async function currentUser(){const {data,error}=await supabase.auth.getUser();if(error||!data.user)throw new Error('Votre session a expiré. Reconnectez-vous.');return data.user}

export const supabaseReviewService={
 async listPublic():Promise<Review[]>{
  const {data,error}=await supabase.from('reviews').select(columns).eq('status','approuvé').order('created_at',{ascending:false})
  if(error)throw error
  return ((data??[]) as ReviewRow[]).map(row=>mapReview(row))
 },
 async listOwn(customerName:string):Promise<Review[]>{
  const user=await currentUser()
  const {data,error}=await supabase.from('reviews').select(columns).eq('user_id',user.id).order('created_at',{ascending:false})
  if(error)throw error
  return ((data??[]) as ReviewRow[]).map(row=>mapReview(row,customerName))
 },
 async create(input:Pick<Review,'productId'|'rating'|'title'|'comment'>,customerName:string):Promise<Review>{
  const user=await currentUser()
  const {data,error}=await supabase.from('reviews').insert({user_id:user.id,product_id:input.productId,rating:input.rating,title:input.title.trim(),comment:input.comment.trim()}).select(columns).single()
  if(error)throw error
  return mapReview(data as ReviewRow,customerName)
 },
 async update(review:Review):Promise<Review>{
  const user=await currentUser()
  const {data,error}=await supabase.from('reviews').update({rating:review.rating,title:review.title.trim(),comment:review.comment.trim(),updated_at:new Date().toISOString()}).eq('id',review.id).eq('user_id',user.id).select(columns).single()
  if(error)throw error
  return mapReview(data as ReviewRow,review.customer)
 },
 async removeOwn(id:string):Promise<void>{const user=await currentUser();const {error}=await supabase.from('reviews').delete().eq('id',id).eq('user_id',user.id);if(error)throw error},
 async listAll():Promise<Review[]>{const {data,error}=await supabase.from('reviews').select(columns).order('created_at',{ascending:false});if(error)throw error;return ((data??[]) as ReviewRow[]).map(row=>mapReview(row))},
 async setStatus(id:string,status:string):Promise<void>{const {error}=await supabase.from('reviews').update({status,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error},
 async removeAsAdmin(id:string):Promise<void>{const {error}=await supabase.from('reviews').delete().eq('id',id);if(error)throw error},
}
