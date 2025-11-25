const NewsCard = ({
  id,
  url,
  headline,
  source,
  datetime,
  summary,
  related,
}: MarketNewsArticle) => {
  const tag = (related || "MARKET").toUpperCase();
  const dateStr = datetime
    ? new Date(datetime * 1000).toLocaleDateString()
    : "";
  return (
    <article key={id} className="news-item">
      <div className="mb-2">
        <span className="news-tag">{tag}</span>
      </div>
      <h3 className="news-title">{headline}</h3>
      <div className="news-meta">
        {source} • {dateStr}
      </div>
      <p className="news-summary">{summary}</p>
      <a href={url} className="news-cta">
        Read More
      </a>
    </article>
  );
};

export default NewsCard;
