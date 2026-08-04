# /api/pi/auth

POST endpoint. Called client-side after `Pi.authenticate()` succeeds.

## Input
```json
{
  "accessToken": "string — from Pi.authenticate()",
  "user": {
    "uid": "string",
    "username": "string",
    "walletAddress": "string | null"
  }
}
