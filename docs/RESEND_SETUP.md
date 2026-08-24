# Configuration Resend — Dom G Store

L’envoi est réalisé exclusivement par les Vercel Functions présentes dans `api/emails`. La clé Resend et la clé Supabase `service_role` ne doivent jamais être préfixées par `VITE_` ni utilisées dans `src`.

## 1. Migration Supabase obligatoire

Ouvrir `supabase-order-email-events.sql`, copier son contenu dans **Supabase Dashboard → SQL Editor**, puis l’exécuter une seule fois.

Cette migration crée `public.order_email_events`, une table technique sans accès `anon` ou `authenticated`. Seules les fonctions serveur utilisant la clé de service peuvent y écrire. La contrainte unique `(order_id, event_key)` empêche de journaliser deux fois le même e-mail.

La migration ne modifie ni `orders`, ni `order_items`, ni leurs données existantes.

## 2. Variables Vercel

Dans **Vercel → dom-g-store-hr5t → Settings → Environment Variables**, ajouter :

```env
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=Dom G Store <onboarding@resend.dev>
ADMIN_ORDER_EMAIL=votre-adresse-administrateur@example.com
APP_URL=https://dom-g-store-hr5t.vercel.app
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre-cle-service-role
RESEND_TEST_MODE=false
RESEND_TEST_RECIPIENT=
```

Appliquer les valeurs aux environnements souhaités (`Production`, `Preview`, éventuellement `Development`). La clé `SUPABASE_SERVICE_ROLE_KEY` reste exclusivement dans Vercel Functions et ne doit jamais être copiée dans une variable `VITE_`.

## 3. Configuration locale

Copier `.env.example` vers `.env.local`, puis renseigner les valeurs serveur. `.env.local` est ignoré par Git. Pour exécuter aussi les fonctions `/api` en local, utiliser Vercel CLI :

```bash
vercel dev
```

Un simple `npm run dev` lance Vite mais ne sert pas nécessairement les routes `/api` de Vercel.

## 4. Test volontaire avec onboarding@resend.dev

Le domaine de test Resend peut limiter les destinataires à l’adresse du propriétaire du compte Resend. Pour un test explicite, définir temporairement :

```env
RESEND_TEST_MODE=true
RESEND_TEST_RECIPIENT=adresse-associee-au-compte-resend@example.com
```

Dans ce mode, client et administrateur sont redirigés vers cette adresse. Ne jamais laisser `RESEND_TEST_MODE=true` involontairement en production.

Parcours conseillé :

1. Créer une nouvelle commande avec un client connecté.
2. Vérifier l’e-mail de confirmation client et la notification administrateur.
3. Vérifier deux lignes dans `public.order_email_events`.
4. Depuis `/admin/commandes`, passer la commande à `confirmee`.
5. Vérifier l’e-mail de statut et la troisième ligne d’événement.
6. Répéter le même appel et confirmer qu’aucun doublon n’est envoyé.

## 5. Journaux

- Resend : ouvrir **Resend Dashboard → Emails** pour voir les envois, erreurs et identifiants.
- Vercel : ouvrir **Vercel → projet → Logs**, puis filtrer les routes `/api/emails/order-confirmation` et `/api/emails/order-status`.
- Supabase : consulter `public.order_email_events` pour les événements enregistrés après un envoi réussi.

Les fonctions ne journalisent pas les clés, les tokens ou les adresses e-mail.

## 6. Domaine personnalisé

Après vérification d’un domaine dans Resend, remplacer uniquement :

```env
RESEND_FROM_EMAIL=Dom G Store <commandes@mondomaine.com>
```

Configurer les enregistrements DNS SPF/DKIM proposés par Resend, attendre la validation du domaine, puis désactiver le mode test.

## 7. Redéploiement

Après l’ajout ou la modification des variables Vercel, déclencher un nouveau déploiement depuis Vercel ou pousser une version validée du projet. Les variables ne sont pas rétroactivement injectées dans un déploiement déjà construit.

## 8. Limite actuelle du schéma

La commande stocke `payment_status`, mais aucune colonne `payment_method` n’existe actuellement dans `public.orders`. Les e-mails affichent donc le statut de paiement réellement enregistré et n’inventent pas de méthode. Ajouter ultérieurement une méthode de paiement exige une migration et une adaptation de la RPC `create_order_with_stock`.
