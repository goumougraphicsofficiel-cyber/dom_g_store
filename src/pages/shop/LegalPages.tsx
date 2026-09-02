import type { ReactNode } from 'react'
import { Card, PageHeader } from '../../components/ui'

function LegalPage({title,description,children}:{title:string;description:string;children:ReactNode}){
 return <div className="container section narrow">
  <PageHeader title={title} description={description}/>
  <Card>{children}</Card>
 </div>
}

export function AboutPage(){
 return <LegalPage title="À propos" description="Découvrez l’engagement de Dom G Store.">
  <p>Dom G Store sélectionne des équipements et accessoires pensés pour accompagner le quotidien de ses clients en Guinée.</p>
  <p>Pour toute question sur la boutique ou nos services, contactez notre équipe depuis votre espace client.</p>
 </LegalPage>
}

export function ConditionsPage(){
 return <LegalPage title="Conditions générales" description="Informations essentielles concernant l’utilisation de la boutique.">
  <p>Les conditions applicables à une commande sont celles présentées au client pendant son parcours d’achat et lors de sa confirmation.</p>
  <p>Une version complète des conditions sera publiée ici lorsqu’elle aura été validée par Dom G Store.</p>
 </LegalPage>
}

export function PrivacyPage(){
 return <LegalPage title="Politique de confidentialité" description="Comment Dom G Store traite vos informations.">
  <p>Les informations fournies sont utilisées pour gérer votre compte, vos commandes et leur livraison.</p>
  <p>Pour toute demande concernant vos données personnelles, contactez Dom G Store depuis votre espace client.</p>
 </LegalPage>
}
