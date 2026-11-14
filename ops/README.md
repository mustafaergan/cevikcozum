# Yayın akışı (GitHub → Natro)

```
git push (master)
   └─► GitHub webhook (HMAC-SHA256 imzalı)
         └─► https://cevikcozum.com/_deploy/hook.php
               ├─ cPanel UAPI VersionControl/update      → ~/repositories/cevikcozum GitHub'dan çekilir
               └─ cPanel UAPI VersionControlDeployment   → .cpanel.yml çalışır
                     ├─ index.html css js img logo vendor _deploy → ~/public_html/
                     └─ ops/write-status.sh → /_deploy/status.json
```

- Canlı sürüm: <https://cevikcozum.com/_deploy/status.json> (commit, mesaj, deploy zamanı)
- Webhook bilgisi: `GET https://cevikcozum.com/_deploy/hook.php`
- Sırlar sunucuda, webroot dışında: `~/.deploy/cevikcozum.json` (webhook sırrı + cPanel token'ı). GitHub'da yalnızca webhook sırrı durur.
- Kayıt: `~/logs/cevikcozum-deploy.log`
- Yalnızca `.cpanel.yml`'de listelenen dosyalar yayınlanır. Yeni bir klasör eklerseniz oraya da ekleyin.

## Yerelden yayın

`C:\dev\sirketsiteleri` içinden: `npm run cp -- publish cevikcozum -m "mesaj"` (commit + push + canlıyı bekler), `npm run cp -- status` (GitHub ↔ cPanel ↔ canlı).
