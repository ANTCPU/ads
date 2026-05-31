#!/bin/bash
BASE="${1:-live}"
if [ "$BASE" = "local" ]; then
  URL="http://localhost:3001"
else
  URL="https://antcpu-ads.vercel.app"
fi
TOKEN="antcpu-test-2026"
AGENT_TOKEN="antcpu-agent-2026"
echo "⚡ ANTCPU ADS — Autotest"
echo "Target: $URL"
echo "────────────────────────"
echo "→ /api/agent"
curl -s "$URL/api/agent?token=$AGENT_TOKEN" | python3 -m json.tool 2>/dev/null | grep -E '"total_active_ads"|"total_users"|"version"' || echo "  ⚠ agent endpoint failed"
echo "→ /api/doorbell"
curl -s -X POST "$URL/api/doorbell" -H "Content-Type: application/json" -d "{\"page\":\"/autotest\",\"ref\":\"terminal\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"ua\":\"autotest-runner/1.0\"}" | python3 -m json.tool 2>/dev/null || echo "  ⚠ doorbell failed"
echo "→ /api/scout/score"
curl -s "$URL/api/scout/score" | python3 -m json.tool 2>/dev/null || echo "  ⚠ scout score failed"
echo "→ /dashboard/test"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/dashboard/test?token=$TOKEN")
if [ "$STATUS" = "200" ]; then
  echo "  ✅ dashboard/test accessible — HTTP $STATUS"
else
  echo "  ⚠ dashboard/test returned HTTP $STATUS"
fi
echo "────────────────────────"
echo "✅ Autotest complete"
