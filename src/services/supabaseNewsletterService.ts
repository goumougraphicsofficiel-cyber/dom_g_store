import { supabase } from '../lib/supabase'

export type NewsletterSubscriptionResult='subscribed'|'already_subscribed'

export const supabaseNewsletterService={
 async subscribe(email:string):Promise<NewsletterSubscriptionResult>{
  const normalizedEmail=email.trim().toLowerCase()
  const {error}=await supabase.from('newsletter_subscribers').insert({email:normalizedEmail})
  if(!error)return 'subscribed'
  if(error.code==='23505')return 'already_subscribed'
  if(error.code==='PGRST205')throw new Error('La newsletter doit encore être activée dans Supabase.')
  throw new Error('Impossible d’enregistrer votre inscription pour le moment.')
 },
}
