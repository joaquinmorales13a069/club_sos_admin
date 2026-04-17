const EA_BASE_URL = import.meta.env.VITE_EA_API_URL;
const EA_API_KEY = import.meta.env.VITE_EA_API_KEY;

const eaHeaders = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${EA_API_KEY}`,
};

export async function getDisponibilidad(
  eaProviderId: number,
  eaServiceId: number,
  fecha: string,
): Promise<string[]> {
  const url = `${EA_BASE_URL}/availabilities?providerId=${eaProviderId}&serviceId=${eaServiceId}&date=${fecha}`;
  const res = await fetch(url, { headers: eaHeaders });
  if (!res.ok) throw new Error(`Error disponibilidad (HTTP ${res.status})`);
  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as string[]) : [];
}
