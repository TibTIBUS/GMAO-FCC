# GMAO Maintenance (fc-gmao)

Application de GMAO (CMMS) pour le suivi des interventions de maintenance et des tâches préventives.

- **Démo / prod** : https://fc-gmao.netlify.app
- **Stack** : une seule page HTML autonome (CSS + JS inline), pas de build, connectée à [Supabase](https://supabase.com) (Postgres + API) via le SDK JS chargé en CDN.
- **Fichiers** :
  - `index.html` — toute l'application (interface, styles, logique).
  - `favicon-fc.svg` — icône du site.

## Configuration Supabase

L'URL et la clé publique (anon) du projet Supabase sont définies en dur au début du script, vers la ligne 1155 :

```js
const SUPABASE_URL      = 'https://xxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...';
```

⚠️ Cette clé "anon" est censée être publique (elle est visible par n'importe qui ouvrant le site), mais elle donne accès aux tables `interventions` et `preventif` selon les règles **Row Level Security (RLS)** configurées côté Supabase. Avant de rendre ce dépôt public ou de le partager, vérifie que le RLS est bien activé et restrictif sur ces deux tables (Supabase → Authentication/Table Editor → Policies).

## Développer en local

Aucune installation nécessaire : ouvrir `index.html` dans un navigateur suffit (ou servir le dossier avec n'importe quel serveur statique, ex. `npx serve .`).

## Déploiement

Le site est hébergé sur Netlify. Une fois ce dépôt lié au site Netlify `fc-gmao` (Site settings → Build & deploy → Link repository), chaque `git push` sur la branche principale redéploie automatiquement — plus besoin de déposer les fichiers à la main.
