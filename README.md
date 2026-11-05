# Site — mode d'emploi

Site statique modifiable depuis un navigateur. Pas de serveur, pas de base de
données, pas d'abonnement mensuel.

**Coût réel : 0 € par an, sauf le nom de domaine (10 à 15 € par an).**

---

## Ce qu'il y a dans le dossier

```
index.html          la page du site
css/style.css       toutes les couleurs, tailles et espacements
js/main.js          affichage des films, lecteur, parcours
content/site.json   nom, présentation, email, liens
content/films.json  la liste des films (titre, année, identifiant Vimeo)
content/cv.json     le parcours et les compétences
admin/              l'interface d'administration
images/uploads/     les images (portrait, et vos propres vignettes)
```

Le site lit son contenu dans les trois fichiers `content/*.json`. L'interface
d'admin ne fait rien d'autre que modifier ces fichiers pour vous.

Les films ne sont pas stockés ici : ils restent sur Vimeo. Le site n'en garde
que l'identifiant, et le lecteur Vimeo s'ouvre dans une fenêtre sur la page.

---

## Mise en ligne, étape par étape

Comptez une heure la première fois. Ensuite, modifier le site prend deux minutes.

### 1. Mettre le dossier sur GitHub

Créez un compte sur [github.com](https://github.com) si vous n'en avez pas,
puis un nouveau dépôt (**New repository**), par exemple `site`. Mettez-le en
**Private** si vous préférez : le site publié restera visible, mais pas le code.

Envoyez-y le contenu de ce dossier. Le plus simple sans ligne de commande :
sur la page du dépôt vide, cliquez **uploading an existing file** et glissez
tous les fichiers et dossiers.

En ligne de commande :

```bash
cd portfolio
git init
git add .
git commit -m "Première version du site"
git branch -M main
git remote add origin https://github.com/VOTRE-COMPTE/site.git
git push -u origin main
```

### 2. Publier le site — sur OVH

Le dossier contient déjà la configuration qui envoie le site sur votre
hébergement OVH à chaque modification, y compris celles faites depuis l'admin.
Elle se trouve dans `.github/workflows/deploy-ovh.yml`.

**Récupérer vos accès FTP.** Dans l'espace client OVH : *Hébergements* → votre
hébergement → onglet **FTP - SSH**. Notez le serveur (de la forme
`ftp.cluster0XX.hosting.ovh.net`) et le nom d'utilisateur. Si vous ne
connaissez plus le mot de passe, changez-le depuis cette même page.

**Les donner à GitHub.** Sur la page de votre dépôt : *Settings* → *Secrets and
variables* → *Actions* → **New repository secret**. Créez-en trois, avec
exactement ces noms :

| Nom du secret | Valeur |
|---|---|
| `OVH_FTP_SERVEUR` | `ftp.cluster0XX.hosting.ovh.net` |
| `OVH_FTP_UTILISATEUR` | votre identifiant FTP |
| `OVH_FTP_MOTDEPASSE` | votre mot de passe FTP |

Une fois les trois secrets enregistrés, allez dans l'onglet *Actions* du dépôt
et lancez **Publier sur OVH**. Les fois suivantes, c'est automatique.

**Vérifier le dossier de destination.** Le fichier envoie dans `www`, qui est
le dossier racine par défaut d'un hébergement OVH. Si votre domaine pointe
ailleurs — ce qui arrive quand plusieurs sites sont sur le même hébergement —
l'onglet *Multisite* d'OVH indique le bon dossier. Corrigez alors la ligne
`server-dir` du fichier.

**Activer HTTPS.** Dans l'espace OVH, onglet *Multisite*, vérifiez que le
certificat SSL est actif sur votre domaine. Il est gratuit.

> **Sans GitHub ?** Vous pouvez aussi déposer les fichiers à la main par FTP
> avec FileZilla, dans le dossier `www`. Mais l'interface d'admin ne
> fonctionnera plus : elle a besoin de GitHub pour enregistrer vos
> modifications. Vous devriez alors modifier les fichiers `content/*.json`
> sur votre ordinateur et les redéposer à chaque fois.

### 2 bis. Publier le site — sur Cloudflare Pages

Créez un compte gratuit sur [Cloudflare](https://dash.cloudflare.com), puis
**Workers & Pages → Create → Pages → Connect to Git**. Choisissez votre dépôt.

Quand on vous demande les réglages de compilation, laissez tout vide :

- Framework preset : **None**
- Build command : *(vide)*
- Build output directory : `/`

Cliquez **Save and Deploy**. Une minute plus tard, le site est en ligne à une
adresse du type `site-abc.pages.dev`.

À partir de là, **chaque modification envoyée sur GitHub se publie
automatiquement** en moins d'une minute. C'est aussi vrai pour les
modifications faites depuis l'admin.

> Netlify et GitHub Pages fonctionnent exactement pareil et sont gratuits aussi.
> Cloudflare a l'offre gratuite la plus large (trafic illimité).

### 3. Relier l'interface d'admin

Ouvrez `admin/config.yml` et remplacez :

```yaml
repo: VOTRE-COMPTE/VOTRE-DEPOT
```

par le nom réel du dépôt, par exemple `iolande/site`.

Ensuite, créez un jeton d'accès GitHub, qui sert de mot de passe à l'admin :

1. GitHub → votre photo en haut à droite → **Settings**
2. Tout en bas à gauche : **Developer settings**
3. **Personal access tokens → Fine-grained tokens → Generate new token**
4. Donnez-lui un nom (`admin site`), une date d'expiration
5. **Repository access** → *Only select repositories* → votre dépôt
6. **Permissions → Repository permissions → Contents** → passez sur
   **Read and write**
7. Générez le jeton et **copiez-le immédiatement** : GitHub ne le réaffichera
   jamais. Rangez-le dans votre gestionnaire de mots de passe.

Allez sur `votresite.pages.dev/admin`, choisissez la connexion par jeton
d'accès personnel, collez le jeton. Vous y êtes.

> Pourquoi un jeton plutôt qu'un simple identifiant ? Un site statique n'a pas
> de serveur pour vérifier un mot de passe. Le jeton permet à l'admin d'écrire
> directement dans le dépôt GitHub, sans rien installer d'autre.
> Si plusieurs personnes doivent administrer le site, il faudra passer par un
> connecteur OAuth ([sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth),
> gratuit sur Cloudflare Workers).

### 4. Brancher le nom de domaine

**Si vous hébergez chez OVH** (étape 2), il n'y a rien à faire côté DNS : le
domaine et l'hébergement sont déjà associés dans votre compte. Vérifiez
simplement, dans l'onglet *Multisite*, que votre domaine pointe bien sur le
dossier où le site est déposé.

**Si vous hébergez sur Cloudflare Pages** (étape 2 bis) avec un domaine acheté
chez OVH : dans l'espace OVH, remplacez les serveurs DNS du domaine par ceux
que Cloudflare vous donne, puis dans Cloudflare Pages faites
**Custom domains → Set up a domain**. Le domaine reste votre propriété et
reste facturé par OVH ; seule la gestion DNS passe chez Cloudflare.

---

## Ajouter un film

Dans l'admin, rubrique **Films**, bouton d'ajout. Les seuls champs
indispensables sont le titre et l'**identifiant Vimeo** : ce sont les chiffres
à la fin de l'adresse. Pour `vimeo.com/1229564164`, l'identifiant est
`1229564164`.

Pour la vignette, deux possibilités :

- **Vignette** : collez l'adresse de l'image d'aperçu générée par Vimeo
  (celles des cinq films actuels sont déjà renseignées) ;
- **Image personnalisée** : envoyez votre propre photogramme. Il prend alors le
  pas sur la vignette Vimeo, et c'est la meilleure option si vous voulez
  choisir vous-même l'image de chaque film.

Si aucune image ne se charge, le site affiche automatiquement le titre du film
sur un fond uni plutôt qu'un cadre vide.

---

## Modifier le site au quotidien

**Textes, films, parcours, compétences** → rendez-vous sur `votresite.fr/admin`.
Les changements sont enregistrés sur GitHub et le site se republie tout seul.

**Couleurs, typographie, espacements** → ouvrez `css/style.css`. Tout est
regroupé dans le bloc `:root` en haut du fichier :

```css
--ink:    #0E1B2A;   /* le fond */
--bone:   #EDE6D8;   /* le texte */
--sulfur: #E0BE45;   /* la couleur d'accent */
```

Changez une seule valeur et toute la page suit.

**Ajouter une rubrique au parcours** → dans l'admin, rubrique *Parcours*, le
bouton d'ajout crée une nouvelle rubrique avec son propre titre. Rien à
modifier dans le code.

---

## Deux limites à connaître

**Le contenu est chargé par JavaScript.** Les moteurs de recherche savent le
lire, mais moins bien qu'un texte écrit directement dans la page. Pour un site
dont on donne l'adresse soi-même, c'est sans conséquence. Si le référencement
devient un enjeu, il faudra passer par un générateur de site statique (Astro,
Eleventy) qui produit le HTML à l'avance — même principe, même admin, même
hébergement.

**Ouvrir `index.html` en double-cliquant ne marchera pas.** Le navigateur
bloque la lecture des fichiers JSON en local. Pour voir le site sur votre
ordinateur, lancez un petit serveur depuis le dossier :

```bash
python3 -m http.server 8000
```

puis ouvrez `http://localhost:8000`.

---

## Récapitulatif des coûts

| Poste | Service | Coût |
|---|---|---|
| Hébergement | Cloudflare Pages | 0 € |
| Interface d'admin | Sveltia CMS | 0 € |
| Stockage du code | GitHub | 0 € |
| Hébergement des films | Vimeo (compte existant) | selon votre offre |
| Certificat HTTPS | Cloudflare | 0 € |
| **Nom de domaine** | **Cloudflare Registrar** | **≈ 10 €/an** |
