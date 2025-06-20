export async function getInitialServices() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/services`);
  const json = await res.json();
  return json.success ? json.data : [];
}