# Deploy — controlapps-clientes

Producción: **https://clientes.controldoc.app**

## Arquitectura

```
User (https)
   │
   ▼
Cloudflare (proxy, SSL termination con cert de CF)
   │
   ▼ (HTTPS, Full Strict)
VPS Contabo (5.189.136.177)
   │
   ▼
Caddy (puerto 443, cert Let's Encrypt válido para clientes.controldoc.app)
   │
   ▼ (reverse_proxy)
Next.js (PM2 process clientes-controlapps en puerto 3200)
   │
   ▼
SQLite (/opt/controlapps-clientes/prisma/dev.db)
```

## Componentes

### VPS
- **Host:** Contabo Cloud VPS 10 SSD Hub Europe
- **IP:** 5.189.136.177
- **OS:** Ubuntu 24.04
- **Node:** v22.22.2
- **PM2:** instalado con autostart

### Proyectos corriendo en el VPS
| Proyecto | Path | Puerto | PM2 name | URL pública |
|---|---|---|---|---|
| controlbun | `/opt/controlbun` | 3100 | controlbun | mapeos.controldoc.app |
| controlapps-clientes | `/opt/controlapps-clientes` | 3200 | clientes-controlapps | clientes.controldoc.app |

### DNS
- Zona: `controldoc.app` (Cloudflare, account ID `40e11ff1f19d7a4e3bb095424b6c2da1`, zone ID `ab1237af6351c0eff003edd6d6cf87a7`)
- Registro: `A clientes.controldoc.app → 5.189.136.177` (proxied=true, orange cloud)
- SSL mode del zone: **Full (Strict)** — requiere cert válido en origin

### Caddy (origin SSL)
- Versión: v2.11.3 (apt repo cloudsmith)
- Config: `/etc/caddy/Caddyfile`
- Cert: Let's Encrypt vía HTTP-01 challenge (auto-renew handled by Caddy)
- Logs: `/var/log/caddy/clientes.controldoc.app.log`

Caddyfile actual:
```
{
    email licvidalfernando@gmail.com
}

clientes.controldoc.app {
    encode gzip
    reverse_proxy localhost:3200
    log {
        output file /var/log/caddy/clientes.controldoc.app.log
    }
}
```

### PM2
Proceso `clientes-controlapps` arranca con:
```bash
cd /opt/controlapps-clientes && pm2 start npm --name clientes-controlapps -- start -- -p 3200
pm2 save
```

Verificar: `pm2 list`, `pm2 logs clientes-controlapps`.

## Cómo updatear el código

Desde la PC local, después de un push a GitHub:

```bash
ssh root@5.189.136.177
cd /opt/controlapps-clientes
git pull
npm install        # solo si cambió package.json
npm run db:push    # solo si cambió schema.prisma
npm run build
pm2 restart clientes-controlapps
```

O en una línea desde local con paramiko:
```python
# scripts/ssh-vps.py (gitignored, password embebido)
python scripts/ssh-vps.py "cd /opt/controlapps-clientes && git pull && npm install && npm run build && pm2 restart clientes-controlapps"
```

## Cómo se hizo el deploy inicial (2026-05-15)

1. **Setup inicial en VPS:**
   ```bash
   cd /opt
   git clone https://github.com/loctime/controlapps-clientes.git
   cd controlapps-clientes
   echo 'DATABASE_URL="file:./dev.db"' > .env
   npm install
   npm run db:push    # crea schema en prisma/dev.db
   npm run build
   pm2 start npm --name clientes-controlapps -- start -- -p 3200
   pm2 save
   ```

2. **Migración de datos:** se subió el `dev.db` local con 250+ empresas vía SFTP a `/opt/controlapps-clientes/prisma/dev.db`.

3. **DNS:** A record creado vía Cloudflare API (`POST /zones/{zone_id}/dns_records`).

4. **TLS en origin:** Caddy instalado vía repo cloudsmith. Cert LE obtenido con HTTP-01 challenge (record temporalmente en gray-cloud para que LE alcance origin directo). Luego A record vuelve a orange-cloud.

5. **Cloudflare Tunnel:** intentado pero no se pudo (el `CLOUDFLARE_API_TOKEN` del cliente no tiene `Account:Cloudflare Tunnel:Edit`, solo DNS). Por eso se usó Caddy con A record proxied en lugar de un tunnel.

## Renovar cert TLS

Caddy lo hace automáticamente. Si querés forzar:
```bash
ssh root@5.189.136.177
systemctl restart caddy
journalctl -u caddy -f
```

## Backup de DB

```bash
ssh root@5.189.136.177 "cat /opt/controlapps-clientes/prisma/dev.db" > backup-$(date +%Y%m%d).db
```

O con SFTP/scp si querés un binary clean.

## Troubleshooting

| Síntoma | Diagnóstico | Fix |
|---|---|---|
| 502 Bad Gateway | PM2 process caído | `pm2 list && pm2 restart clientes-controlapps` |
| Cert error en navegador | LE cert expirado o Caddy down | `systemctl status caddy && journalctl -u caddy -n 30` |
| 404 desde Cloudflare | A record con typo o no apunta a VPS | `dig clientes.controldoc.app` |
| Page loads pero data vacía | dev.db sin datos | verificar `prisma/dev.db` size en VPS |

## Endurecer (pendiente)

- **Auth**: el sitio está **público**. Opciones:
  - Cloudflare Access (requiere admin acceso al Zero Trust dashboard, gratis hasta 50 users)
  - Middleware Next.js con basic auth + password env var
  - Firebase Auth (compartiría users con el resto de la familia controldoc)
- **Firewall**: `ufw` está inactive. Idealmente: allow 22, 80, 443; block todo lo demás.
- **Backup automático**: cronjob diario que tira el dev.db a B2 o GCS.
