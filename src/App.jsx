import { useEffect, useMemo, useState } from 'react';
import Footer from './components/Footer';
import Header from './components/Header';
import MovieList from './components/MovieList';
import MovieModal from './components/MovieModal';
import Sidebar from './components/Sidebar';
import promptTemplate from './prompt.txt?raw';
import './App.css';

// External API endpoints used by this app.
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Friendly fallback shown when AI is unavailable.
const AI_FALLBACK_MESSAGE =
  "We couldn't generate a recommendation for this one — check out the overview above!";

// OpenRouter providers can return content as a string OR as structured parts.
// This helper normalizes both formats into one plain string for UI display.
const extractAssistantText = (content) => {
  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }
        if (part && typeof part === 'object') {
          if (typeof part.text === 'string') {
            return part.text;
          }
          if (part.type === 'text' && typeof part.content === 'string') {
            return part.content;
          }
        }
        return '';
      })
      .join(' ')
      .trim();
  }

  return '';
};

// Builds OpenRouter system/user messages from prompt.txt.
// Keeping prompt content in a text file makes prompt iterations easier to present and track.
const buildPromptMessages = ({ title, genres, overview }) => {
  const compiledPrompt = promptTemplate
    .replace('{{title}}', title)
    .replace('{{genres}}', genres)
    .replace('{{overview}}', overview);

  const [systemChunk = '', userChunk = ''] = compiledPrompt.split('\n\nUSER:\n');
  const systemPrompt = systemChunk.replace(/^SYSTEM:\n/, '').trim();
  const userPrompt = userChunk.trim();

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
};

const App = () => {
  // --------------------------
  // Core list/search state
  // --------------------------
  const [movies, setMovies] = useState([]);
  // Quick lookup table for movie objects by id.
  // Used by the sidebar to render titles for favorite/watched IDs.
  const [movieCatalog, setMovieCatalog] = useState({});
  const [query, setQuery] = useState('');
  // mode controls which endpoint is used: now_playing or search
  const [mode, setMode] = useState('now_playing');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Sidebar filter for what subset of currently loaded movies to display.
  const [filterMode, setFilterMode] = useState('all');
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listError, setListError] = useState(null);
  // Keeps the submitted search term stable when user keeps typing.
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('title');

  // --------------------------
  // Modal + movie details state
  // --------------------------
  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  // --------------------------
  // Stretch features state
  // --------------------------
  const [favoriteMovieIds, setFavoriteMovieIds] = useState(new Set());
  const [watchedMovieIds, setWatchedMovieIds] = useState(new Set());

  // --------------------------
  // AI and trailer state (modal)
  // --------------------------
  const [aiInsight, setAiInsight] = useState(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [trailerKey, setTrailerKey] = useState(null);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);
  const [trailerError, setTrailerError] = useState(null);

  // API keys from .env (Vite exposes these as import.meta.env).
  const apiKey = import.meta.env.VITE_API_KEY;
  const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  // Builds the correct TMDb URL based on list mode and pagination.
  const buildMoviesUrl = (requestMode, pageNumber, searchTerm = '') => {
    const endpoint =
      requestMode === 'search' ? `${TMDB_BASE_URL}/search/movie` : `${TMDB_BASE_URL}/movie/now_playing`;
    const url = new URL(endpoint);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('language', 'en-US');
    url.searchParams.set('page', String(pageNumber));

    if (requestMode === 'search') {
      url.searchParams.set('query', searchTerm);
      url.searchParams.set('include_adult', 'false');
    }

    return url.toString();
  };

  // Fetches list data (now playing or search), with append support for "Load More".
  const fetchMovies = async ({ requestMode, pageNumber, searchTerm = '', append = false }) => {
    setIsLoadingList(true);
    setListError(null);

    try {
      const response = await fetch(buildMoviesUrl(requestMode, pageNumber, searchTerm));
      if (!response.ok) {
        throw new Error(`TMDb request failed with status ${response.status}`);
      }

      const data = await response.json();
      const nextResults = Array.isArray(data.results) ? data.results : [];

      // Keep a normalized catalog so sidebar can map ID -> title quickly.
      setMovieCatalog((prevCatalog) => {
        const nextCatalog = { ...prevCatalog };
        nextResults.forEach((movie) => {
          nextCatalog[movie.id] = movie;
        });
        return nextCatalog;
      });

      setMovies((prevMovies) => (append ? [...prevMovies, ...nextResults] : nextResults));
      setTotalPages(typeof data.total_pages === 'number' ? data.total_pages : 1);
      setPage(pageNumber);
    } catch (error) {
      // Generic message keeps UI user-friendly; raw error stays out of UI.
      setListError('Unable to load movies right now. Please try again.');
    } finally {
      setIsLoadingList(false);
    }
  };

  // Fetches trailer video metadata and selects the best YouTube trailer.
  const fetchMovieTrailer = async (movieId) => {
    setIsLoadingTrailer(true);
    setTrailerError(null);
    setTrailerKey(null);

    try {
      const url = new URL(`${TMDB_BASE_URL}/movie/${movieId}/videos`);
      url.searchParams.set('api_key', apiKey);
      url.searchParams.set('language', 'en-US');

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`TMDb videos request failed with status ${response.status}`);
      }

      const data = await response.json();
      const videos = Array.isArray(data.results) ? data.results : [];
      // Prefer an official YouTube trailer, fall back to any YouTube trailer.
      const trailer =
        videos.find((video) => video.site === 'YouTube' && video.type === 'Trailer' && video.official) ||
        videos.find((video) => video.site === 'YouTube' && video.type === 'Trailer');

      if (!trailer?.key) {
        setTrailerError('No trailer found for this movie.');
        return;
      }

      setTrailerKey(trailer.key);
    } catch (error) {
      setTrailerError('Unable to load trailer right now.');
    } finally {
      setIsLoadingTrailer(false);
    }
  };

  // Calls OpenRouter to generate a short recommendation for the selected movie.
  const getMovieInsight = async (title, genres, overview) => {
    if (!openRouterKey) {
      return AI_FALLBACK_MESSAGE;
    }

    try {
      const messages = buildPromptMessages({ title, genres, overview });
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          messages,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenRouter error ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      const rawContent = data?.choices?.[0]?.message?.content;
      const content = extractAssistantText(rawContent);
      return content || AI_FALLBACK_MESSAGE;
    } catch (error) {
      console.error('AI insight failed:', error);
      return AI_FALLBACK_MESSAGE;
    }
  };

  // Fetches full details used by the modal (runtime, genres, overview, etc).
  const fetchMovieDetails = async (movieId) => {
    if (!apiKey) {
      setDetailsError('Missing TMDb API key. Add VITE_API_KEY to your .env file.');
      return;
    }

    setIsLoadingDetails(true);
    setDetailsError(null);
    setMovieDetails(null);

    try {
      const url = new URL(`${TMDB_BASE_URL}/movie/${movieId}`);
      url.searchParams.set('api_key', apiKey);
      url.searchParams.set('language', 'en-US');

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`TMDb details request failed with status ${response.status}`);
      }

      const data = await response.json();
      setMovieDetails(data);
    } catch (error) {
      setDetailsError('Unable to load movie details right now. Please try again.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Initial load: show now playing page 1.
  useEffect(() => {
    if (!apiKey) {
      setListError('Missing TMDb API key. Add VITE_API_KEY to your .env file.');
      return;
    }

    fetchMovies({ requestMode: 'now_playing', pageNumber: 1 });
  }, [apiKey]);

  // Submits the current input as an actual search.
  const handleSearchSubmit = () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || !apiKey) {
      return;
    }

    setMode('search');
    setActiveSearchTerm(trimmedQuery);
    fetchMovies({ requestMode: 'search', pageNumber: 1, searchTerm: trimmedQuery });
  };

  // Resets UI back to now playing mode.
  const handleShowNowPlaying = () => {
    if (!apiKey) {
      return;
    }

    setMode('now_playing');
    setQuery('');
    setActiveSearchTerm('');
    fetchMovies({ requestMode: 'now_playing', pageNumber: 1 });
  };

  // Loads next page for whichever mode is active.
  const handleLoadMore = () => {
    if (!apiKey || isLoadingList || page >= totalPages) {
      return;
    }

    const nextPage = page + 1;
    const searchTerm = mode === 'search' ? activeSearchTerm : '';
    fetchMovies({ requestMode: mode, pageNumber: nextPage, searchTerm, append: true });
  };

  // Opens modal by storing selected movie ID.
  const handleSelectMovie = (movieId) => {
    setSelectedMovieId(movieId);
  };

  // Reusable helper for Set-based toggle state.
  // Keeps favorite/watched updates concise and immutable.
  const toggleIdInSet = (setState, movieId) => {
    setState((prevIds) => {
      const nextIds = new Set(prevIds);
      if (nextIds.has(movieId)) {
        nextIds.delete(movieId);
      } else {
        nextIds.add(movieId);
      }
      return nextIds;
    });
  };

  const handleToggleFavorite = (movieId) => {
    toggleIdInSet(setFavoriteMovieIds, movieId);
  };

  const handleToggleWatched = (movieId) => {
    toggleIdInSet(setWatchedMovieIds, movieId);
  };

  // Closes modal and resets all modal-specific async state
  // so next open starts from a clean slate.
  const handleCloseModal = () => {
    setSelectedMovieId(null);
    setMovieDetails(null);
    setDetailsError(null);
    setIsLoadingDetails(false);
    setAiInsight(null);
    setIsLoadingAI(false);
    setAiError(null);
    setTrailerKey(null);
    setIsLoadingTrailer(false);
    setTrailerError(null);
  };

  // Manual AI trigger: only runs when user clicks the generate button in the modal.
  const handleGenerateAiInsight = async () => {
    if (!movieDetails) {
      return;
    }

    const genres = Array.isArray(movieDetails.genres)
      ? movieDetails.genres.map((genre) => genre.name).join(', ')
      : 'Unknown genres';

    setIsLoadingAI(true);
    setAiError(null);

    const insight = await getMovieInsight(
      movieDetails.title || 'Unknown title',
      genres,
      movieDetails.overview || 'No overview provided.',
    );

    if (!insight) {
      setAiError(AI_FALLBACK_MESSAGE);
    }

    setAiInsight(insight || AI_FALLBACK_MESSAGE);
    setIsLoadingAI(false);
  };

  // Whenever selectedMovieId changes, fetch modal details.
  useEffect(() => {
    if (!selectedMovieId) {
      return;
    }

    fetchMovieDetails(selectedMovieId);
  }, [selectedMovieId]);

  // Once details are ready, fetch trailer.
  // AI is intentionally manual and only runs on button click.
  useEffect(() => {
    if (!movieDetails || !selectedMovieId) {
      return;
    }

    // Reset AI content when opening/fetching details for a movie.
    setAiInsight(null);
    setAiError(null);
    setIsLoadingAI(false);
    fetchMovieTrailer(selectedMovieId);
  }, [movieDetails, selectedMovieId]);

  // Allow ESC key to close modal.
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && selectedMovieId) {
        handleCloseModal();
      }
    };

    window.addEventListener('keydown', handleEscapeKey);
    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, [selectedMovieId]);

  // Derived list: apply sidebar filter first, then sort.
  // Keeps original `movies` state untouched.
  const sortedMovies = useMemo(() => {
    let filteredMovies = [...movies];

    if (filterMode === 'favorites') {
      filteredMovies = filteredMovies.filter((movie) => favoriteMovieIds.has(movie.id));
    }

    if (filterMode === 'watched') {
      filteredMovies = filteredMovies.filter((movie) => watchedMovieIds.has(movie.id));
    }

    const copy = [...filteredMovies];

    if (sortBy === 'vote_average') {
      return copy.sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0));
    }

    if (sortBy === 'release_date') {
      return copy.sort((a, b) => {
        const firstDate = a.release_date ? new Date(a.release_date).getTime() : 0;
        const secondDate = b.release_date ? new Date(b.release_date).getTime() : 0;
        return secondDate - firstDate;
      });
    }

    return copy.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
  }, [movies, sortBy, filterMode, favoriteMovieIds, watchedMovieIds]);

  // Sidebar arrays derived from ID sets + movie catalog.
  const favoriteMovies = useMemo(
    () => [...favoriteMovieIds].map((id) => movieCatalog[id]).filter(Boolean),
    [favoriteMovieIds, movieCatalog],
  );

  const watchedMovies = useMemo(
    () => [...watchedMovieIds].map((id) => movieCatalog[id]).filter(Boolean),
    [watchedMovieIds, movieCatalog],
  );

  return (
    <div className="App">
      <Header
        query={query}
        onQueryChange={setQuery}
        onSearchSubmit={handleSearchSubmit}
        onShowNowPlaying={handleShowNowPlaying}
        isLoading={isLoadingList}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />
      <main className="App-main">
        <Sidebar
          filterMode={filterMode}
          onFilterModeChange={setFilterMode}
          favoriteMovies={favoriteMovies}
          watchedMovies={watchedMovies}
        />
        <section className="content-area">
          {isLoadingList && movies.length === 0 && (
            <p className="status-message">Loading movies...</p>
          )}
          {listError && <p className="status-message status-message-error">{listError}</p>}
          {!isLoadingList && !listError && movies.length === 0 && (
            <p className="status-message">No movies found.</p>
          )}
          {movies.length > 0 && (
            <MovieList
              movies={sortedMovies}
              onSelectMovie={handleSelectMovie}
              favoriteMovieIds={favoriteMovieIds}
              watchedMovieIds={watchedMovieIds}
              onToggleFavorite={handleToggleFavorite}
              onToggleWatched={handleToggleWatched}
            />
          )}

          <div className="load-more-container">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoadingList || page >= totalPages || movies.length === 0}
            >
              {isLoadingList && movies.length > 0 ? 'Loading...' : 'Load More'}
            </button>
          </div>
        </section>
      </main>
      {selectedMovieId && (
        <MovieModal
          movieDetails={movieDetails}
          isLoading={isLoadingDetails}
          error={detailsError}
          aiInsight={aiInsight}
          isLoadingAI={isLoadingAI}
          aiError={aiError}
          trailerKey={trailerKey}
          isLoadingTrailer={isLoadingTrailer}
          trailerError={trailerError}
          onGenerateAiInsight={handleGenerateAiInsight}
          onClose={handleCloseModal}
        />
      )}
      <Footer />
    </div>
  );
};

export default App;
