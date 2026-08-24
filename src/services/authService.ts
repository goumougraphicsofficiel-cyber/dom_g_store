import type { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { AuthProfile } from '../types'
import { notifyPasswordReset } from './smsNotificationService'

export class AuthenticationError extends Error {
  readonly code:'invalid_credentials'|'profile_missing'|'inactive'|'network'|'signup'|'recovery'|'unknown'

  constructor(
    message:string,
    code:'invalid_credentials'|'profile_missing'|'inactive'|'network'|'signup'|'recovery'|'unknown',
  ) {
    super(message)
    this.name='AuthenticationError'
    this.code=code
  }
}

export type ClientRegistrationInput={
 email:string
 password:string
 firstName:string
 lastName:string
 phone:string
}

export type ClientRegistrationResult={
 user:SupabaseUser
 profile:AuthProfile|null
 confirmationRequired:boolean
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

export async function signUpClient(input:ClientRegistrationInput):Promise<ClientRegistrationResult>{
 const {data,error}=await supabase.auth.signUp({
  email:input.email.trim().toLowerCase(),
  password:input.password,
  options:{
   emailRedirectTo:`${window.location.origin}/connexion`,
   data:{
    first_name:input.firstName.trim(),
    last_name:input.lastName.trim(),
    phone:input.phone.trim(),
   },
  },
 })
 if(error){
  const network=isNetworkError(error.message)
  throw new AuthenticationError(
   network?'Impossible de joindre Supabase. Vérifiez votre connexion.':error.message.toLowerCase().includes('already registered')?'Un compte existe déjà avec cette adresse e-mail.':'Impossible de créer le compte. Vérifiez les informations saisies.',
   network?'network':'signup',
  )
 }
 if(!data.user)throw new AuthenticationError('Supabase n’a pas retourné le compte créé.','signup')
 if(!data.session)return {user:data.user,profile:null,confirmationRequired:true}
 return {user:data.user,profile:await fetchProfile(data.user.id),confirmationRequired:false}
}

export async function requestPasswordReset(email:string):Promise<void>{
 const {error}=await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(),{
  redirectTo:`${window.location.origin}/reinitialiser-mot-de-passe`,
 })
 if(error)throw new AuthenticationError(isNetworkError(error.message)?'Impossible de joindre Supabase. Vérifiez votre connexion.':'Impossible d’envoyer le lien de réinitialisation.','recovery')
}

export async function updatePassword(password:string):Promise<{smsSent:boolean}>{
 const {error}=await supabase.auth.updateUser({password})
 if(error)throw new AuthenticationError(error.message.toLowerCase().includes('session')?'Le lien de réinitialisation est invalide ou a expiré.':'Impossible de modifier le mot de passe.','recovery')
 try{
  await notifyPasswordReset()
  return {smsSent:true}
 }catch{
  return {smsSent:false}
 }
}

export async function signOut():Promise<void>{
 const {error}=await supabase.auth.signOut()
 if(error)throw new AuthenticationError('La déconnexion a échoué. Réessayez.','unknown')
}
