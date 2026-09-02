import { supabase } from '../lib/supabase'
import type { Address } from '../types'

type AddressRow={
 id:string
 user_id:string
 first_name:string
 last_name:string
 phone:string
 address_line:string
 district:string|null
 city:string
 country:string
 instructions:string|null
 is_default:boolean|null
 created_at:string
}

const columns='id, user_id, first_name, last_name, phone, address_line, district, city, country, instructions, is_default, created_at'

function mapAddress(row:AddressRow):Address{return {
 id:row.id,firstName:row.first_name,lastName:row.last_name,phone:row.phone,address:row.address_line,
 district:row.district??'',city:row.city,country:row.country,instructions:row.instructions??undefined,primary:row.is_default??false,
}}

async function currentUserId(){
 const {data,error}=await supabase.auth.getUser()
 if(error||!data.user)throw new Error('Votre session a expiré. Reconnectez-vous.')
 return data.user.id
}

function payload(address:Address){return {
 first_name:address.firstName.trim(),last_name:address.lastName.trim(),phone:address.phone.trim(),
 address_line:address.address.trim(),district:address.district.trim()||null,city:address.city.trim(),
 country:address.country.trim()||'Guinée',instructions:address.instructions?.trim()||null,is_default:address.primary,
}}

export const supabaseAddressService={
 async listOwn():Promise<Address[]>{
  const userId=await currentUserId()
  const {data,error}=await supabase.from('addresses').select(columns).eq('user_id',userId).order('is_default',{ascending:false}).order('created_at',{ascending:true})
  if(error)throw error
  return ((data??[]) as AddressRow[]).map(mapAddress)
 },
 async create(address:Address):Promise<Address>{
  const userId=await currentUserId()
  if(address.primary)await this.clearDefault(userId)
  const {data,error}=await supabase.from('addresses').insert({user_id:userId,...payload(address)}).select(columns).single()
  if(error)throw error
  return mapAddress(data as AddressRow)
 },
 async update(address:Address):Promise<Address>{
  const userId=await currentUserId()
  if(address.primary)await this.clearDefault(userId)
  const {data,error}=await supabase.from('addresses').update(payload(address)).eq('id',address.id).eq('user_id',userId).select(columns).single()
  if(error)throw error
  return mapAddress(data as AddressRow)
 },
 async remove(id:string):Promise<void>{
  const userId=await currentUserId()
  const {error}=await supabase.from('addresses').delete().eq('id',id).eq('user_id',userId)
  if(error)throw error
 },
 async setDefault(id:string):Promise<void>{
  const userId=await currentUserId()
  await this.clearDefault(userId)
  const {error}=await supabase.from('addresses').update({is_default:true}).eq('id',id).eq('user_id',userId)
  if(error)throw error
 },
 async clearDefault(userId:string):Promise<void>{
  const {error}=await supabase.from('addresses').update({is_default:false}).eq('user_id',userId).eq('is_default',true)
  if(error)throw error
 },
}
