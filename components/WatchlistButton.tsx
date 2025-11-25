"use client";

import { useMemo, useState } from "react";
import { Button } from "./ui/button";
import {
  addToWatchlist,
  removeFromWatchlist,
} from "@/lib/actions/watchlist.actions";

const WatchlistButton = ({
  symbol,
  company,
  isInWatchlist,
  showTrashIcon = false,
  type = "button",
  onWatchlistChange,
}: WatchlistButtonProps) => {
  const [added, setAdded] = useState<boolean>(!!isInWatchlist);
  const [loading, setLoading] = useState<boolean>(false);

  const label = useMemo(() => {
    if (type === "icon") return added ? "" : "";
    return added ? "Remove from Watchlist" : "Add to Watchlist";
  }, [added, type]);

  const handleClick = async () => {
    if (loading) return;
    const next = !added;
    // optimistic update
    setAdded(next);
    onWatchlistChange?.(symbol, next);
    setLoading(true);

    try {
      if (next) {
        const res = await addToWatchlist({
          symbol,
          company: company?.trim() || symbol,
        });
        if (!("ok" in res && res.ok)) throw new Error(res?.error || "Add failed");
      } else {
        const res = await removeFromWatchlist({ symbol });
        if (!("ok" in res && res.ok)) throw new Error(res?.error || "Remove failed");
      }
    } catch (err) {
      console.error("WatchlistButton toggle error:", err);
      // revert optimistic update
      setAdded(!next);
      onWatchlistChange?.(symbol, !next);
    } finally {
      setLoading(false);
    }
  };

  if (type === "icon") {
    return (
      <Button
        title={
          added
            ? `Remove ${symbol} from Watchlist`
            : `Add ${symbol} to Watchlist`
        }
        aria-label={
          added
            ? `Remove ${symbol} from Watchlist`
            : `Add ${symbol} to Watchlist`
        }
        className={`watchlist-icon-btn ${added ? "watchlist-icon-added" : ""}`}
        onClick={handleClick}
        disabled={loading}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={added ? "#FACC15" : "none"}
          stroke="#FACC15"
          strokeWidth="1.5"
          className="watchlist-star"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.385a.563.563 0 00-.182-.557L3.04 10.385a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345l2.125-5.111z"
          />
        </svg>
      </Button>
    );
  }

  return (
    <Button
      className={`watchlist-btn ${added ? "watchlist-remove" : ""}`}
      onClick={handleClick}
      disabled={loading}
    >
      {showTrashIcon && added ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5 mr-2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 4v6m4-6v6m4-6v6"
          />
        </svg>
      ) : null}
      <span>{label}</span>
    </Button>
  );
};

export default WatchlistButton;
