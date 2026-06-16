// Controlled form component:
// - value comes from parent state (`query`)
// - every change calls back to parent (`onQueryChange`)
// - submit triggers search fetch in App
const SearchBar = ({
  query,
  onQueryChange,
  onSearchSubmit,
  onShowNowPlaying,
  isLoading,
}) => {
  // Prevent full page reload and trigger App search handler.
  const handleSubmit = (event) => {
    event.preventDefault();
    onSearchSubmit();
  };

  return (
    <div className="search-controls">
      <form className="search-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search movies by title..."
          aria-label="Search movies by title"
          disabled={isLoading}
        />
        {/* Disabled while loading or when query is empty */}
        <button type="submit" disabled={isLoading || query.trim() === ''}>
          Search
        </button>
      </form>

      {/* Quick reset back to now playing mode */}
      <button
        type="button"
        className="now-playing-button"
        onClick={onShowNowPlaying}
        disabled={isLoading}
      >
        Now Playing
      </button>
    </div>
  );
};

export default SearchBar;
