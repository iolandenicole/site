/* ------------------------------------------------------------------
   Site — script principal
   Le site lit son contenu dans content/site.json, content/films.json
   et content/cv.json. Ce sont les trois fichiers que l'interface
   d'admin (/admin) modifie. Vous n'avez normalement pas besoin de
   toucher à ce fichier pour changer le contenu du site.
------------------------------------------------------------------- */

(function () {
  "use strict";

  var FICHIERS = {
    site: "content/site.json",
    films: "content/films.json",
    textes: "content/textes.json",
    cv: "content/cv.json"
  };

  var films = [];

  // Vrai uniquement dans la version d'aperçu (un seul fichier), où le
  // lecteur Vimeo ne peut pas être intégré. Le site réel vaut false.
  var APERCU = window.__APERCU__ === true;

  /* ------------------------------------------------- utilitaires -- */

  function slot(nom, racine) {
    return (racine || document).querySelector('[data-slot="' + nom + '"]');
  }

  function texte(nom, valeur) {
    var el = slot(nom);
    if (el && valeur) { el.textContent = valeur; }
    return el;
  }

  function el(balise, classe, contenu) {
    var n = document.createElement(balise);
    if (classe) { n.className = classe; }
    if (contenu) { n.textContent = contenu; }
    return n;
  }

  function paragraphes(cible, source) {
    if (!cible || !source) { return; }
    cible.textContent = "";
    String(source).split(/\n{2,}/).forEach(function (bloc) {
      cible.appendChild(el("p", null, bloc.trim()));
    });
  }

  // Les synopsis et crédits acceptent des liens écrits [libellé](adresse)
  // et des paragraphes séparés par une ligne vide.
  var LIEN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g;

  function ligneAvecLiens(parent, ligne) {
    var pos = 0, m;
    LIEN.lastIndex = 0;
    while ((m = LIEN.exec(ligne)) !== null) {
      if (m.index > pos) {
        parent.appendChild(document.createTextNode(ligne.slice(pos, m.index)));
      }
      var a = el("a", null, m[1]);
      a.href = m[2];
      a.target = "_blank";
      a.rel = "noopener";
      parent.appendChild(a);
      pos = m.index + m[0].length;
    }
    if (pos < ligne.length) {
      parent.appendChild(document.createTextNode(ligne.slice(pos)));
    }
  }

  function texteRiche(cible, source) {
    if (!cible) { return; }
    cible.textContent = "";
    if (!source) { return; }
    String(source).split(/\n{2,}/).forEach(function (bloc) {
      var p = el("p");
      bloc.trim().split(/\n/).forEach(function (ligne, i) {
        if (i) { p.appendChild(document.createElement("br")); }
        ligneAvecLiens(p, ligne);
      });
      cible.appendChild(p);
    });
  }

  function charger(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) { throw new Error(url + " : " + r.status); }
      return r.json();
    });
  }

  /* ------------------------------------------------- identité ---- */

  function rendreIdentite(d) {
    document.title = (d.nom || "Portfolio") + (d.metier ? " — " + d.metier : "");

    texte("nom", d.nom);
    texte("metier-pied", [d.metier, d.pronom].filter(Boolean).join(" "));
    texte("lieu", d.lieu);
    // La phrase d'accroche est facultative : sans elle, rien ne s'affiche.
    var lede = texte("accroche", d.accroche);
    if (lede) { lede.hidden = !d.accroche; }

    paragraphes(slot("a_propos"), d.a_propos);

    if (d.email) {
      texte("email", d.email);
      var a = slot("email-lien");
      if (a) { a.setAttribute("href", "mailto:" + d.email); }
    }

    // Sans portrait, le texte de la bio occupe toute la largeur.
    var fig = slot("portrait-figure");
    var img = slot("portrait");
    var corps = document.querySelector(".bio__body");
    if (fig && img && d.portrait) {
      img.setAttribute("src", d.portrait);
      img.setAttribute("alt", d.nom ? "Portrait de " + d.nom : "Portrait");
      fig.hidden = false;
      if (corps) { corps.classList.remove("bio__body--plein"); }
    } else if (corps) {
      corps.classList.add("bio__body--plein");
    }

    var zone = slot("liens");
    if (zone && Array.isArray(d.liens)) {
      zone.textContent = "";
      d.liens.forEach(function (l) {
        if (!l || !l.nom || !l.url) { return; }
        var a = el("a", null, l.nom);
        a.href = l.url;
        a.rel = "me noopener";
        a.target = "_blank";
        zone.appendChild(a);
      });
    }
  }

  /* ---------------------------------------------------- films ---- */

  // Si la vignette Vimeo ne se charge pas, on affiche une affiche
  // typographique à la place du cadre vide.
  // muet : le titre figure déjà juste sous le cadre, on ne le répète pas
  // à l'intérieur (cas du film en tête de page).
  function affiche(cadre, film, muet) {
    cadre.textContent = "";
    cadre.classList.add("frame--poster");
    if (muet) { return; }
    cadre.appendChild(el("span", "poster__titre", film.titre || "Film"));
    if (film.duree) { cadre.appendChild(el("span", "poster__duree", film.duree)); }
  }

  // Une image envoyée depuis l'admin prend le pas sur la vignette Vimeo.
  function visuel(film) {
    return film.image || film.vignette || "";
  }

  function cadreFilm(film, muet) {
    var cadre = el("div", "frame");
    var source = visuel(film);
    if (source) {
      var img = new Image();
      img.src = source;
      img.alt = "";
      img.loading = "lazy";
      img.addEventListener("error", function () { affiche(cadre, film, muet); });
      cadre.appendChild(img);
    } else {
      affiche(cadre, film, muet);
    }
    cadre.appendChild(el("span", "frame__play"));
    return cadre;
  }

  function rendreFilms(liste) {
    var ul = slot("films");
    if (!ul) { return; }
    ul.textContent = "";

    if (!liste.length) {
      ul.appendChild(el("li", "loading", "Aucun film pour l'instant."));
      return;
    }

    liste.forEach(function (f, i) {
      var li = el("li", "film");

      var btn = el("button", "film__btn");
      btn.type = "button";
      btn.setAttribute("data-index", String(i));
      btn.setAttribute("aria-label", "Lire " + (f.titre || "le film"));

      // Le titre est écrit sous l'image : inutile de le répéter dedans.
      btn.appendChild(cadreFilm(f, true));

      var cap = el("div", "film__caption");
      cap.appendChild(el("span", "film__titre", f.titre || "Sans titre"));

      var meta = [f.annee, f.duree].filter(Boolean).join(" · ");
      if (meta) { cap.appendChild(el("span", "film__meta", meta)); }
      btn.appendChild(cap);

      li.appendChild(btn);
      ul.appendChild(li);
    });
  }

  /* ---------------------------------------------------- textes --- */

  function rendreTextes(liste) {
    var ul = slot("textes");
    if (!ul) { return; }
    ul.textContent = "";

    if (!liste.length) {
      ul.appendChild(el("li", "loading", "Aucun texte pour l'instant."));
      return;
    }

    liste.forEach(function (t) {
      var li = el("li", "texte");

      // Une ligne cliquable seulement si un lien a été renseigné.
      var corps = el(t.url ? "a" : "div", "texte__ligne");
      if (t.url) {
        corps.href = t.url;
        corps.target = "_blank";
        corps.rel = "noopener";
      }

      var gauche = el("div", "texte__gauche");
      gauche.appendChild(el("span", "texte__titre", t.titre || "Sans titre"));
      if (t.precision) { gauche.appendChild(el("span", "texte__precision", t.precision)); }

      corps.appendChild(gauche);
      corps.appendChild(el("span", "texte__annee", t.annee || ""));
      li.appendChild(corps);
      ul.appendChild(li);
    });
  }

  /* ---------------------------------------------------- parcours - */

  // Un paragraphe du parcours, qui accepte des liens [texte](adresse).
  function champ(classe, source) {
    var p = el("p", classe);
    ligneAvecLiens(p, String(source));
    return p;
  }

  function rendreCv(data) {
    var zone = slot("cv");
    if (zone) {
      zone.textContent = "";
      (data.groupes || []).forEach(function (g) {
        var bloc = el("section", "cv__groupe");
        bloc.appendChild(el("h3", "cv__titre", g.titre || ""));

        var liste = el("div", "timeline");
        (g.entrees || []).forEach(function (e) {
          var ligne = el("div", "entry");
          ligne.appendChild(el("div", "entry__year", e.annee || ""));

          var corps = el("div");
          corps.appendChild(champ("entry__title", e.titre || ""));
          if (e.lieu) { corps.appendChild(champ("entry__where", e.lieu)); }
          if (e.detail) { corps.appendChild(champ("entry__detail", e.detail)); }

          if (Array.isArray(e.points) && e.points.length) {
            var ul = el("ul", "entry__points");
            e.points.forEach(function (p) {
              var li = el("li");
              ligneAvecLiens(li, String(p));
              ul.appendChild(li);
            });
            corps.appendChild(ul);
          }

          ligne.appendChild(corps);
          liste.appendChild(ligne);
        });

        bloc.appendChild(liste);
        zone.appendChild(bloc);
      });
    }

    // Les compétences sont repliées par défaut : on les déplie au clic.
    var comp = slot("competences");
    if (comp && Array.isArray(data.competences) && data.competences.length) {
      comp.textContent = "";
      var repli = el("details", "skills__repli");
      repli.appendChild(el("summary", "cv__titre skills__bouton", "Compétences"));

      var dl = el("dl", "skills__list");
      data.competences.forEach(function (c) {
        dl.appendChild(el("dt", null, c.categorie || ""));
        dl.appendChild(el("dd", null, c.detail || ""));
      });

      repli.appendChild(dl);
      comp.appendChild(repli);
    }
  }

  /* ------------------------------------------------- lecteur ----- */

  var lb = {
    boite: document.getElementById("lightbox"),
    scene: document.getElementById("lb-stage"),
    titre: document.getElementById("lb-titre"),
    texte: document.getElementById("lb-texte"),
    credits: document.getElementById("lb-credits"),
    index: 0,
    declencheur: null
  };

  function lecteur(film) {
    var boite = el("div", "player");

    if (APERCU || !film.vimeo_id) {
      // Aperçu : le lecteur ne peut pas être intégré, on renvoie vers Vimeo.
      boite.classList.add("player--lien");
      var source = visuel(film);
      if (source) {
        var img = new Image();
        img.src = source;
        img.alt = "";
        boite.appendChild(img);
      }
      var a = el("a", "player__lien", "Regarder sur Vimeo");
      a.href = film.vimeo_id ? "https://vimeo.com/" + film.vimeo_id : "#";
      a.target = "_blank";
      a.rel = "noopener";
      boite.appendChild(a);
      return boite;
    }

    var ifr = document.createElement("iframe");
    ifr.src = "https://player.vimeo.com/video/" + film.vimeo_id +
              "?title=0&byline=0&portrait=0&dnt=1";
    ifr.title = film.titre || "Lecteur vidéo";
    ifr.allow = "autoplay; fullscreen; picture-in-picture";
    ifr.setAttribute("allowfullscreen", "");
    ifr.setAttribute("frameborder", "0");
    boite.appendChild(ifr);
    return boite;
  }

  function ouvrir(i) {
    if (!films.length || !lb.boite) { return; }
    lb.index = (i + films.length) % films.length;
    var f = films[lb.index];

    lb.scene.textContent = "";
    lb.scene.appendChild(lecteur(f));

    lb.titre.textContent = [f.titre, f.annee].filter(Boolean).join(", ");
    texteRiche(lb.texte, f.description);
    texteRiche(lb.credits, f.credits);

    lb.boite.hidden = false;
    document.getElementById("lb-close").focus();
  }

  function fermer() {
    if (!lb.boite) { return; }
    lb.boite.hidden = true;
    lb.scene.textContent = "";          // coupe la lecture en cours
    if (lb.declencheur) { lb.declencheur.focus(); }
  }

  function brancherLecteur() {
    document.addEventListener("click", function (ev) {
      var btn = ev.target.closest(".film__btn");
      if (!btn) { return; }
      lb.declencheur = btn;
      ouvrir(parseInt(btn.getAttribute("data-index"), 10));
    });
    if (!lb.boite) { return; }

    document.getElementById("lb-close").addEventListener("click", fermer);
    document.getElementById("lb-prev").addEventListener("click", function () { ouvrir(lb.index - 1); });
    document.getElementById("lb-next").addEventListener("click", function () { ouvrir(lb.index + 1); });

    lb.boite.addEventListener("click", function (ev) {
      if (ev.target === lb.boite) { fermer(); }
    });

    document.addEventListener("keydown", function (ev) {
      if (lb.boite.hidden) { return; }
      if (ev.key === "Escape") { fermer(); }
      if (ev.key === "ArrowLeft") { ouvrir(lb.index - 1); }
      if (ev.key === "ArrowRight") { ouvrir(lb.index + 1); }
    });
  }

  /* ------------------------------------------- repère de section - */

  function brancherNavigation() {
    var liens = Array.prototype.slice.call(document.querySelectorAll(".nav a"));
    var cibles = liens
      .map(function (a) { return document.querySelector(a.getAttribute("href")); })
      .filter(Boolean);
    if (!cibles.length || !("IntersectionObserver" in window)) { return; }

    var vus = new Map();
    var obs = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) { vus.set(e.target.id, e.intersectionRatio); });
      var actif = null, meilleur = 0;
      vus.forEach(function (ratio, id) {
        if (ratio > meilleur) { meilleur = ratio; actif = id; }
      });
      liens.forEach(function (a) {
        a.setAttribute("aria-current", a.getAttribute("href") === "#" + actif ? "true" : "false");
      });
    }, { threshold: [0, 0.2, 0.5, 0.8, 1], rootMargin: "-10% 0px -40% 0px" });

    cibles.forEach(function (c) { obs.observe(c); });
  }

  /* ------------------------------------------------- démarrage --- */

  function demarrer(data) {
    films = (data.films && data.films.films) || [];

    rendreIdentite(data.site || {});
    rendreFilms(films);
    rendreTextes((data.textes && data.textes.textes) || []);
    rendreCv(data.cv || {});
    brancherLecteur();
    brancherNavigation();
  }

  function echec(err) {
    var ul = slot("films");
    if (ul) {
      ul.textContent = "";
      ul.appendChild(el("li", "loading",
        "Le contenu n'a pas pu être chargé. Ouvrez le site via une adresse http:// " +
        "(serveur local ou site en ligne) plutôt qu'en double-cliquant sur le fichier."));
    }
    if (window.console) { console.error(err); }
  }

  if (window.__CONTENU__) {
    demarrer(window.__CONTENU__);
    return;
  }

  Promise.all([
    charger(FICHIERS.site),
    charger(FICHIERS.films),
    charger(FICHIERS.textes),
    charger(FICHIERS.cv)
  ])
    .then(function (r) { demarrer({ site: r[0], films: r[1], textes: r[2], cv: r[3] }); })
    .catch(echec);
})();
