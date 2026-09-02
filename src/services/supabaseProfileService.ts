import { supabase } from '../lib/supabase'
import type { AuthProfile } from '../types'

export type ProfileUpdate={
 firstName:string
 lastName:string
 phone:string
 avatarUrl?:string
}

const profileColumns='id, first_name, last_name, phone, avatar_url, role, status'

export const supabaseProfileService={
 async updateOwn(input:ProfileUpdate):Promise<AuthProfile>{
  const {data:authData,error:authError}=await supabase.auth.getUser()
  if(authError||!authData.user)throw new Error('Votre session a expiré. Reconnectez-vous.')
  const {data,error}=await supabase.from('profiles').update({
   first_name:input.firstName.trim(),
   last_name:input.lastName.trim(),
   phone:input.phone.trim(),
   avatar_url:input.avatarUrl?.trim()||null,
   updated_at:new Date().toISOString(),
  }).eq('id',authData.user.id).select(profileColumns).single<AuthProfile>()
  if(error)throw error
  return data
 },
}
