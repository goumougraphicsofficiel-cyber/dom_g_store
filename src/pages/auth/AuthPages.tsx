import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useStore } from '../../context/StoreContext'
import { requestPasswordReset, resendSignupConfirmation, updatePassword } from '../../services/authService'
import { Logo } from '../../components/layout/AppLayout'
import { Button, Card, Input } from '../../components/ui'
import { PasswordInput } from '../../components/auth/PasswordInput'

const emailSchema=z.email('Adresse e-mail invalide')
const passwordSchema=z.string().min(8,'8 caractères minimum').regex(/[a-z]/,'Ajoutez une lettre minuscule').regex(/[A-Z]/,'Ajoutez une lettre majuscule').regex(/[0-9]/,'Ajoutez un chiffre')

const loginSchema=z.object({email:emailSchema,password:z.string().min(6,'6 caractères minimum'),remember:z.boolean().optional()})
type LoginForm=z.infer<typeof loginSchema>

export function LoginPage(){
 const {login}=useStore(),navigate=useNavigate(),location=useLocation()
 const [busy,setBusy]=useState(false),[authMessage,setAuthMessage]=useState<string|null>(null)
 const {register,handleSubmit,formState:{errors}}=useForm<LoginForm>({resolver:zodResolver(loginSchema),defaultValues:{remember:true}})
 const submit=async(values:LoginForm)=>{setBusy(true);setAuthMessage(null);try{const profile=await login(values.email,values.password);toast.success('Connexion réussie');const requested=(location.state as {from?:string}|null)?.from;navigate(profile.role==='admin'?'/admin':requested?.startsWith('/admin')?'/':requested??'/compte',{replace:true})}catch(error){const message=error instanceof Error?error.message:'La connexion a échoué.';setAuthMessage(message);toast.error(message)}finally{setBusy(false)}}
 return <AuthShell title="Heureux de vous revoir" subtitle="Connectez-vous pour poursuivre vos achats."><form onSubmit={handleSubmit(submit)}>{authMessage?<div className="auth-error" role="alert">{authMessage}</div>:null}<label>Adresse e-mail<Input {...register('email')} autoComplete="email" placeholder="votre@email.com"/></label>{errors.email?<small className="error">{errors.email.message}</small>:null}<label>Mot de passe<PasswordInput autoComplete="current-password" {...register('password')}/></label>{errors.password?<small className="error">{errors.password.message}</small>:null}<div className="between"><label className="check"><input type="checkbox" {...register('remember')}/> Se souvenir de moi</label><Link to="/mot-de-passe-oublie">Mot de passe oublié ?</Link></div><Button className="full" disabled={busy}>{busy?'Connexion…':'Se connecter'}</Button></form><p className="auth-link">Nouveau chez Dom G ? <Link to="/inscription">Créer un compte</Link></p></AuthShell>
}

const registerSchema=z.object({firstName:z.string().trim().min(2,'Prénom obligatoire'),lastName:z.string().trim().min(2,'Nom obligatoire'),phone:z.string().trim().min(8,'Numéro de téléphone obligatoire'),email:emailSchema,password:passwordSchema,confirm:z.string(),terms:z.boolean().refine(Boolean,'Vous devez accepter les conditions')}).refine(values=>values.password===values.confirm,{path:['confirm'],message:'Les mots de passe diffèrent'})
type RegisterForm=z.infer<typeof registerSchema>

export function RegisterPage(){
 const {register:signup}=useStore(),navigate=useNavigate()
 const [busy,setBusy]=useState(false),[resending,setResending]=useState(false),[resendCooldown,setResendCooldown]=useState(0),[confirmationEmail,setConfirmationEmail]=useState('')
 const {register,handleSubmit,formState:{errors}}=useForm<RegisterForm>({resolver:zodResolver(registerSchema),defaultValues:{terms:false}})
 useEffect(()=>{if(resendCooldown<=0)return;const timer=window.setTimeout(()=>setResendCooldown(value=>value-1),1000);return()=>window.clearTimeout(timer)},[resendCooldown])
 const submit=async(values:RegisterForm)=>{setBusy(true);try{const result=await signup(values);if(result.confirmationRequired){setConfirmationEmail(values.email);toast.success('Compte créé. Confirmez votre adresse e-mail.')}else{toast.success('Votre compte a été créé.');navigate('/compte',{replace:true})}}catch(error){toast.error(error instanceof Error?error.message:'L’inscription a échoué.')}finally{setBusy(false)}}
 const resendConfirmation=async()=>{if(resending||resendCooldown>0)return;setResending(true);try{await resendSignupConfirmation(confirmationEmail);setResendCooldown(60);toast.success('Un nouvel e-mail de confirmation a été envoyé.')}catch(error){toast.error(error instanceof Error?error.message:'Le renvoi de l’e-mail a échoué.')}finally{setResending(false)}}
 if(confirmationEmail)return <AuthShell title="Confirmez votre adresse e-mail" subtitle="Votre compte client a bien été créé."><div className="success-message" role="status"><h3>Vérifiez votre messagerie</h3><p>Un lien de confirmation a été envoyé à <strong>{confirmationEmail}</strong>.</p><p>Consultez également vos courriers indésirables. La réception peut prendre quelques minutes.</p><Button type="button" className="full" disabled={resending||resendCooldown>0} onClick={resendConfirmation}>{resending?'Renvoi en cours…':resendCooldown>0?`Renvoyer dans ${resendCooldown} s`:'Renvoyer l’e-mail'}</Button><Link to="/connexion">Retour à la connexion</Link></div></AuthShell>
 return <AuthShell title="Créer votre compte" subtitle="Créez votre espace client Dom G Store."><form onSubmit={handleSubmit(submit)}><div className="form-grid"><FormField label="Prénom" error={errors.firstName?.message}><Input {...register('firstName')} autoComplete="given-name"/></FormField><FormField label="Nom" error={errors.lastName?.message}><Input {...register('lastName')} autoComplete="family-name"/></FormField><FormField label="Téléphone" error={errors.phone?.message}><Input {...register('phone')} autoComplete="tel"/></FormField><FormField label="E-mail" error={errors.email?.message}><Input {...register('email')} type="email" autoComplete="email"/></FormField><FormField label="Mot de passe" error={errors.password?.message}><PasswordInput {...register('password')} autoComplete="new-password"/></FormField><FormField label="Confirmation" error={errors.confirm?.message}><PasswordInput {...register('confirm')} autoComplete="new-password"/></FormField></div><label className="check"><input type="checkbox" {...register('terms')}/> J’accepte les <Link to="/conditions">conditions générales</Link>.</label>{errors.terms?<small className="error">{errors.terms.message}</small>:null}<Button className="full" disabled={busy}>{busy?'Création du compte…':'Créer mon compte'}</Button></form><p className="auth-link">Déjà inscrit ? <Link to="/connexion">Se connecter</Link></p></AuthShell>
}

const forgotSchema=z.object({email:emailSchema})
type ForgotForm=z.infer<typeof forgotSchema>

export function ForgotPage(){
 const [sent,setSent]=useState(false),[busy,setBusy]=useState(false)
 const {register,handleSubmit,formState:{errors}}=useForm<ForgotForm>({resolver:zodResolver(forgotSchema)})
 const submit=async(values:ForgotForm)=>{setBusy(true);try{await requestPasswordReset(values.email);setSent(true);toast.success('Lien de réinitialisation envoyé.')}catch(error){toast.error(error instanceof Error?error.message:'L’envoi a échoué.')}finally{setBusy(false)}}
 return <AuthShell title="Mot de passe oublié" subtitle="Recevez un lien sécurisé pour choisir un nouveau mot de passe.">{sent?<div className="success-message" role="status"><h3>Vérifiez votre messagerie</h3><p>Si un compte correspond à cette adresse, vous recevrez un lien de réinitialisation.</p><Link to="/connexion">Retour à la connexion</Link></div>:<form onSubmit={handleSubmit(submit)}><FormField label="Adresse e-mail" error={errors.email?.message}><Input {...register('email')} autoComplete="email" type="email"/></FormField><Button className="full" disabled={busy}>{busy?'Envoi…':'Envoyer le lien'}</Button></form>}</AuthShell>
}

const resetSchema=z.object({password:passwordSchema,confirm:z.string()}).refine(values=>values.password===values.confirm,{path:['confirm'],message:'Les mots de passe diffèrent'})
type ResetForm=z.infer<typeof resetSchema>

export function ResetPasswordPage(){
 const navigate=useNavigate(),[busy,setBusy]=useState(false)
 const {register,handleSubmit,formState:{errors}}=useForm<ResetForm>({resolver:zodResolver(resetSchema)})
 const submit=async(values:ResetForm)=>{setBusy(true);try{const result=await updatePassword(values.password);toast.success('Votre mot de passe a été modifié.');if(!result.smsSent)toast.warning('Le SMS de sécurité n’a pas pu être envoyé.');navigate('/compte',{replace:true})}catch(error){toast.error(error instanceof Error?error.message:'La réinitialisation a échoué.')}finally{setBusy(false)}}
 return <AuthShell title="Nouveau mot de passe" subtitle="Choisissez un mot de passe sécurisé pour votre compte."><form onSubmit={handleSubmit(submit)}><FormField label="Nouveau mot de passe" error={errors.password?.message}><PasswordInput {...register('password')} autoComplete="new-password"/></FormField><FormField label="Confirmer le mot de passe" error={errors.confirm?.message}><PasswordInput {...register('confirm')} autoComplete="new-password"/></FormField><Button className="full" disabled={busy}>{busy?'Mise à jour…':'Enregistrer le mot de passe'}</Button></form></AuthShell>
}

function FormField({label,error,children}:{label:string;error?:string;children:ReactNode}){return <label>{label}{children}{error?<small className="error">{error}</small>:null}</label>}

function AuthShell({title,subtitle,children}:{title:string;subtitle:string;children:ReactNode}){return <div className="auth-page"><div className="auth-brand"><Logo/><h1>Votre shopping,<br/>simple et serein.</h1><p>Une expérience locale, moderne et conçue pour vous.</p></div><Card className="auth-card"><div className="auth-logo"><Logo/></div><h2>{title}</h2><p>{subtitle}</p>{children}</Card></div>}
