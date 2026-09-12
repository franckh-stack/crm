# UPSTREAM.md — provenance et reproductibilité du fork `crm`

**Chantier** : `crm-kc0a` (WP-KC0A). Ce fichier documente la provenance du fork
`franckh-stack/crm` par rapport à son amont `trycompai/crm`, pour satisfaire
`EXG-C-CRM-06` / `PRV-C-CRM-10` (reproductibilité).

> Ce fichier vit dans **le fork** (`franckh-stack/crm`, racine, branche
> `release`) — copié ici dans le worktree VigieProcure pour revue avant PR,
> cf. section « Où ce fichier vit réellement » en bas de page.

---

## Provenance

| | |
|---|---|
| **Repo amont** | `trycompai/crm`, branche par défaut `release` |
| **Repo fork** | `franckh-stack/crm`, branche de déploiement `release` |
| **Point de fork** | `6d4793dd6d7aeea91aa6a034e00b17d7408a2d08` — merge PR #177 upstream (`trycompai/main` → `release`), **2026-08-21 14:25:00 UTC**. Aussi taggé localement par la branche `pre-vigieproc-chantier` (même SHA). |
| **Commit `release` déployé** | `7a0a50a8981c6aaff2c378049b47e698a6268655`, 2026-08-29T01:10:04Z. **Autorité** : HEAD de `release` sur GitHub + clone local `/c/vp/crm-fork` (les deux concordent). |

### Note sur la mesure du commit déployé — dette de traçabilité

`git -C /home/ubuntu/vigieproc/crm/src log -1` est **impossible** sur
vigiep1 : la source y a été transférée par `tar` + `scp` (cf. Task 6 du
fork initial), pas par `git clone` — **aucun `.git/` n'existe sur l'hôte de
prod**. Le SHA ci-dessus est donc établi par déduction (HEAD de `release`
au moment de la dernière session de déploiement documentée, `CR-FORK-TRYCOMPAI-CRM-DEPLOYE-20260828.md`), **corroboré empiriquement** le 29/08/2026 sur le conteneur `crm-agent` en prod :
- `microsandbox`/`just-bash` résolvables au runtime (`require.resolve` → OK) — confirme que le commit `eef531c` (déplacement en `dependencies`) est bien celui qui tourne, pas une version antérieure où ces modules auraient disparu sous `--production`.
- CLI `docker` absent (`command -v docker` → exit 127) — cohérent avec `595a6f6` (aucune installation du CLI dans l'image agent).

**Dette nommée** : sans marqueur de version transféré avec la source (fichier
`COMMIT_SHA.txt` ou équivalent, généré au build et copié dans l'image), le
SHA exact déployé sur vigiep1 n'est vérifiable que par déduction/corrélation,
jamais par une lecture directe sur l'hôte. À corriger dans un futur chantier
de déploiement (graver le SHA en `ARG`/`ENV` au build, ou repasser par un
`git clone` sur vigiep1 au lieu d'un `tar`+`scp`).

---

## Adaptations VigieProcure par rapport à l'amont

`git log 6d4793dd..release --oneline` (8 commits, tous sur `release`, aucun sur `main`) :

```
7a0a50a fix(infra): move @crm/typescript-config and typescript to agent's dependencies
120df57 fix(infra): skip postinstall scripts on the production-only reinstall
eef531c fix(infra): slim api/agent runtime images to production deps only
595a6f6 feat(agent): route the LLM through DeepSeek instead of Vercel AI Gateway, add Dockerfile
00cebb9 fix(infra): apps/app runtime image is node:22-slim directly, no bun
e9af385 infra: add production Dockerfile for apps/app
a28aabb merge: bring apps/api Dockerfile (Task 3) onto release, the fork's actual default/deploy branch
167abb4 infra: add production Dockerfile for apps/api
```

Résumé fonctionnel :
- **Dockerfiles ajoutés** pour `apps/api`, `apps/app`, `apps/agent` (l'amont n'en fournit aucun — trycompai déploie autrement, hors périmètre connu).
- **LLM de l'agent Eve** : DeepSeek (`deepseek-v4-flash`) au lieu de Vercel AI Gateway — évite une dépendance à un compte Vercel.
- **3 correctifs infra post-incident** (29/08/2026, cf. `CR-FORK-TRYCOMPAI-CRM-DEPLOYE-20260828.md`) : images runtime allégées (`--production --ignore-scripts`), dépendances runtime de l'agent (`microsandbox`, `just-bash`, `typescript`/`@crm/typescript-config`) déplacées hors `devDependencies`.

Le `docker-compose.yml` d'orchestration (secrets, ports, réseau) vit dans le
repo VigieProcure (`infra/vigiep1/crm/docker-compose.yml`), **pas** dans le
fork — pas d'adaptation supplémentaire côté code applicatif au-delà des 8
commits ci-dessus.

---

## Versions pinnées

| Composant | Version | Source |
|---|---|---|
| Node.js (runtime `apps/app`) | `node:22.23.2-slim` | `apps/app/Dockerfile` (stage `runtime`) |
| Bun (build + runtime `apps/api`, `apps/agent`) | `oven/bun:1.3.12` (`-slim` en runtime) | `apps/api/Dockerfile`, `apps/agent/Dockerfile`, `package.json.packageManager` |
| PostgreSQL cible | 15 | VPS PG VigieProcure (137.74.172.178) — non pinné par le fork lui-même, dépend de l'infra hôte |

---

## Stratégie de suivi de l'amont

`DEC-C-CRM-13` (stratégie de suivi des mises à jour `trycompai/crm`) —
**à trancher par Franck**, hors périmètre de ce WP. Ce fichier fournit la
base factuelle (point de fork, delta actuel) nécessaire à cette décision,
il ne la prend pas.

---

## Rollback

### Rollback applicatif (image)

Les images sont taguées `latest` sur vigiep1 (pas de tag versionné à ce
jour — dette supplémentaire, hors périmètre immédiat). En l'état :
1. `docker inspect crm-api --format '{{.Image}}'` (et `crm-app`, `crm-agent`) **avant** tout rebuild → note l'ID d'image (sha256) actuellement `Up (healthy)`.
2. Si le rebuild échoue ou régresse : `docker tag <ancien-id> crm-crm-api:latest` (idem pour les 2 autres), puis `docker compose up -d --force-recreate crm-api crm-app crm-agent` — recrée les conteneurs sur l'ancienne image sans rebuild.
3. Docker ne supprime pas une image encore référencée par un tag ou un conteneur arrêté : tant qu'aucun `docker image prune` n'a tourné entre-temps, l'ancien ID reste récupérable localement sur vigiep1.

**Recommandation dette KC0A** : tagger les images par SHA court (`crm-api:7a0a50a`) au lieu de `latest` systématique, pour un rollback par simple changement de tag plutôt que par ID d'image à retrouver dans les logs de build.

### Rollback base de données

- Base `crm_trycompai` sauvegardée par **pgBackRest** (même politique que le reste du VPS PG, cf. `CLAUDE.md` §4 Observability/Infrastructure) — restauration standard via l'outil pgBackRest sur le VPS PG.
- Aucune archive S3 dédiée à `crm_trycompai` distincte de la politique pgBackRest globale (contrairement à Twenty, archivé séparément sur le bucket OVH `overjoyed-nambu` lors de sa mise à l'arrêt, cf. `CR-FORK-TRYCOMPAI-CRM-DEPLOYE-20260828.md`).

---

## Où ce fichier vit réellement

Ce fichier doit être committé à la racine du fork `franckh-stack/crm`
(branche `release`, via GitHub MCP, fichier par fichier, PR → merge par
Franck) — pas dans le dépôt VigieProcure. Une copie de travail est laissée
ici (`C:\vp\crm-kc0a\UPSTREAM.md`) pour revue avant PR ; **elle n'est pas
destinée à être committée dans ce dépôt**.
