// Sidebar shows quick personal lists and filtering controls.
// Data is fully controlled by App state.
const Sidebar = ({
  filterMode,
  onFilterModeChange,
  favoriteMovies,
  watchedMovies,
}) => {
  return (
    <aside className="sidebar">
      <h2>My Lists</h2>

      {/* Filter controls affect which movies are shown in the main grid */}
      <div className="sidebar-filters">
        <button
          type="button"
          className={filterMode === 'all' ? 'sidebar-filter-active' : ''}
          onClick={() => onFilterModeChange('all')}
        >
          All Movies
        </button>
        <button
          type="button"
          className={filterMode === 'favorites' ? 'sidebar-filter-active' : ''}
          onClick={() => onFilterModeChange('favorites')}
        >
          Favorites
        </button>
        <button
          type="button"
          className={filterMode === 'watched' ? 'sidebar-filter-active' : ''}
          onClick={() => onFilterModeChange('watched')}
        >
          Watched
        </button>
      </div>

      {/* Read-only summary of favorited movies */}
      <div className="sidebar-section">
        <h3>Favorited</h3>
        {favoriteMovies.length === 0 ? (
          <p className="sidebar-empty">No favorites yet.</p>
        ) : (
          <ul>
            {favoriteMovies.map((movie) => (
              <li key={movie.id}>{movie.title}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Read-only summary of watched movies */}
      <div className="sidebar-section">
        <h3>Watched</h3>
        {watchedMovies.length === 0 ? (
          <p className="sidebar-empty">No watched movies yet.</p>
        ) : (
          <ul>
            {watchedMovies.map((movie) => (
              <li key={movie.id}>{movie.title}</li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
