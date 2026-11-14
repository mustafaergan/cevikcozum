<?php
/**
 * Çevik Çözüm deploy API'si (PHP 7.2+ uyumlu).
 *
 *   GET  /_deploy/hook.php   -> canlıdaki sürüm (status.json) + API bilgisi
 *   POST /_deploy/hook.php   -> GitHub webhook (X-Hub-Signature-256 ile imzalı)
 *        push refs/heads/<branch> gelince cPanel'deki repoyu GitHub'dan çeker ve .cpanel.yml deploy'unu başlatır.
 *
 * Sırlar webroot dışında: ~/.deploy/cevikcozum.json
 *   { "secret": "...", "cpanel_host": "https://...:2083", "cpanel_user": "...", "cpanel_token": "...",
 *     "repo_root": "/home/<user>/repositories/cevikcozum", "branch": "master" }
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$home = dirname(__DIR__, 2);
$cfgFile = $home . '/.deploy/cevikcozum.json';
$logFile = $home . '/logs/cevikcozum-deploy.log';

function respond(int $code, array $body): void
{
    http_response_code($code);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), "\n";
    exit;
}

function logLine(string $file, string $msg): void
{
    @mkdir(dirname($file), 0700, true);
    @file_put_contents($file, gmdate('Y-m-d\TH:i:s\Z') . ' ' . $msg . "\n", FILE_APPEND | LOCK_EX);
}

function cpanel(array $cfg, string $module, string $func, array $params): array
{
    $url = rtrim($cfg['cpanel_host'], '/') . "/execute/$module/$func";
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($params),
        CURLOPT_HTTPHEADER => ['Authorization: cpanel ' . $cfg['cpanel_user'] . ':' . $cfg['cpanel_token']],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 60,
    ]);
    $raw = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);
    if ($raw === false) {
        throw new RuntimeException("$module/$func: $err");
    }
    $j = json_decode((string)$raw, true);
    if (!is_array($j) || empty($j['status'])) {
        $msg = is_array($j) && !empty($j['errors']) ? implode('; ', $j['errors']) : substr((string)$raw, 0, 200);
        throw new RuntimeException("$module/$func: $msg");
    }
    return is_array($j['data']) ? $j['data'] : [];
}

function liveStatus(): ?array
{
    $f = __DIR__ . '/status.json';
    if (!is_file($f)) return null;
    $j = json_decode((string)file_get_contents($f), true);
    return is_array($j) ? $j : null;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    respond(200, [
        'service' => 'cevikcozum-deploy',
        'live' => liveStatus(),
        'endpoints' => ['GET /_deploy/status.json', 'POST /_deploy/hook.php (GitHub webhook)'],
    ]);
}
if ($method !== 'POST') {
    respond(405, ['error' => 'method not allowed']);
}

if (!is_file($cfgFile)) {
    respond(500, ['error' => 'deploy config missing']);
}
$cfg = json_decode((string)file_get_contents($cfgFile), true);
if (!is_array($cfg) || empty($cfg['secret'])) {
    respond(500, ['error' => 'deploy config invalid']);
}

$body = (string)file_get_contents('php://input');
$sig = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';
$expected = 'sha256=' . hash_hmac('sha256', $body, $cfg['secret']);
if (!hash_equals($expected, $sig)) {
    logLine($logFile, 'REDDEDILDI imza gecersiz ip=' . ($_SERVER['REMOTE_ADDR'] ?? '?'));
    respond(401, ['error' => 'bad signature']);
}

$event = $_SERVER['HTTP_X_GITHUB_EVENT'] ?? '';
$delivery = $_SERVER['HTTP_X_GITHUB_DELIVERY'] ?? '';
if ($event === 'ping') {
    logLine($logFile, "ping delivery=$delivery");
    respond(200, ['pong' => true]);
}
if ($event !== 'push') {
    respond(202, ['skipped' => "event $event"]);
}

$payload = json_decode($body, true);
$branch = $cfg['branch'] ?? 'master';
if (!is_array($payload) || ($payload['ref'] ?? '') !== "refs/heads/$branch") {
    respond(202, ['skipped' => 'ref ' . ($payload['ref'] ?? '?')]);
}
$after = (string)($payload['after'] ?? '');

// Aynı anda gelen iki push'un çakışmaması için kilit.
$lock = fopen($home . '/.deploy/cevikcozum.lock', 'c');
if ($lock === false || !flock($lock, LOCK_EX)) {
    respond(503, ['error' => 'lock']);
}

try {
    $repo = cpanel($cfg, 'VersionControl', 'update', ['repository_root' => $cfg['repo_root'], 'branch' => $branch]);
    $head = (string)($repo['last_update']['identifier'] ?? '');
    $dep = cpanel($cfg, 'VersionControlDeployment', 'create', ['repository_root' => $cfg['repo_root']]);
    $depId = $dep['deploy_id'] ?? null;
    logLine($logFile, "push after=$after head=$head deploy_id=$depId delivery=$delivery");
    respond(202, [
        'accepted' => true,
        'pushed' => $after,
        'head' => $head,
        'inSync' => $after === '' || $after === $head,
        'deployId' => $depId,
        'status' => '/_deploy/status.json',
    ]);
} catch (Throwable $e) {
    logLine($logFile, 'HATA ' . $e->getMessage() . " delivery=$delivery");
    respond(502, ['error' => 'deploy failed']);
} finally {
    flock($lock, LOCK_UN);
}
