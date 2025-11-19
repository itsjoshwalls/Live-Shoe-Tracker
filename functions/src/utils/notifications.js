import fetch from "node-fetch";

export async function sendDiscordAlert(message) {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return;
  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message }),
  });
}

export async function sendSlackAlert(message) {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return;
  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  });
}
