import './MovieCard.css';

// Displays one movie summary card and exposes interactions:
// - open modal
// - toggle favorite
// - toggle watched
function MovieCard({ movie, onClick, isFavorite, isWatched, onToggleFavorite, onToggleWatched }) {
  // Build poster URL safely, with a fallback image if poster is missing.
  const posterUrl = movie?.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : 'https://via.placeholder.com/500x750?text=No+Poster';

  // Display vote average in a consistent format.
  const voteAverage =
    typeof movie?.vote_average === 'number' ? movie.vote_average.toFixed(1) : 'N/A';

  // Card click opens detail modal in parent.
  const handleClick = () => {
    if (onClick && movie?.id) {
      onClick(movie.id);
    }
  };

  return (
    <article className={`movie-card ${isFavorite ? 'movie-card-favorite' : ''} ${isWatched ? 'movie-card-watched' : ''}`}>
      {/* Favorite toggle stays outside card button to avoid nested button behavior issues. */}
      <button
        type="button"
        className={`favorite-button ${isFavorite ? 'favorite-button-active' : ''}`}
        onClick={() => onToggleFavorite(movie.id)}
        aria-label={isFavorite ? 'Remove favorite' : 'Mark as favorite'}
      >
        {isFavorite ? '♥' : '♡'}
      </button>

      {/* Main clickable card area */}
      <button type="button" className="movie-card-button" onClick={handleClick}>
        <img
          className="movie-card-poster"
          src={posterUrl}
          alt={movie?.title ? `${movie.title} poster` : 'Movie poster'}
        />
        <div className="movie-card-body">
          <h3 className="movie-card-title">{movie?.title || 'Untitled Movie'}</h3>
          <p className="movie-card-rating">Vote Average: {voteAverage}</p>
        </div>
      </button>

      {/* Watched status toggle */}
      <label className="watched-checkbox">
        <input
          type="checkbox"
          checked={isWatched}
          onChange={() => onToggleWatched(movie.id)}
        />
        Watched
      </label>
    </article>
  );
}

export default MovieCard;
