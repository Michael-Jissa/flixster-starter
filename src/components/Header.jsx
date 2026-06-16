import SearchBar from './SearchBar';
import SortControl from './SortControl';

// Header is intentionally "dumb":
// it only lays out controls and delegates all behavior to App via props.
const Header = ({
  query,
  onQueryChange,
  onSearchSubmit,
  onShowNowPlaying,
  isLoading,
  sortBy,
  onSortChange,
}) => {
  return (
    <header className="app-header">
      {/* Brand / app title */}
      <h1 className="app-brand">Flixster</h1>

      {/* Search controls (input + search submit + now playing reset) */}
      <SearchBar
        query={query}
        onQueryChange={onQueryChange}
        onSearchSubmit={onSearchSubmit}
        onShowNowPlaying={onShowNowPlaying}
        isLoading={isLoading}
      />

      {/* Sort dropdown for currently visible movies */}
      <SortControl sortBy={sortBy} onSortChange={onSortChange} />
    </header>
  );
};

export default Header;
