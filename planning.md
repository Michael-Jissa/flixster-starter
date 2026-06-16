# Flixster Project Spec

## 1) Component Architecture

### Parent-child hierarchy

- `App`
  - `Header`
    - `SearchBar`
    - `SortControl`
    - `NowPlayingButton` (can be inside `Header` or `SearchBar` actions area)
  - `MainContent`
    - `StatusBanner` (loading/error/empty states)
    - `MovieList`
      - many `MovieCard`
    - `LoadMoreButton`
  - `MovieModal` (conditionally rendered)
  - `Sidebar`
  - `Footer`

### Components

#### `App`
- **Responsibility:** Orchestrates API calls, global UI state, and page-level layout.
- **Renders:** `Header`, `SearchBar`, `SortControl`, `MovieList`, `LoadMoreButton`, `MovieModal`, `Footer`, plus loading/error/empty UI.
- **Props:** none.
- **State owned:** yes (core app state, modal state, AI state, loading/error state).

#### `Header`
- **Responsibility:** Displays app branding and top controls region.
- **Renders:** app title/logo area and children controls (`SearchBar`, `SortControl`, `Now Playing` reset action).
- **Props:** optional handler props if controls are lifted here (`query`, `onQueryChange`, `onSearchSubmit`, `sortBy`, `onSortChange`, `onResetNowPlaying`).
- **State owned:** no (presentational).

#### `SearchBar`
- **Responsibility:** Captures user movie-title input and triggers search.
- **Renders:** text input, submit button, optional clear button.
- **Props:** `query: string`, `onQueryChange: (value: string) => void`, `onSearchSubmit: () => void`, `onClearSearch: () => void`.
- **State owned:** optional local input draft state (if not fully controlled by parent). Preferred: no local state (controlled input from `App`).

#### `SortControl`
- **Responsibility:** Lets user choose sort method for the currently displayed list.
- **Renders:** `<select>` dropdown with options `title`, `release_date`, `vote_average`.
- **Props:** `sortBy: 'title' | 'release_date' | 'vote_average'`, `onSortChange: (value) => void`.
- **State owned:** no.

#### `MovieList`
- **Responsibility:** Displays the current list of movies in a responsive grid.
- **Renders:** grid container and one `MovieCard` per movie.
- **Props:** `movies: MovieSummary[]`, `onSelectMovie: (movieId: number) => void`.
- **State owned:** no.

#### `MovieCard`
- **Responsibility:** Shows summary info for one movie and emits selection on click.
- **Renders:** poster image, title, vote average, optional release date.
- **Props:** `movie: MovieSummary`, `onClick: (movieId: number) => void`.
- **State owned:** no.

#### `MovieModal`
- **Responsibility:** Shows detailed movie info and AI watch recommendation.
- **Renders:** backdrop image, title, runtime, release date, genres, overview, AI recommendation block, modal close control.
- **Props:** `isOpen: boolean`, `movieDetails: MovieDetails | null`, `detailsLoading: boolean`, `detailsError: string | null`, `aiInsight: string | null`, `aiLoading: boolean`, `aiError: string | null`, `onClose: () => void`.
- **State owned:** no (recommended to keep in `App` for easier coordination).

#### `LoadMoreButton`
- **Responsibility:** Requests the next page of results and appends to current list.
- **Renders:** button with disabled/loading state text.
- **Props:** `onLoadMore: () => void`, `disabled: boolean`, `loading: boolean`.
- **State owned:** no.

#### `StatusBanner`
- **Responsibility:** Centralized display of loading, error, or no-results messages.
- **Renders:** message region / alert block.
- **Props:** `loading: boolean`, `error: string | null`, `isEmpty: boolean`, `context: 'now_playing' | 'search'`.
- **State owned:** no.

#### `Footer`
- **Responsibility:** Displays footer text/credits/navigation links.
- **Renders:** footer container with attribution.
- **Props:** none (or static config).
- **State owned:** no.

#### `Sidebar`
- **Responsibility:** Displays favorited/watched collections and controls list filtering by status.
- **Renders:** filter buttons plus two lists (favorited and watched).
- **Props:** `filterMode`, `onFilterModeChange`, `favoriteMovies`, `watchedMovies`.
- **State owned:** no.

---

## 2) API Contracts

Base URL: `https://api.themoviedb.org/3`  
Auth: API key via query param (`api_key=${VITE_API_KEY}`) for current implementation.

### A) Now Playing Endpoint
- **URL:** `GET /movie/now_playing`
- **Required params:** `language=en-US`, `page=<number>`
- **Used response fields:**
  - `results[].id` -> key/id for cards, modal detail fetch
  - `results[].title` -> movie title on card
  - `results[].poster_path` -> poster image URL
  - `results[].vote_average` -> card rating
  - `results[].release_date` -> optional card metadata + sort
  - `page`, `total_pages` -> pagination / load more logic
- **Error cases to handle:**
  - non-200 response (401 invalid token, 429 rate limit, 5xx server issues)
  - malformed JSON / missing `results`
  - empty result set
  - network failure (offline, timeout)

### B) Search Movies Endpoint
- **URL:** `GET /search/movie`
- **Required params:** `query=<string>`, `language=en-US`, `page=<number>`, `include_adult=false`
- **Used response fields:**
  - Same summary fields as now playing (`id`, `title`, `poster_path`, `vote_average`, `release_date`)
  - `page`, `total_pages`
- **Error cases to handle:**
  - empty/whitespace query (skip request or show guidance)
  - non-200 responses (401, 429, 5xx)
  - no matches (`results.length === 0`)
  - network failure / timeout

### C) Movie Details Endpoint
- **URL:** `GET /movie/{movie_id}`
- **Required params:** `language=en-US`
- **Path params:** `movie_id` from selected card
- **Used response fields:**
  - `id`, `title`
  - `backdrop_path`
  - `runtime`
  - `release_date`
  - `genres[]` (`id`, `name`)
  - `overview`
  - (optional) `vote_average`, `poster_path` if needed in modal
- **Error cases to handle:**
  - invalid or missing `movie_id`
  - non-200 responses (404 not found, 401, 429, 5xx)
  - partial payload (missing `genres`/`runtime`)
  - network failure

### D) (Stretch) Movie Videos Endpoint
- **URL:** `GET /movie/{movie_id}/videos`
- **Required params:** `language=en-US`
- **Used response fields:**
  - `results[].site`, `results[].type`, `results[].official`, `results[].key`
- **Error cases to handle:**
  - no official trailer found
  - non-200 / network failures

---

## 3) State Architecture

| Name | Type | Initial Value | Owner | Update Trigger |
|---|---|---|---|---|
| `movies` | `MovieSummary[]` | `[]` | `App` | set after now-playing/search fetch; append on load more |
| `query` | `string` | `''` | `App` | user types in `SearchBar` |
| `mode` | `'now_playing' \| 'search'` | `'now_playing'` | `App` | search submit sets `search`; clear/reset sets `now_playing` |
| `page` | `number` | `1` | `App` | load more increments; reset on mode/query change |
| `totalPages` | `number` | `1` | `App` | set from API response |
| `sortBy` | `'title' \| 'release_date' \| 'vote_average'` | `'title'` | `App` | user changes `SortControl` |
| `isLoadingList` | `boolean` | `false` | `App` | true during list fetch, false on settle |
| `listError` | `string \| null` | `null` | `App` | set when list API fails; clear on new fetch |
| `selectedMovieId` | `number \| null` | `null` | `App` | set on `MovieCard` click; clear on modal close |
| `movieDetails` | `MovieDetails \| null` | `null` | `App` | set after details fetch for selected movie |
| `isLoadingDetails` | `boolean` | `false` | `App` | true while details fetch in progress |
| `detailsError` | `string \| null` | `null` | `App` | set if details fetch fails |
| `aiInsight` | `string \| null` | `null` | `App` | set after OpenRouter success |
| `isLoadingAI` | `boolean` | `false` | `App` | true while AI request is running |
| `aiError` | `string \| null` | `null` | `App` | set if AI request fails |

Notes:
- `movies` may be stored as raw API shape then mapped before render, or normalized once at fetch time.
- Sorting should apply to the currently displayed set (`movies`) without mutating original source unexpectedly (copy before sort).

---

## 4) Data Flow

On initial load, `App` calls TMDb Now Playing (`page=1`) and stores normalized summary movie objects in `movies`. `App` passes `movies` into `MovieList`, which maps each item to `MovieCard`. `MovieCard` receives the movie object and renders title/poster/vote average. If the user searches, `SearchBar` updates `query` in `App`; submit triggers Search endpoint fetch and replaces `movies` with search results. `Load More` increments `page`, fetches the next page for the current `mode`, and appends results to `movies`. Before rendering, the list is transformed into `sortedMovies` based on `sortBy` (title/release date/vote average). When a user clicks a `MovieCard`, the card calls `onSelectMovie(movie.id)` -> `App` sets `selectedMovieId` -> `App` fetches `/movie/{movie_id}` for full details -> details are passed into `MovieModal` for display.

## Responsive Breakpoints (Milestone 3)

- `<=600px`: compact mobile layout, search controls stack vertically, and movie grid uses smaller card minimum width.
- `601px-1023px`: tablet/default auto-fill grid with medium card width.
- `>=1024px`: desktop layout uses a stable 5-column movie grid.

---

## 5) AI Feature Spec (OpenRouter Watch Recommendation)

### Feature behavior
- **Display location:** `MovieModal` under the main movie details section.
- **Context sent to AI:** `title`, `genres` (names list), and `overview`.
- **Desired output:** 2-3 sentence recommendation that says who might enjoy the movie and why, in plain user-friendly language.
- **State location:** `aiInsight`, `isLoadingAI`, `aiError` in `App` (passed to `MovieModal`).
- **Trigger:** run after movie details load for a selected modal movie.

### OpenRouter contract
- **Endpoint:** `POST https://openrouter.ai/api/v1/chat/completions`
- **Model (implemented):** `meta-llama/llama-3.3-70b-instruct:free`
- **Headers:**
  - `Authorization: Bearer ${OPENROUTER_API_KEY}`
  - `Content-Type: application/json`
- **Request body shape:**
  - `model`
  - `messages` with system + user prompt

### Prompt spec
- **Role (system):** You are a concise movie recommendation assistant.
- **Task (user):** Given title, genres, and overview, produce a short watch recommendation.
- **Inputs:** `title` (string), `genres` (string[]), `overview` (string).
- **Prompt file:** `src/prompt.txt` (template with `{{title}}`, `{{genres}}`, `{{overview}}` placeholders)
- **Output format constraints:**
  - 2-3 sentences max
  - no markdown bullets
  - no spoilers beyond what the overview already implies
  - clear recommendation tone
- **Failure behavior:**
  - if overview/genres are missing, return a cautious generic recommendation
  - on API failure, UI shows fallback text:
    - `"We couldn't generate an AI recommendation right now. Please try again."`

### UI/loading/error behavior
- When modal opens and movie details are loaded, trigger AI call.
- Show "Generating recommendation..." while `isLoadingAI` is true.
- If success, show `aiInsight`.
- If failure (or missing key), show graceful fallback message:
  - `"We couldn't generate a recommendation for this one — check out the overview above!"`

### AI Feature — Decisions Log
- **What the API returned initially:** variable length responses; some were too generic and a little promotional.
- **What I changed in my prompt:** tightened system constraints to avoid cliches and first-person language, and reinforced 2-3 sentence output in user prompt.
- **What fallback behavior I implemented:** fallback recommendation text is displayed when OpenRouter key is missing or the request fails.
- **What I learned:** async feature state is much easier to reason about when loading/error/data are separate values reset on modal close.

## 6) Stretch Features Implemented

- **Embedded trailers:** `MovieModal` fetches TMDb `/movie/{movie_id}/videos` and embeds the best YouTube trailer (official trailer preferred).
- **Favorites:** each `MovieCard` includes a favorite toggle and favorites are visually highlighted.
- **Watched:** each `MovieCard` includes a watched checkbox and watched cards are visually highlighted.
- **Sidebar:** a `Sidebar` component shows favorited and watched lists and includes filters for All/Favorites/Watched movie views.

