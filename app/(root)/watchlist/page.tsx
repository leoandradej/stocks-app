import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildWatchlistData, getNews } from "@/lib/actions/finnhub.actions";
import {
  getCurrentUserWatchlist,
  removeFromWatchlist,
} from "@/lib/actions/watchlist.actions";
import { Trash2 } from "lucide-react";
import { revalidatePath } from "next/cache";
import NewsCard from "@/components/NewsCard";

const RemoveButton = ({ symbol }: { symbol: string }) => {
  async function action() {
    "use server";
    const res = await removeFromWatchlist({ symbol });
    if ("ok" in res && res.ok) {
      revalidatePath("/watchlist");
    }
  }

  return (
    <form action={action}>
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-md p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
        aria-label={`Remove ${symbol} from Watchlist`}
        title={`Remove ${symbol} from Watchlist`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
};

const WatchlistPage = async () => {
  const items = await getCurrentUserWatchlist();
  const data = await buildWatchlistData(items);
  const symbols = data.map((d) => d.symbol);
  const news = await getNews(symbols);

  return (
    <div className="flex min-h-screen p-4 md:p-6 lg:p-8">
      <section className="grid w-full gap-10">
        <div className="space-y-4">
          <h1 className="text-xl font-semibold text-gray-100">Watchlist</h1>

          {data.length === 0 ? (
            <p className="text-sm text-gray-500">
              No symbols yet. Use Search to add stocks to your watchlist.
            </p>
          ) : (
            <Table className="watchlist-table">
              <TableHeader className="table-header-row ">
                <TableRow className="table-row">
                  <TableHead>Company</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Market Cap</TableHead>
                  <TableHead>P/E Ratio</TableHead>
                  <TableHead className="w-10 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.symbol}>
                    <TableCell className="table-cell">
                      <Link
                        href={`/stocks/${row.symbol}`}
                        className="hover:underline"
                      >
                        {row.company || row.symbol}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-400">
                      {row.symbol}
                    </TableCell>
                    <TableCell>{row.priceFormatted ?? "—"}</TableCell>
                    <TableCell
                      className={`${
                        typeof row.changePercent === "number"
                          ? row.changePercent >= 0
                            ? "text-green-500"
                            : "text-red-500"
                          : ""
                      }`}
                    >
                      {row.changeFormatted ?? "—"}
                    </TableCell>
                    <TableCell>{row.marketCap ?? "—"}</TableCell>
                    <TableCell>{row.peRatio ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <RemoveButton symbol={row.symbol} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-100">News</h2>
          {news?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {news.map((n) => (
                <NewsCard key={n.id} {...n} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No news available.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default WatchlistPage;
