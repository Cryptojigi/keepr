import type { Creator, CreatorRate, PricingType, VendedItem } from "./types";

export type PortableChannelPayload = {
  v: 1;
  id: string;
  name: string;
  handle: string;
  category: string;
  blurb: string;
  address: string;
  ownerAddress?: string;
  pricingType?: PricingType;
  discoverable?: boolean;
  serviceUrl?: string;
  rates: Array<{ id: number; name: string; strk: number }>;
  items?: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    priceStrk: number;
    deliveryUrl: string;
  }>;
};

/**
 * Encodes channel metadata and optional items into a URL-safe base64 string.
 */
export function encodeChannelSharePayload(params: {
  channel: Creator;
  rates: CreatorRate[];
  items?: VendedItem[];
}): string {
  const { channel, rates, items = [] } = params;

  const payload: PortableChannelPayload = {
    v: 1,
    id: channel.id,
    name: channel.name,
    handle: channel.handle,
    category: channel.category,
    blurb: channel.blurb,
    address: channel.address,
    ownerAddress: channel.ownerAddress,
    pricingType: channel.pricingType ?? (rates.length === 1 ? "flat" : "tiered"),
    discoverable: channel.discoverable,
    serviceUrl: channel.serviceUrl,
    rates: rates.map((r) => ({ id: r.id, name: r.name, strk: r.strk })),
    items: items.map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      category: i.category,
      priceStrk: i.priceStrk,
      deliveryUrl: i.deliveryUrl,
    })),
  };

  try {
    const jsonStr = JSON.stringify(payload);
    // URL-safe base64
    if (typeof window !== "undefined" && typeof window.btoa === "function") {
      return btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      }))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    }
    return Buffer.from(jsonStr, "utf-8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch (err) {
    console.error("Failed to encode channel payload:", err);
    return "";
  }
}

/**
 * Decodes a URL-safe base64 string into a validated PortableChannelPayload.
 */
export function decodeChannelSharePayload(
  raw: string,
): PortableChannelPayload | null {
  if (!raw) return null;
  try {
    // Restore base64 standard padding
    let base64 = raw.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }

    let jsonStr = "";
    if (typeof window !== "undefined" && typeof window.atob === "function") {
      const binary = atob(base64);
      jsonStr = decodeURIComponent(
        Array.prototype.map
          .call(binary, (ch: string) => {
            return "%" + ("00" + ch.charCodeAt(0).toString(16)).slice(-2);
          })
          .join(""),
      );
    } else {
      jsonStr = Buffer.from(base64, "base64").toString("utf-8");
    }

    const parsed = JSON.parse(jsonStr) as PortableChannelPayload;
    if (!parsed || !parsed.id || !parsed.name || !parsed.address) {
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn("Failed to decode channel payload:", err);
    return null;
  }
}

/**
 * Construct full shareable URL with embedded self-describing payload.
 */
export function buildShareableChannelUrl(params: {
  channel: Creator;
  rates: CreatorRate[];
  items?: VendedItem[];
  origin?: string;
}): string {
  const baseOrigin =
    params.origin ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "https://keepr.cash");

  const token = encodeChannelSharePayload(params);
  if (!token) {
    return `${baseOrigin}/subscribe?channel=${encodeURIComponent(params.channel.id)}`;
  }
  return `${baseOrigin}/subscribe?channel=${encodeURIComponent(params.channel.id)}&data=${encodeURIComponent(token)}`;
}
