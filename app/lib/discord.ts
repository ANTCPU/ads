// Shared Discord webhook — single source of truth
// Import this instead of hardcoding the URL in each file

export const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_ADS!;

export async function notifyDiscord(content: string): Promise<void> {
  try {
    if (!DISCORD_WEBHOOK) return;
    await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  } catch {}
}
