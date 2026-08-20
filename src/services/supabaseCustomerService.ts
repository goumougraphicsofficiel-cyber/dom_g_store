import { supabase } from '../lib/supabase'

type CustomerProfileRow = { id:string; first_name:string|null; last_name:string|null; phone:string|null; avatar_url:string|null; role:string; status:string; created_at:string; updated_at:string }
export type AdminCustomerProfile = { id:string; firstName:string; lastName:string; phone:string; avatarUrl:string; status:string; createdAt:string; updatedAt:string }

function mapProfile(row:CustomerProfileRow):AdminCustomerProfile{return {id:row.id,firstName:row.first_name??'',lastName:row.last_name??'',phone:row.phone??'',avatarUrl:row.avatar_url??'',status:row.status,createdAt:row.created_at,updatedAt:row.updated_at}}

export const supabaseCustomerService={async listClients():Promise<AdminCustomerProfile[]>{const {data,error}=await supabase.from('profiles').select('id, first_name, last_name, phone, avatar_url, role, status, created_at, updated_at').eq('role','client').order('created_at',{ascending:false});if(error)throw error;return ((data??[]) as CustomerProfileRow[]).map(mapProfile)}}
