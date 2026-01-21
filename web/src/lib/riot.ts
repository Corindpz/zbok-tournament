import { env } from "@/lib/env";

const DDRAGON_CDN = "https://ddragon.leagueoflegends.com/cdn";

type ChampionSummary = {
  id: string;
  name: string;
  title: string;
  image: string;
};

// Fetch champions from Riot Data Dragon (public, pas besoin de clé)
export async function fetchChampions(): Promise<ChampionSummary[]> {
  const latestRes = await fetch(`${DDRAGON_CDN}/api/versions.json`, { cache: "force-cache" });
  const versions = (await latestRes.json()) as string[];
  const version = versions[0];
  const res = await fetch(`${DDRAGON_CDN}/${version}/data/en_US/champion.json`, { cache: "force-cache" });
  const json = await res.json();
  const data = json.data;
  return Object.values(data).map((champ: any) => ({
    id: champ.id,
    name: champ.name,
    title: champ.title,
    image: `${DDRAGON_CDN}/${version}/img/champion/${champ.image.full}`,
  }));
}

// Example call to Riot API (requires short-lived key). Keep for future use.
export async function fetchSummonerByName(name: string) {
  if (!env.riotApiKey) throw new Error("Riot API key missing");
  const res = await fetch(
    `https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(name)}`,
    { headers: { "X-Riot-Token": env.riotApiKey } }
  );
  if (!res.ok) throw new Error(`Riot API error ${res.status}`);
  return res.json();
}
