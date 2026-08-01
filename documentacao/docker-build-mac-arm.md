# Build Docker para produção (Mac ARM → linux/amd64)

Ambiente de desenvolvimento típico: **Mac Apple Silicon** (`linux/arm64`).  
Produção (Portainer / VPS): **`linux/amd64`**.

Não use `docker build` + `docker push` direto no Mac para release — a imagem sai em **arm64** e o Portainer retorna:

`no matching manifest for linux/amd64 in the manifest list entries`

## Comando oficial (recomendado)

Substitua `X.Y.Z` pela versão do release (alinhada ao `package.json`):

```bash
npm run docker:push -- X.Y.Z
```

Equivalente:

```bash
./scripts/docker-release.sh X.Y.Z
```

Isso executa `docker buildx build --platform linux/amd64 -t hygorfragas/clinica:X.Y.Z --push .`

## Manual (se precisar)

```bash
docker login
docker buildx create --use --name clinica-builder 2>/dev/null || docker buildx use clinica-builder

docker buildx build \
  --platform linux/amd64 \
  -t hygorfragas/clinica:X.Y.Z \
  --push \
  .
```

## Conferir plataforma publicada

```bash
docker buildx imagetools inspect hygorfragas/clinica:X.Y.Z
```

Deve listar `linux/amd64`.

## Portainer

No `docker-compose.yml` / stack:

```yaml
image: hygorfragas/clinica:X.Y.Z
```

Depois: pull and redeploy.

## Opcional: Mac + servidor (multi-arch)

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t hygorfragas/clinica:X.Y.Z \
  --push \
  .
```

## Política de tags

Sempre publicar **primeiro** com tag semver `:X.Y.Z`. Ver `.cursor/rules/10-docker-image-versioning.mdc`.
