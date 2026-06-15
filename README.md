# DinarTaux — Suivi des taux DZD (Square + officiel)

Site de suivi du dinar algérien centré sur **l'écart entre le cours officiel et le taux
Square** (marché parallèle). Taux officiel en temps réel, taux Square sous votre contrôle.

---

## Le concept

Tout le site tourne autour d'une seule idée : **l'écart**. Le code couleur l'encode —
**bleu froid = officiel**, **ambre chaud = Square** — et la « barre d'écart » montre la
distance entre les deux d'un coup d'œil. C'est la donnée la plus parlante (≈80 % pour l'euro).

| Donnée | Source | Mise à jour |
|---|---|---|
| **Taux officiel** | API Frankfurter (banques centrales, gratuite, sans clé) | Automatique, temps réel |
| **Taux Square** | Votre `square-rates.json` sur GitHub | Manuelle, ~30 s/jour |
| **Historique officiel** | Frankfurter (≈6 semaines) | Automatique |
| **Historique Square** | Construit à chaque saisie (`update_square.py`) | Grandit avec le temps |

Rafraîchissement auto toutes les 15 min, plus bouton ↻.

---

## Nouveautés de cette version

- **Barre d'écart (signature)** officiel ↔ Square, dans le hero, les cartes et le détail.
- **Code couleur sémantique** : froid = officiel, chaud = Square (la couleur *est* l'info).
- **Double courbe** dans le détail : officiel (temps réel) vs Square (saisi) → l'écart
  se voit grandir dans le temps.
- **Convertisseur amélioré** : sens réversible (devise→DZD et DZD→devise), montants
  rapides (100/500/1000/5000), bouton copier.
- **Variation 24 h** sur chaque devise (calculée depuis l'historique).
- **Historique Square réel** désormais enregistré par le script de mise à jour.
- Typo : Bricolage Grotesque (titres) + Geist + Geist Mono (chiffres alignés).
- États de chargement, repli hors-ligne, focus clavier, `prefers-reduced-motion`.

---

## Installation (4 étapes)

1. **Créez un dépôt GitHub public** (ex. `DinarTaux`) et ajoutez-y `square-rates.json`.
2. **Copiez l'URL « raw »** du fichier (bouton *Raw* sur GitHub) :
   `https://raw.githubusercontent.com/VOTRE-COMPTE/DinarTaux/main/square-rates.json`
3. **Collez-la** dans `dinartaux.jsx` → constante `SQUARE_URL` (tout en haut).
4. **Déployez** `dinartaux.jsx` (Vercel, Netlify, ou votre VPS Hetzner). Composant React
   autonome, sans dépendance hors React.

---

## Mise à jour quotidienne du Square

**En une commande (recommandé)** — met à jour les taux *et* l'historique, puis pousse :
```bash
py update_square.py --eur 278/275 --usd 238/235 --gbp 314/310 --cad 171/169 --push
```
Format : `ACHAT/VENTE`. Une seule devise possible :
```bash
py update_square.py --eur 279/276 --push
```
Le site se met à jour dans la minute (cache GitHub ~1–5 min).

**À la main** : éditez `square-rates.json` (`rates` + `updated`), ajoutez un point dans
`history`, puis `git push`.

---

## Robustesse

- Source Square injoignable → dernières valeurs de secours + bandeau ambre.
- Frankfurter injoignable → valeurs officielles de secours.
- Indicateur : « En direct » (vert) / « Mise à jour… » (ambre) / « Hors ligne » (rouge).

---

## Notes honnêtes

- L'« officiel » de Frankfurter est une **référence de marché** très proche du cours
  Banque d'Algérie, sans en être le chiffre exact (la BA n'a pas d'API).
- Le **Square n'existe dans aucune API** (marché informel) : quelqu'un doit le saisir.
  Ici, ce quelqu'un c'est vous — donc la donnée vous appartient, et rien ne casse si un
  autre site change sa mise en page.
