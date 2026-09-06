import { getSupabase, isSupabaseConfigured } from "./client";
import type { Creator, CreatorRate, PricingType, VendedItem } from "@/lib/keepr/types";

export interface RegistryChannelRow {
  id: string;
  name: string;
  handle: string;
  category: string;
  blurb: string | null;
  address: string;
  owner_address: string | null;
  pricing_model: string | null;
  rates: any;
  service_url: string | null;
  discoverable: boolean | null;
  created_at: string | null;
}

export interface AccessPassRow {
  id: string;
  channel_id: string;
  title: string;
  description: string | null;
  category: string;
  price_strk: number;
  delivery_url: string;
  active: boolean | null;
  created_at: string | null;
}

/**
 * Fetch all discoverable public creator channels from Supabase registry.
 * Falls back gracefully to empty array if Supabase is offline or unconfigured.
 */
export async function fetchRegistryChannels(): Promise<{
  channels: Creator[];
  rates: Record<string, CreatorRate[]>;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return { channels: [], rates: {} };
  }

  try {
    const { data, error } = await supabase
      .from("channels")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !Array.isArray(data)) {
      console.warn("Supabase channel fetch error:", error?.message);
      return { channels: [], rates: {} };
    }

    const channels: Creator[] = [];
    const rates: Record<string, CreatorRate[]> = {};

    for (const row of data as RegistryChannelRow[]) {
      const channelId = row.id;
      const pricingType: PricingType = (row.pricing_model === "flat" ? "flat" : "tiered") as PricingType;

      channels.push({
        id: channelId,
        name: row.name,
        handle: row.handle,
        category: row.category || "Intelligence",
        blurb: row.blurb || "",
        subscribers: 0,
        mrrStrk: 0,
        address: row.address,
        ownerAddress: row.owner_address || row.address,
        discoverable: row.discoverable !== false,
        serviceUrl: row.service_url || undefined,
        pricingType,
        isCustom: true,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      });

      if (Array.isArray(row.rates) && row.rates.length > 0) {
        rates[channelId] = row.rates.map((r: any) => ({
          id: Number(r.id) as 0 | 1 | 2,
          name: String(r.name || `Tier ${r.id}`),
          strk: Number(r.strk || 10),
        }));
      }
    }

    return { channels, rates };
  } catch (err) {
    console.warn("Exception fetching channels from Supabase:", err);
    return { channels: [], rates: {} };
  }
}

/**
 * Upsert a creator channel to the public Supabase registry.
 * Tied to the creator's wallet address (owner_address).
 */
export async function saveChannelToRegistry(
  channel: Creator,
  channelRates: CreatorRate[],
  ownerAddress?: string,
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const effectiveOwner = (ownerAddress || channel.ownerAddress || channel.address || "").toLowerCase();
    const row: RegistryChannelRow = {
      id: channel.id,
      name: channel.name,
      handle: channel.handle,
      category: channel.category,
      blurb: channel.blurb || "",
      address: channel.address,
      owner_address: effectiveOwner,
      pricing_model: channel.pricingType || "tiered",
      rates: channelRates,
      service_url: channel.serviceUrl || null,
      discoverable: channel.discoverable !== false,
      created_at: channel.createdAt ? new Date(channel.createdAt).toISOString() : new Date().toISOString(),
    };

    const { error } = await supabase.from("channels").upsert(row, { onConflict: "id" });
    if (error) {
      console.error("Failed to save channel to Supabase:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Exception saving channel to Supabase:", err);
    return false;
  }
}

/**
 * Delete a creator channel from the Supabase registry.
 */
export async function deleteChannelFromRegistry(channelId: string, ownerAddress?: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    let query = supabase.from("channels").delete().eq("id", channelId);
    if (ownerAddress) {
      query = query.eq("owner_address", ownerAddress);
    }
    const { error } = await query;
    if (error) {
      console.warn("Failed to delete channel from Supabase:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Exception deleting channel from Supabase:", err);
    return false;
  }
}

/**
 * Fetch Lifetime Access Passes for a channel (or all channels) from Supabase.
 */
export async function fetchAccessPassesFromRegistry(channelId?: string): Promise<VendedItem[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    let query = supabase.from("access_passes").select("*").eq("active", true);
    if (channelId) {
      query = query.eq("channel_id", channelId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error || !Array.isArray(data)) {
      console.warn("Failed to fetch access passes from Supabase:", error?.message);
      return [];
    }

    return (data as AccessPassRow[]).map((row) => ({
      id: row.id,
      creatorId: row.channel_id,
      creatorAddress: "",
      title: row.title,
      description: row.description || "",
      category: row.category || "Pass",
      priceStrk: Number(row.price_strk),
      deliveryUrl: row.delivery_url,
      active: row.active !== false,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    }));
  } catch (err) {
    console.warn("Exception fetching passes from Supabase:", err);
    return [];
  }
}

/**
 * Upsert a Lifetime Access Pass into Supabase.
 */
export async function saveAccessPassToRegistry(pass: VendedItem): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const row: AccessPassRow = {
      id: pass.id,
      channel_id: pass.creatorId,
      title: pass.title,
      description: pass.description || "",
      category: pass.category || "Pass",
      price_strk: pass.priceStrk,
      delivery_url: pass.deliveryUrl,
      active: pass.active !== false,
      created_at: pass.createdAt ? new Date(pass.createdAt).toISOString() : new Date().toISOString(),
    };

    const { error } = await supabase.from("access_passes").upsert(row, { onConflict: "id" });
    if (error) {
      console.warn("Failed to save access pass to Supabase:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Exception saving access pass to Supabase:", err);
    return false;
  }
}

/**
 * Delete a Lifetime Access Pass from Supabase.
 */
export async function deleteAccessPassFromRegistry(passId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from("access_passes").delete().eq("id", passId);
    return !error;
  } catch {
    return false;
  }
}
