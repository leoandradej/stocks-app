"use client";

import { useDebounce } from "@/hooks/useDebounce";
import { searchStocks } from "@/lib/actions/finnhub.actions";
import {
  addToWatchlist,
  removeFromWatchlist,
} from "@/lib/actions/watchlist.actions";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandList,
} from "./ui/command";
import { Loader2, Star, TrendingUp } from "lucide-react";
import Link from "next/link";

const SearchCommand = ({
  renderAs = "button",
  label = "Add stock",
  initialStocks,
}: SearchCommandProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stocks, setStocks] =
    useState<StockWithWatchlistStatus[]>(initialStocks);

  // "!!" to turn it into a boolean value
  const isSearchMode = !!searchTerm.trim();
  const displayStocks = isSearchMode ? stocks : stocks?.slice(0, 10);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSearch = async () => {
    if (!isSearchMode) return setStocks(initialStocks);

    setIsLoading(true);

    try {
      const results = await searchStocks(searchTerm.trim());
      setStocks(results);
    } catch (error) {
      console.error(error);
      setStocks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const debouncedSearch = useDebounce(handleSearch, 300);

  useEffect(() => {
    debouncedSearch();
  }, [searchTerm]);

  const handleSelectStock = () => {
    setIsOpen(false);
    setSearchTerm("");
    setStocks(initialStocks);
  };

  const toggleWatchlist = async (
    e: React.MouseEvent,
    stock: StockWithWatchlistStatus
  ) => {
    // Prevent navigating when clicking the star
    e.preventDefault();
    e.stopPropagation();

    const { symbol, name } = stock;
    const next = !stock.isInWatchlist;

    // Optimistic update
    setStocks((prev) =>
      (prev || []).map((s) =>
        s.symbol === symbol ? { ...s, isInWatchlist: next } : s
      )
    );

    try {
      if (next) {
        const res = await addToWatchlist({ symbol, company: name });
        if (!("ok" in res && res.ok)) throw new Error("Add failed");
      } else {
        const res = await removeFromWatchlist({ symbol });
        if (!("ok" in res && res.ok)) throw new Error("Remove failed");
      }
    } catch (err) {
      console.error(err);
      // Revert optimistic change on error
      setStocks((prev) =>
        (prev || []).map((s) =>
          s.symbol === symbol ? { ...s, isInWatchlist: !next } : s
        )
      );
    }
  };

  return (
    <>
      {renderAs === "text" ? (
        <span onClick={() => setIsOpen(true)} className="search-text">
          {label}
        </span>
      ) : (
        <Button onClick={() => setIsOpen(true)} className="search-btn">
          {label}
        </Button>
      )}

      <CommandDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        className="search-dialog"
      >
        <div className="search-field">
          <CommandInput
            value={searchTerm}
            onValueChange={setSearchTerm}
            placeholder="Search stocks..."
            className="search-input"
          />
          {isLoading && <Loader2 className="search-loader" />}
        </div>
        <CommandList className="search-list">
          {isLoading ? (
            <CommandEmpty className="search-list-empty">
              Loading stocks...
            </CommandEmpty>
          ) : displayStocks?.length === 0 ? (
            <div className="search-list-indicator">
              {isSearchMode ? "No results found" : "No stocks available"}
            </div>
          ) : (
            <ul>
              <div className="search-count">
                {isSearchMode ? "Search results" : "Popular stocks"} (
                {displayStocks?.length || 0})
              </div>
              {displayStocks?.map((stock) => (
                <li key={stock.symbol} className="search-item">
                  <Link
                    href={`/stocks/${stock.symbol}`}
                    onClick={handleSelectStock}
                    className="search-item-link"
                  >
                    <TrendingUp className="h-4 w-4 text-gray-500" />
                    <div className="flex-1">
                      <div className="search-item-name">{stock.name}</div>
                      <div className="text-sm text-gray-500">
                        {stock.symbol} | {stock.exchange} | {stock.type}
                      </div>
                    </div>
                    <Star
                      className={`h-5 w-5 transition-colors hover:stroke-amber-300 hover:fill-amber-300 ${
                        stock.isInWatchlist
                          ? "stroke-amber-300 fill-amber-300"
                          : ""
                      }`}
                      onClick={(e) => toggleWatchlist(e, stock)}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default SearchCommand;
