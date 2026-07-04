export async function GET() {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=pi-network&vs_currencies=usd',
    {
      headers: {
        'x-cg-demo-api-key': process.env.CryptoPriceAPIkey || '',
      },
      next: { revalidate: 60 }, // cache refreshes every 60 seconds
    }
  );

  const data = await res.json();
  return Response.json(data);
}
