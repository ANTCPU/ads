export async function GET() {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=pi-network,stellar,bitcoin,ethereum,solana&vs_currencies=usd,usd_24h_change',
    {
      headers: {
        'x-cg-demo-api-key': process.env.CryptoPriceAPIkey || '',
      },
      next: { revalidate: 300 }, // 5 min — ~8,640 calls/month, stays within 10k free limit
    }
  );

  const data = await res.json();
  return Response.json(data);
}
