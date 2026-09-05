import type { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { AuthProfile } from '../types'
import { notifyPasswordReset } from './smsNotificationService'

export class AuthenticationError extends Error {
  readonly code:'invalid_credentials'|'email_not_confirmed'|'profile_missing'|'inactive'|'network'|'signup'|'rate_limit'|'recovery'|'unknown'

  constructor(
    message:string,
    code:'invalid_credentials'|'email_not_confirmed'|'profile_missing'|'inactive'|'network'|'signup'|'rate_limit'|'recovery'|'unknown',
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
const authRedirectUrl=(path:string)=>new URL(path,window.location.origin).toString()
const isEmailRateLimitError=(code:string|undefined,message:string)=>code==='over_email_send_rate_limit'||/rate limit|too many requests|email rate/i.test(message)

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
  const emailNotConfirmed=error.code==='email_not_confirmed'||/email not confirmed/i.test(error.message)
  throw new AuthenticationError(
   network?'Impossible de joindre Supabase. Vérifiez votre connexion.':emailNotConfirmed?'Confirmez votre adresse e-mail avant de vous connecter.':'Adresse e-mail ou mot de passe incorrect.',
   network?'network':emailNotConfirmed?'email_not_confirmed':'invalid_credentials',
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
   emailRedirectTo:authRedirectUrl('/connexion'),
   data:{
    first_name:input.firstName.trim(),
    last_name:input.lastName.trim(),
    phone:input.phone.trim(),
   },
  },
 })
 if(error){
  const network=isNetworkError(error.message)
  const rateLimited=isEmailRateLimitError(error.code,error.message)
  throw new AuthenticationError(
   network?'Impossible de joindre Supabase. Vérifiez votre connexion.':rateLimited?'Trop de messages ont été demandés. Patientez quelques minutes avant de réessayer.':error.message.toLowerCase().includes('already registered')?'Un compte existe déjà avec cette adresse e-mail.':'Impossible de créer le compte. Vérifiez les informations saisies.',
   network?'network':rateLimited?'rate_limit':'signup',
  )
 }
 if(!data.user)throw new AuthenticationError('Supabase n’a pas retourné le compte créé.','signup')
 if(!data.session)return {user:data.user,profile:null,confirmationRequired:true}
 return {user:data.user,profile:await fetchProfile(data.user.id),confirmationRequired:false}
}

export async function resendSignupConfirmation(email:string):Promise<void>{
 const normalizedEmail=email.trim().toLowerCase()
 const {error}=await supabase.auth.resend({
  type:'signup',
  email:normalizedEmail,
  options:{emailRedirectTo:authRedirectUrl('/connexion')},
 })
 if(!error)return
 const network=isNetworkError(error.message)
 const rateLimited=isEmailRateLimitError(error.code,error.message)
 throw new AuthenticationError(
  network?'Impossible de joindre Supabase. Vérifiez votre connexion.':rateLimited?'Trop de messages ont été demandés. Patientez quelques minutes avant de réessayer.':'Impossible de renvoyer l’e-mail de confirmation. Vérifiez l’adresse ou réessayez plus tard.',
  network?'network':rateLimited?'rate_limit':'signup',
 )
}

export async function requestPasswordReset(email:string):Promise<void>{
 const {error}=await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(),{
  redirectTo:authRedirectUrl('/reinitialiser-mot-de-passe'),
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
