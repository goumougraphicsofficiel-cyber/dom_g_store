import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export const PasswordInput=forwardRef<HTMLInputElement,PasswordInputProps>(function PasswordInput(props,ref){
 const [visible,setVisible]=useState(false)
 return <div className="password">
  <input {...props} ref={ref} className={`input ${props.className??''}`} type={visible?'text':'password'}/>
  <button type="button" onClick={()=>setVisible(current=>!current)} aria-label={visible?'Masquer le mot de passe':'Afficher le mot de passe'} aria-pressed={visible}>
   {visible?<EyeOff aria-hidden="true"/>:<Eye aria-hidden="true"/>}
  </button>
 </div>
})
