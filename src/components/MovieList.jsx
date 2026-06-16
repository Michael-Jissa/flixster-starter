import MovieCard from './MovieCard';

// Renders the movie grid.
// This component does not fetch data; it only displays what App provides.
const MovieList = ({
  movies,
  onSelectMovie,
  favoriteMovieIds,
  watchedMovieIds,
  onToggleFavorite,
  onToggleWatched,
}) => {
  return (
    <section className="movie-list" aria-live="polite">
      {/* Each movie gets one card. */}
      {movies.map((movie) => (
        <MovieCard
          key={movie.id}
          movie={movie}
          onClick={onSelectMovie}
          isFavorite={favoriteMovieIds.has(movie.id)}
          isWatched={watchedMovieIds.has(movie.id)}
          onToggleFavorite={onToggleFavorite}
          onToggleWatched={onToggleWatched}
        />
      ))}
    </section>
  );
};

export default MovieList;
