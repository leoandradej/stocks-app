"use server";

import { connectToDatabase } from "@/database/mongoose";
import { Watchlist } from "@/database/models/watchlist.model";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";

export async function getWatchlistSymbolsByEmail(
  email: string
): Promise<string[]> {
  if (!email) return [];

  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection not found");

    // Better Auth stores users in the "user" collection
    const user = await db
      .collection("user")
      .findOne<{ _id?: unknown; id?: string; email?: string }>({ email });

    if (!user) return [];

    const userId = (user.id as string) || String(user._id || "");
    if (!userId) return [];

    const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
    return items.map((i) => String(i.symbol));
  } catch (err) {
    console.error("getWatchlistSymbolsByEmail error:", err);
    return [];
  }
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;
    return userId || null;
  } catch (err) {
    console.error("getCurrentUserId error:", err);
    return null;
  }
}

export async function getCurrentUserWatchlistSymbols(): Promise<string[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    await connectToDatabase();
    const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
    return items.map((i) => String(i.symbol).toUpperCase());
  } catch (err) {
    console.error("getCurrentUserWatchlistSymbols error:", err);
    return [];
  }
}

export async function getCurrentUserWatchlist(): Promise<
  { symbol: string; company: string; addedAt: Date }[]
> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    await connectToDatabase();
    const items = await Watchlist.find(
      { userId },
      { symbol: 1, company: 1, addedAt: 1 }
    ).lean();

    return items.map((i: any) => ({
      symbol: String(i.symbol).toUpperCase(),
      company: String(i.company || i.symbol),
      addedAt: i.addedAt as Date,
    }));
  } catch (err) {
    console.error("getCurrentUserWatchlist error:", err);
    return [];
  }
}

export async function addToWatchlist(params: {
  symbol: string;
  company: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { ok: false, error: "Unauthorized" };

    const symbol = params.symbol?.trim().toUpperCase();
    const company = params.company?.trim();
    if (!symbol || !company)
      return { ok: false, error: "Missing symbol/company" };

    await connectToDatabase();
    await Watchlist.updateOne(
      { userId, symbol },
      { $setOnInsert: { userId, symbol, company, addedAt: new Date() } },
      { upsert: true }
    );
    return { ok: true };
  } catch (err: any) {
    console.error("addToWatchlist error:", err);
    return { ok: false, error: err?.message || "Failed to add" };
  }
}

export async function removeFromWatchlist(params: {
  symbol: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { ok: false, error: "Unauthorized" };

    const symbol = params.symbol?.trim().toUpperCase();
    if (!symbol) return { ok: false, error: "Missing symbol" };

    await connectToDatabase();
    await Watchlist.deleteOne({ userId, symbol });
    return { ok: true };
  } catch (err: any) {
    console.error("removeFromWatchlist error:", err);
    return { ok: false, error: err?.message || "Failed to remove" };
  }
}
