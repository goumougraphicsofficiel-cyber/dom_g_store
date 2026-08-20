import type { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { AuthProfile } from '../types'

export class AuthenticationError extends Error {
  readonly code:'invalid_credentials'|'profile_missing'|'inactive'|'network'|'unknown'

  constructor(
    message:string,
    code:'invalid_credentials'|'profile_missing'|'inactive'|'network'|'unknown',
  ) {
    super(message)
    this.name='AuthenticationError'
    this.code=code
  }
}

const isNetworkError=(message:string)=>/fetch|network|connexion|timeout/i.test(message)

export async function fetchProfile(userId:string):Promise<AuthProfile>{
 const {data,error}=await supabase
  .from('profiles')
  .select('id, first_name, last_name, phone, avatar_url, role, status')
  .eq('id',userId)
  .maybeSingle<AuthProfile>()

 if(error){
  throw new AuthenticationError(
   isNetworkError(error.message)?'Impossible de joindre le service. Vérifiez votre connexion.':'Impossible de charger votre profil.',
   isNetworkError(error.message)?'network':'unknown',
  )
 }
 if(!data)throw new AuthenticationError('Aucun profil applicatif n’est associé à ce compte.','profile_missing')
 return data
}

export async function signIn(email:string,password:string):Promise<{user:SupabaseUser;profile:AuthProfile}>{
 const {data,error}=await supabase.auth.signInWithPassword({email,password})
 if(error){
  const network=isNetworkError(error.message)
  throw new AuthenticationError(
   network?'Impossible de joindre Supabase. Vérifiez votre connexion.':'Adresse e-mail ou mot de passe incorrect.',
   network?'network':'invalid_credentials',
  )
 }
 if(!data.user)throw new AuthenticationError('Utilisateur introuvable.','invalid_credentials')
 try{
  const profile=await fetchProfile(data.user.id)
  if(profile.status!=='actif'){
   await supabase.auth.signOut()
   throw new AuthenticationError('Ce compte est désactivé. Contactez un administrateur.','inactive')
  }
  return {user:data.user,profile}
 }catch(error){
  if(error instanceof AuthenticationError&&error.code!=='inactive')await supabase.auth.signOut()
  throw error
 }
}

export async function signOut():Promise<void>{
 const {error}=await supabase.auth.signOut()
 if(error)throw new AuthenticationError('La déconnexion a échoué. Réessayez.','unknown')
}
