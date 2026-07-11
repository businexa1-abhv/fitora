# Place TLS certificates here for NGINX (when not using Cloudflare origin-only HTTP)

```
infra/nginx/ssl/
├── fullchain.pem   # Certificate + intermediate chain
└── privkey.pem     # Private key
```

## Option 1: Cloudflare Origin Certificate (recommended)

1. Cloudflare Dashboard → SSL/TLS → Origin Server → Create Certificate
2. Save cert as `fullchain.pem` and key as `privkey.pem`
3. Cloudflare SSL mode: **Full (strict)**

## Option 2: Let's Encrypt (certbot)

```bash
certbot certonly --standalone -d fitora.com -d www.fitora.com -d api.fitora.com -d admin.fitora.com
cp /etc/letsencrypt/live/fitora.com/fullchain.pem infra/nginx/ssl/
cp /etc/letsencrypt/live/fitora.com/privkey.pem infra/nginx/ssl/
```

## Option 3: Cloudflare proxy only (HTTP origin)

If Cloudflare terminates SSL at the edge, use `infra/nginx/conf.d/fitora-cloudflare-origin.conf.example`
and expose only port 80 on the origin server.
