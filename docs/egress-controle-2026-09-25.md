# Contrôle du poids des listes GMAO — 25 septembre 2026

Mesures prises sur les données de production Supabase. Les octets correspondent
à une sérialisation JSONB des lignes (avec les crochets et virgules du tableau).
Ce sont des **estimations du corps JSON non compressé**, pas les octets d'egress
facturés. Le volume change lorsque des lignes sont créées ou modifiées.

| Liste | Lignes | JSON complet | JSON sans `photos` | Décision |
| --- | ---: | ---: | ---: | --- |
| `interventions` | 133 | 4 876 694 o | 74 029 o | Photos chargées à l'ouverture de la fiche. |
| `preventif` | 69 | 27 884 o | 27 884 o | Aucune colonne `photos`. |
| `conseils_machine` | 1 | 740 o | 726 o | Conserver `photos` dans la liste. |

Dans `conseils_machine`, `photos` est un tableau `text[]` de **chemins** vers
Supabase Storage privé, jamais l'image encodée. Actuellement : 0 conseil
avec photo et 0 chemin enregistré. La colonne ajoute 14 o à la réponse.
Ses chemins sont utilisés pour afficher le nombre de photos, modifier la fiche,
générer le PDF et nettoyer les fichiers Storage lors d'une suppression.
La retirer aujourd'hui ajouterait des lectures à ces actions sans gain d'egress
significatif. Réévaluer si le volume des conseils augmente fortement.

Reproduire les mesures dans l'éditeur SQL Supabase :

```sql
select 'conseils_machine' as liste, count(*) as lignes,
  octet_length(coalesce(jsonb_agg(to_jsonb(t))::text, '[]')) as octets_complets,
  octet_length(coalesce(jsonb_agg(to_jsonb(t) - 'photos')::text, '[]'))
    as octets_sans_photos
from public.conseils_machine t
union all
select 'preventif', count(*),
  octet_length(coalesce(jsonb_agg(to_jsonb(t))::text, '[]')),
  octet_length(coalesce(jsonb_agg(to_jsonb(t))::text, '[]'))
from public.preventif t
union all
select 'interventions', count(*),
  octet_length(coalesce(jsonb_agg(to_jsonb(t))::text, '[]')),
  octet_length(coalesce(jsonb_agg(to_jsonb(t) - 'photos')::text, '[]'))
from public.interventions t;
```
