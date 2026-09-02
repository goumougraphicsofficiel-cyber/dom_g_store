import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { LockKeyhole } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import { Card, LoadingSkeleton } from '../ui'

function AuthLoading(){
 return <div className="container section" aria-live="polite"><LoadingSkeleton/></div>
}

function AccessMessage({title,message}:{title:string;message:string}){
 return <div className="container section narrow"><Card className="empty"><LockKeyhole/><h1>{title}</h1><p>{message}</p></Card></div>
}

export function ProtectedRoute({children}:{children:ReactNode}){
 const {authUser,profile,authLoading,authError}=useStore()
 const location=useLocation()
 if(authLoading)return <AuthLoading/>
 if(!authUser)return <Navigate to="/connexion" state={{from:location.pathname}} replace/>
 if(authError||!profile)return <AccessMessage title="Profil indisponible" message={authError??'Votre profil applicatif est introuvable.'}/>
 if(profile.status!=='actif')return <AccessMessage title="Accès désactivé" message="Votre compte est inactif. Contactez un administrateur."/>
 if(profile.role!=='client')return <Navigate to={profile.role==='admin'?'/admin':'/'} replace/>
 return children
}

export function AdminRoute({children}:{children:ReactNode}){
 const {authUser,profile,authLoading,authError}=useStore()
 const location=useLocation()
 if(authLoading)return <AuthLoading/>
 if(!authUser)return <Navigate to="/connexion" state={{from:location.pathname}} replace/>
 if(authError||!profile)return <AccessMessage title="Profil indisponible" message={authError??'Votre profil applicatif est introuvable.'}/>
 if(profile.status!=='actif')return <AccessMessage title="Accès désactivé" message="Votre compte administrateur est inactif."/>
 if(profile.role!=='admin')return <Navigate to="/" replace/>
 return children
}
