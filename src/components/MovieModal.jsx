// Modal for detailed movie information.
// Receives all state from App so it stays purely presentational.
const MovieModal = ({
  movieDetails,
  isLoading,
  error,
  aiInsight,
  isLoadingAI,
  aiError,
  trailerKey,
  isLoadingTrailer,
  trailerError,
  onGenerateAiInsight,
  onClose,
}) => {
  // Render nothing when modal should be closed.
  if (!movieDetails && !isLoading && !error) {
    return null;
  }

  // Optional backdrop image in the modal header area.
  const backdropUrl = movieDetails?.backdrop_path
    ? `https://image.tmdb.org/t/p/w780${movieDetails.backdrop_path}`
    : null;

  // User-friendly genre display.
  const genresLabel =
    Array.isArray(movieDetails?.genres) && movieDetails.genres.length > 0
      ? movieDetails.genres.map((genre) => genre.name).join(', ')
      : 'Not available';

  return (
    <div
      className="movie-modal-overlay"
      role="presentation"
      onClick={(event) => {
        // Close when user clicks outside modal content.
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="movie-modal" role="dialog" aria-modal="true" aria-label="Movie details">
        <button type="button" className="movie-modal-close" onClick={onClose} aria-label="Close movie details">
          ×
        </button>

        {isLoading && <p className="status-message">Loading movie details...</p>}
        {error && <p className="status-message status-message-error">{error}</p>}

        {!isLoading && !error && movieDetails && (
          <>
            {/* Main movie detail block */}
            {backdropUrl ? (
              <img
                className="movie-modal-backdrop"
                src={backdropUrl}
                alt={`${movieDetails.title} backdrop`}
              />
            ) : null}
            <h2>{movieDetails.title}</h2>
            <p><strong>Runtime:</strong> {movieDetails.runtime ? `${movieDetails.runtime} min` : 'Not available'}</p>
            <p><strong>Release Date:</strong> {movieDetails.release_date || 'Not available'}</p>
            <p><strong>Genres:</strong> {genresLabel}</p>
            <p className="movie-modal-overview">{movieDetails.overview || 'No overview available.'}</p>

            {/* AI stretch feature */}
            <section className="movie-modal-section">
              <h3>Watch Recommendation</h3>
              <button
                type="button"
                className="generate-ai-button"
                onClick={onGenerateAiInsight}
                disabled={isLoadingAI}
              >
                {isLoadingAI ? 'Generating...' : 'Generate AI Recommendation'}
              </button>
              {isLoadingAI ? (
                <p>✨ Getting a recommendation...</p>
              ) : (
                <p className="movie-modal-overview">
                  {aiInsight || aiError || 'No recommendation available.'}
                </p>
              )}
            </section>

            {/* Trailer stretch feature */}
            <section className="movie-modal-section">
              <h3>Trailer</h3>
              {isLoadingTrailer && <p>Loading trailer...</p>}
              {!isLoadingTrailer && trailerKey && (
                <div className="trailer-frame-wrapper">
                  <iframe
                    title={`${movieDetails.title} trailer`}
                    src={`https://www.youtube.com/embed/${trailerKey}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              )}
              {!isLoadingTrailer && !trailerKey && (
                <p>{trailerError || 'No trailer available for this movie.'}</p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default MovieModal;
