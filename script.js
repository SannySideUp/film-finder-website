const TMDB_TOKEN = "YOUR_TMDB_READ_ACCESS_TOKEN";

const app = document.getElementById("app");
const movieModal = document.getElementById("movieModal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalContent = document.getElementById("modalContent");
const closeModalBtn = document.getElementById("closeModal");
const themeToggleBtn = document.getElementById("themeToggleBtn");

const state = {
  currentView: "home",
  query: "",
  page: 1,
  totalPages: 1,
  selectedGenre: "",
  selectedYear: "",
  selectedSort: "popularity.desc",
  genres: [],
  trending: [],
  popular: [],
  topRated: [],
  discoverResults: [],
  searchResults: [],
  featuredMovie: null,
  currentModalMovieId: null,
  user: loadUserData(),
};

function loadUserData() {
  return JSON.parse(localStorage.getItem("cinemalogUser")) || {
    favorites: [],
    watchlist: [],
    watched: [],
    ratings: {},
    notes: {},
    diary: {},
    customLists: [],
    recentSearches: [],
    recentlyViewed: [],
    theme: "dark",
  };
}

function saveUserData() {
  localStorage.setItem("cinemalogUser", JSON.stringify(state.user));
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.user.theme || "dark");
}

function toggleTheme() {
  state.user.theme = state.user.theme === "light" ? "dark" : "light";
  saveUserData();
  applyTheme();
}

function setView(view, pushHash = true) {
  state.currentView = view;
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
  if (pushHash) location.hash = `#/${view}`;
  renderApp();
}

async function tmdbFetch(endpoint, params = {}) {
  const url = new URL(`https://api.themoviedb.org/3${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value != null) url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${TMDB_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) throw new Error("Failed to fetch TMDb data.");
  return response.json();
}

async function getTrendingMovies() {
  return tmdbFetch("/trending/movie/week", { language: "en-US" });
}
async function getPopularMovies() {
  return tmdbFetch("/movie/popular", { language: "en-US", page: 1 });
}
async function getTopRatedMovies() {
  return tmdbFetch("/movie/top_rated", { language: "en-US", page: 1 });
}
async function getGenres() {
  return tmdbFetch("/genre/movie/list", { language: "en-US" });
}
async function searchMovies(query, page = 1) {
  return tmdbFetch("/search/movie", {
    query,
    page,
    include_adult: false,
    language: "en-US",
  });
}
async function discoverMovies(page = 1) {
  return tmdbFetch("/discover/movie", {
    page,
    sort_by: state.selectedSort,
    with_genres: state.selectedGenre,
    primary_release_year: state.selectedYear,
    include_adult: false,
    language: "en-US",
    vote_count_gte: 50,
  });
}
async function getMovieDetails(id) {
  return tmdbFetch(`/movie/${id}`, { language: "en-US" });
}
async function getMovieCredits(id) {
  return tmdbFetch(`/movie/${id}/credits`, { language: "en-US" });
}
async function getRecommendations(id) {
  return tmdbFetch(`/movie/${id}/recommendations`, { language: "en-US", page: 1 });
}
async function getMovieVideos(id) {
  return tmdbFetch(`/movie/${id}/videos`, { language: "en-US" });
}

function imageUrl(path, size = "w500") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}
function backdropUrl(path, size = "w1280") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}
function getPosterMarkup(path, title) {
  const url = imageUrl(path);
  if (!url) return `<div class="poster-fallback">🎬</div>`;
  return `<img src="${url}" alt="${title} poster" loading="lazy" />`;
}
function formatYear(dateString) {
  if (!dateString) return "Unknown";
  return new Date(dateString).getFullYear();
}
function getGenreNames(ids = []) {
  return ids
    .map((id) => state.genres.find((g) => g.id === id))
    .filter(Boolean)
    .map((g) => g.name);
}

function isFavorite(id) {
  return state.user.favorites.includes(id);
}
function isWatchlist(id) {
  return state.user.watchlist.includes(id);
}
function isWatched(id) {
  return state.user.watched.includes(id);
}

function toggleArrayValue(arrayName, id) {
  const arr = state.user[arrayName];
  const exists = arr.includes(id);

  if (exists) state.user[arrayName] = arr.filter((x) => x !== id);
  else state.user[arrayName].unshift(id);

  saveUserData();
  renderApp();
}

function addRecentSearch(query) {
  let arr = state.user.recentSearches || [];
  arr = arr.filter((q) => q.toLowerCase() !== query.toLowerCase());
  arr.unshift(query);
  state.user.recentSearches = arr.slice(0, 8);
  saveUserData();
}

function addRecentlyViewed(movieId) {
  let arr = state.user.recentlyViewed || [];
  arr = arr.filter((id) => id !== movieId);
  arr.unshift(movieId);
  state.user.recentlyViewed = arr.slice(0, 12);
  saveUserData();
}

function setRating(movieId, value) {
  state.user.ratings[movieId] = value;
  saveUserData();
}

function saveNote(movieId, text) {
  state.user.notes[movieId] = text;
  saveUserData();
}

function saveDiaryEntry(movieId, text) {
  const today = new Date().toISOString().split("T")[0];
  state.user.diary[movieId] = { date: today, text };
  saveUserData();
}

function createCustomList(name, description) {
  state.user.customLists.unshift({
    id: crypto.randomUUID(),
    name,
    description,
    movieIds: [],
  });
  saveUserData();
  renderApp();
}

function deleteCustomList(listId) {
  state.user.customLists = state.user.customLists.filter((l) => l.id !== listId);
  saveUserData();
  renderApp();
}

function renameCustomList(listId, name, description) {
  const list = state.user.customLists.find((l) => l.id === listId);
  if (!list) return;
  list.name = name;
  list.description = description;
  saveUserData();
  renderApp();
}

function addMovieToList(listId, movieId) {
  const list = state.user.customLists.find((l) => l.id === listId);
  if (!list) return;
  if (!list.movieIds.includes(movieId)) {
    list.movieIds.push(movieId);
    saveUserData();
  }
}

function removeMovieFromList(listId, movieId) {
  const list = state.user.customLists.find((l) => l.id === listId);
  if (!list) return;
  list.movieIds = list.movieIds.filter((id) => id !== movieId);
  saveUserData();
  renderApp();
}

function renderStatus(message, type = "normal") {
  return `<div class="status-box ${type === "error" ? "error" : ""}">${message}</div>`;
}

function renderSkeletonGrid() {
  return `
    <div class="skeleton-grid">
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
    </div>
  `;
}

function renderMovieCard(movie) {
  const genres = getGenreNames(movie.genre_ids || []).slice(0, 2);

  return `
    <article class="movie-card">
      <div class="poster-wrap">
        ${getPosterMarkup(movie.poster_path, movie.title)}
        <div class="poster-shade"></div>
      </div>
      <div class="movie-card-body">
        <h3>${movie.title}</h3>
        <p class="movie-meta">${formatYear(movie.release_date)} • ${movie.vote_average?.toFixed(1) || "N/A"}</p>
        <div class="tag-row">
          ${genres.map((genre) => `<span class="tag">${genre}</span>`).join("")}
        </div>
        <div class="card-actions">
          <button class="card-btn details-btn" data-id="${movie.id}">Details</button>
          <button class="card-btn ${isFavorite(movie.id) ? "saved" : ""}" data-action="favorite" data-id="${movie.id}">
            ${isFavorite(movie.id) ? "Saved" : "Favorite"}
          </button>
          <button class="card-btn ${isWatchlist(movie.id) ? "saved" : ""}" data-action="watchlist" data-id="${movie.id}">
            ${isWatchlist(movie.id) ? "Watchlisted" : "Watchlist"}
          </button>
        </div>
      </div>
    </article>
  `;
}

function attachMovieCardEvents(scope = document) {
  scope.querySelectorAll(".details-btn").forEach((btn) => {
    btn.addEventListener("click", () => openMovieModal(Number(btn.dataset.id), true));
  });

  scope.querySelectorAll('[data-action="favorite"]').forEach((btn) => {
    btn.addEventListener("click", () => toggleArrayValue("favorites", Number(btn.dataset.id)));
  });

  scope.querySelectorAll('[data-action="watchlist"]').forEach((btn) => {
    btn.addEventListener("click", () => toggleArrayValue("watchlist", Number(btn.dataset.id)));
  });
}

function getMovieByIdFromCaches(id) {
  const caches = [
    state.trending,
    state.popular,
    state.topRated,
    state.searchResults,
    state.discoverResults,
  ];
  for (const arr of caches) {
    const found = arr.find((m) => m.id === id);
    if (found) return found;
  }
  return null;
}

function renderHeroBanner(movie) {
  if (!movie) return "";

  const genres = getGenreNames(movie.genre_ids || []).slice(0, 3);
  const bg = backdropUrl(movie.backdrop_path) || "";

  return `
    <section class="hero-banner">
      <div class="hero-banner-bg" style="background-image: url('${bg}')"></div>
      <div class="hero-banner-overlay"></div>

      <div class="hero-banner-content">
        <div class="hero-banner-poster">
          ${getPosterMarkup(movie.poster_path, movie.title)}
        </div>

        <div class="hero-banner-copy">
          <div class="hero-meta">
            <span class="tag">${formatYear(movie.release_date)}</span>
            <span class="tag">TMDb ${movie.vote_average?.toFixed(1) || "N/A"}</span>
            ${genres.map((genre) => `<span class="tag">${genre}</span>`).join("")}
          </div>

          <h2>${movie.title}</h2>
          <p>${movie.overview || "No overview available."}</p>

          <div class="hero-actions">
            <button class="primary-btn details-btn" data-id="${movie.id}">Open Details</button>
            <button class="card-btn ${isFavorite(movie.id) ? "saved" : ""}" data-action="favorite" data-id="${movie.id}">
              ${isFavorite(movie.id) ? "Saved" : "Favorite"}
            </button>
            <button class="card-btn ${isWatchlist(movie.id) ? "saved" : ""}" data-action="watchlist" data-id="${movie.id}">
              ${isWatchlist(movie.id) ? "Watchlisted" : "Watchlist"}
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderHome() {
  const watchlistPreview = state.popular.filter((m) => state.user.watchlist.includes(m.id)).slice(0, 8);
  const favoritesPreview = state.popular.filter((m) => state.user.favorites.includes(m.id)).slice(0, 8);

  return `
    <div class="page-grid">
      ${renderHeroBanner(state.featuredMovie)}

      <section class="section-card hero-card">
        <div class="hero-copy">
          <h2>Track films, build lists, and discover what to watch next.</h2>
          <p>CinemaLog is a frontend-only movie discovery and personal tracking app inspired by modern film platforms.</p>
        </div>

        <form id="quickSearchForm" class="search-form">
          <input type="text" id="quickSearchInput" placeholder="Search movies..." />
          <button class="primary-btn" type="submit">Search</button>
        </form>
      </section>

      <section class="section-card">
        <div class="section-heading">
          <div>
            <h3>Trending This Week</h3>
            <p>Popular movies people are watching right now.</p>
          </div>
        </div>
        <div class="row-scroll">${state.trending.map(renderMovieCard).join("")}</div>
      </section>

      <section class="section-card">
        <div class="section-heading">
          <div>
            <h3>Popular</h3>
            <p>Mainstream favorites and current hits.</p>
          </div>
        </div>
        <div class="row-scroll">${state.popular.map(renderMovieCard).join("")}</div>
      </section>

      <section class="section-card">
        <div class="section-heading">
          <div>
            <h3>Top Rated</h3>
            <p>Highly rated films from TMDb.</p>
          </div>
        </div>
        <div class="row-scroll">${state.topRated.map(renderMovieCard).join("")}</div>
      </section>

      <div class="two-col">
        <section class="section-card">
          <div class="section-heading">
            <div>
              <h3>Your Watchlist</h3>
              <p>Saved films you want to watch next.</p>
            </div>
          </div>
          ${
            watchlistPreview.length
              ? `<div class="movie-grid">${watchlistPreview.map(renderMovieCard).join("")}</div>`
              : renderStatus("Your watchlist is empty.")
          }
        </section>

        <section class="section-card">
          <div class="section-heading">
            <div>
              <h3>Your Favorites</h3>
              <p>Your most loved saved movies.</p>
            </div>
          </div>
          ${
            favoritesPreview.length
              ? `<div class="movie-grid">${favoritesPreview.map(renderMovieCard).join("")}</div>`
              : renderStatus("You have not favorited any movies yet.")
          }
        </section>
      </div>
    </div>
  `;
}

function renderDiscover() {
  return `
    <div class="page-grid">
      <div class="discover-layout">
        <aside class="filter-card">
          <h3>Discover Filters</h3>
          <div class="filter-stack">
            <div class="filter-group">
              <label for="yearFilter">Release Year</label>
              <input id="yearFilter" type="number" min="1900" max="2099" placeholder="e.g. 2023" value="${state.selectedYear}" />
            </div>

            <div class="filter-group">
              <label for="sortFilter">Sort By</label>
              <select id="sortFilter">
                <option value="popularity.desc" ${state.selectedSort === "popularity.desc" ? "selected" : ""}>Popularity ↓</option>
                <option value="vote_average.desc" ${state.selectedSort === "vote_average.desc" ? "selected" : ""}>Rating ↓</option>
                <option value="primary_release_date.desc" ${state.selectedSort === "primary_release_date.desc" ? "selected" : ""}>Newest</option>
                <option value="primary_release_date.asc" ${state.selectedSort === "primary_release_date.asc" ? "selected" : ""}>Oldest</option>
              </select>
            </div>

            <div class="filter-group">
              <label>Genres</label>
              <div class="genre-grid">
                <button class="genre-chip ${state.selectedGenre === "" ? "active" : ""}" data-genre="">All</button>
                ${state.genres.map((genre) => `
                  <button class="genre-chip ${String(state.selectedGenre) === String(genre.id) ? "active" : ""}" data-genre="${genre.id}">
                    ${genre.name}
                  </button>
                `).join("")}
              </div>
            </div>

            <button id="applyDiscoverBtn" class="primary-btn">Apply Filters</button>
          </div>
        </aside>

        <section class="section-card">
          <div class="section-heading">
            <div>
              <h2>Discover Movies</h2>
              <p>Browse films using filters instead of text search.</p>
            </div>
            <div>Page ${state.page} of ${state.totalPages || 1}</div>
          </div>

          ${
            state.discoverResults.length
              ? `<div class="movie-grid">${state.discoverResults.map(renderMovieCard).join("")}</div>`
              : renderStatus("No discover results loaded yet.")
          }

          <div class="load-more-wrap">
            <button id="loadMoreDiscoverBtn" class="primary-btn" ${state.page >= state.totalPages ? "disabled" : ""}>Load More</button>
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderSearch() {
  return `
    <div class="page-grid">
      <section class="section-card hero-card">
        <div class="hero-copy">
          <h2>Search Movies</h2>
          <p>Search by title and browse your recent searches.</p>
        </div>

        <form id="searchPageForm" class="search-form">
          <input type="text" id="searchPageInput" value="${state.query}" placeholder="Search for a movie..." />
          <button class="primary-btn" type="submit">Search</button>
        </form>
      </section>

      <section class="section-card">
        <div class="section-heading">
          <div>
            <h3>Recent Searches</h3>
            <p>Quickly re-run previous searches.</p>
          </div>
        </div>

        <div class="chip-list">
          ${
            state.user.recentSearches.length
              ? state.user.recentSearches.map((q) => `<button class="chip-btn recent-search-btn" data-query="${q}">${q}</button>`).join("")
              : `<span class="status-box">No recent searches yet.</span>`
          }
        </div>
      </section>

      <section class="section-card">
        <div class="section-heading">
          <div>
            <h3>${state.query ? `Results for "${state.query}"` : "Search results"}</h3>
            <p>${state.searchResults.length ? `${state.searchResults.length} movies loaded` : "Search to begin."}</p>
          </div>
        </div>

        ${
          state.searchResults.length
            ? `<div class="movie-grid">${state.searchResults.map(renderMovieCard).join("")}</div>`
            : renderStatus("Search for a movie to see results.")
        }

        <div class="load-more-wrap">
          <button id="loadMoreSearchBtn" class="primary-btn ${!state.query || state.page >= state.totalPages ? "hidden" : ""}">Load More</button>
        </div>
      </section>
    </div>
  `;
}

function renderProfile() {
  const watchedCount = state.user.watched.length;
  const favoriteCount = state.user.favorites.length;
  const watchlistCount = state.user.watchlist.length;
  const ratings = Object.values(state.user.ratings);
  const avgRating = ratings.length
    ? (ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1)
    : "0.0";

  const genreFrequency = {};
  state.user.watched.forEach((id) => {
    const movie = getMovieByIdFromCaches(id);
    if (!movie) return;
    getGenreNames(movie.genre_ids || []).forEach((genre) => {
      genreFrequency[genre] = (genreFrequency[genre] || 0) + 1;
    });
  });

  const sortedGenres = Object.entries(genreFrequency).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxGenreCount = sortedGenres.length ? sortedGenres[0][1] : 1;

  const diaryEntries = Object.entries(state.user.diary)
    .map(([movieId, entry]) => ({
      movie: getMovieByIdFromCaches(Number(movieId)),
      ...entry,
      movieId: Number(movieId),
    }))
    .filter((item) => item.movie)
    .sort((a, b) => b.date.localeCompare(a.date));

  return `
    <div class="page-grid">
      <section class="section-card">
        <div class="section-heading">
          <div>
            <h2>Your Profile</h2>
            <p>A local-only view of your movie activity and stats.</p>
          </div>
        </div>

        <div class="profile-grid">
          <div class="info-card"><h3>Watched</h3><div class="metric">${watchedCount}</div></div>
          <div class="info-card"><h3>Favorites</h3><div class="metric">${favoriteCount}</div></div>
          <div class="info-card"><h3>Watchlist</h3><div class="metric">${watchlistCount}</div></div>
          <div class="info-card"><h3>Avg Rating</h3><div class="metric">${avgRating}</div></div>
        </div>
      </section>

      <div class="two-col">
        <section class="section-card">
          <div class="section-heading">
            <div>
              <h3>Top Genres</h3>
              <p>Based on your watched movies.</p>
            </div>
          </div>

          ${
            sortedGenres.length
              ? `<div class="chart-stack">
                  ${sortedGenres.map(([genre, count]) => `
                    <div class="chart-row">
                      <div class="chart-row-head">
                        <span>${genre}</span>
                        <span>${count}</span>
                      </div>
                      <div class="chart-bar">
                        <div class="chart-bar-fill" style="width: ${(count / maxGenreCount) * 100}%"></div>
                      </div>
                    </div>
                  `).join("")}
                </div>`
              : renderStatus("Watch more movies to build genre stats.")
          }
        </section>

        <section class="section-card">
          <div class="section-heading">
            <div>
              <h3>Recently Viewed</h3>
              <p>Your latest movie detail views.</p>
            </div>
          </div>

          ${
            state.user.recentlyViewed.length
              ? `<div class="movie-grid">${
                  state.user.recentlyViewed
                    .map(getMovieByIdFromCaches)
                    .filter(Boolean)
                    .slice(0, 6)
                    .map(renderMovieCard)
                    .join("")
                }</div>`
              : renderStatus("No recently viewed movies yet.")
          }
        </section>
      </div>

      <section class="section-card">
        <div class="section-heading">
          <div>
            <h3>Your Diary</h3>
            <p>Saved local diary entries and reflections.</p>
          </div>
        </div>

        ${
          diaryEntries.length
            ? `<div class="diary-list">
                ${diaryEntries.map((entry) => `
                  <article class="diary-entry">
                    <div class="diary-entry-top">
                      <div>
                        <h3>${entry.movie.title}</h3>
                        <p>${entry.date}</p>
                      </div>
                      <button class="chip-btn open-movie-btn" data-movie-id="${entry.movieId}">Open Movie</button>
                    </div>
                    <p>${entry.text}</p>
                  </article>
                `).join("")}
              </div>`
            : renderStatus("No diary entries yet.")
        }
      </section>
    </div>
  `;
}

function renderLists() {
  return `
    <div class="page-grid">
      <div class="list-layout">
        <section class="list-card">
          <div class="section-heading">
            <div>
              <h3>Create Custom List</h3>
              <p>Make your own themed movie collections.</p>
            </div>
          </div>

          <form id="createListForm" class="list-form">
            <input type="text" id="listNameInput" placeholder="List name" required />
            <textarea id="listDescriptionInput" rows="4" placeholder="Short description"></textarea>
            <button class="primary-btn" type="submit">Create List</button>
          </form>
        </section>

        <section class="list-card">
          <div class="section-heading">
            <div>
              <h3>Your Lists</h3>
              <p>Manage saved local lists.</p>
            </div>
          </div>

          <div class="saved-lists">
            ${
              state.user.customLists.length
                ? state.user.customLists.map((list) => {
                    const movies = list.movieIds.map(getMovieByIdFromCaches).filter(Boolean);
                    return `
                      <div class="list-entry">
                        <div class="section-heading">
                          <div>
                            <h3>${list.name}</h3>
                            <p>${list.description || "No description."}</p>
                          </div>
                          <button class="card-btn danger delete-list-btn" data-list-id="${list.id}">Delete</button>
                        </div>

                        <div class="list-editor">
                          <input class="edit-list-name" data-list-id="${list.id}" value="${list.name}" />
                          <textarea class="edit-list-description" data-list-id="${list.id}" rows="3">${list.description || ""}</textarea>
                          <button class="secondary-btn save-list-edit-btn" data-list-id="${list.id}">Save List Changes</button>
                        </div>

                        <div class="list-movies">
                          ${
                            movies.length
                              ? movies.map((movie) => `
                                  <span class="tag">
                                    ${movie.title}
                                    <button class="ghost-btn remove-from-list-btn" data-list-id="${list.id}" data-movie-id="${movie.id}" type="button">×</button>
                                  </span>
                                `).join("")
                              : `<span class="status-box">No movies added yet.</span>`
                          }
                        </div>
                      </div>
                    `;
                  }).join("")
                : renderStatus("You have not created any lists yet.")
            }
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderApp() {
  switch (state.currentView) {
    case "home":
      app.innerHTML = renderHome();
      break;
    case "discover":
      app.innerHTML = renderDiscover();
      break;
    case "search":
      app.innerHTML = renderSearch();
      break;
    case "profile":
      app.innerHTML = renderProfile();
      break;
    case "lists":
      app.innerHTML = renderLists();
      break;
    default:
      app.innerHTML = renderHome();
  }

  attachMovieCardEvents(app);
  attachViewEvents();
}

function attachViewEvents() {
  const quickSearchForm = document.getElementById("quickSearchForm");
  if (quickSearchForm) {
    quickSearchForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = document.getElementById("quickSearchInput");
      const query = input.value.trim();
      if (!query) return;
      state.currentView = "search";
      state.query = query;
      state.page = 1;
      await performSearch(query, 1, true);
      setView("search");
    });
  }

  const searchPageForm = document.getElementById("searchPageForm");
  if (searchPageForm) {
    searchPageForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = document.getElementById("searchPageInput");
      const query = input.value.trim();
      if (!query) return;
      await performSearch(query, 1, true);
      renderApp();
    });
  }

  document.querySelectorAll(".recent-search-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const query = btn.dataset.query;
      await performSearch(query, 1, true);
      renderApp();
    });
  });

  document.querySelectorAll(".genre-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      state.selectedGenre = chip.dataset.genre;
      renderApp();
    });
  });

  document.getElementById("applyDiscoverBtn")?.addEventListener("click", async () => {
    state.selectedYear = document.getElementById("yearFilter").value.trim();
    state.selectedSort = document.getElementById("sortFilter").value;
    state.page = 1;
    await loadDiscover(true);
    renderApp();
  });

  document.getElementById("loadMoreDiscoverBtn")?.addEventListener("click", async () => {
    state.page += 1;
    await loadDiscover(false);
    renderApp();
  });

  document.getElementById("loadMoreSearchBtn")?.addEventListener("click", async () => {
    state.page += 1;
    await performSearch(state.query, state.page, false);
    renderApp();
  });

  document.getElementById("createListForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("listNameInput").value.trim();
    const description = document.getElementById("listDescriptionInput").value.trim();
    if (!name) return;
    createCustomList(name, description);
  });

  document.querySelectorAll(".delete-list-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteCustomList(btn.dataset.listId));
  });

  document.querySelectorAll(".save-list-edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const listId = btn.dataset.listId;
      const name = document.querySelector(`.edit-list-name[data-list-id="${listId}"]`).value.trim();
      const description = document.querySelector(`.edit-list-description[data-list-id="${listId}"]`).value.trim();
      if (!name) return;
      renameCustomList(listId, name, description);
    });
  });

  document.querySelectorAll(".remove-from-list-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeMovieFromList(btn.dataset.listId, Number(btn.dataset.movieId));
    });
  });

  document.querySelectorAll(".open-movie-btn").forEach((btn) => {
    btn.addEventListener("click", () => openMovieModal(Number(btn.dataset.movieId), true));
  });
}

async function performSearch(query, page = 1, reset = false) {
  if (!TMDB_TOKEN || TMDB_TOKEN === "YOUR_TMDB_READ_ACCESS_TOKEN") {
    app.innerHTML = renderStatus("Add your TMDb Read Access Token in script.js first.", "error");
    return;
  }

  try {
    if (reset) {
      state.query = query;
      state.page = 1;
      state.searchResults = [];
      app.innerHTML = renderSkeletonGrid();
    }

    const data = await searchMovies(query, page);
    state.totalPages = data.total_pages || 1;

    if (reset) state.searchResults = data.results || [];
    else state.searchResults = [...state.searchResults, ...(data.results || [])];

    addRecentSearch(query);
  } catch (error) {
    app.innerHTML = renderStatus(error.message, "error");
  }
}

async function loadDiscover(reset = true) {
  try {
    const data = await discoverMovies(state.page);
    state.totalPages = data.total_pages || 1;

    if (reset) state.discoverResults = data.results || [];
    else state.discoverResults = [...state.discoverResults, ...(data.results || [])];
  } catch (error) {
    app.innerHTML = renderStatus(error.message, "error");
  }
}

function getYoutubeTrailer(results = []) {
  const trailer = results.find(
    (video) => video.site === "YouTube" && video.type === "Trailer"
  );
  return trailer || null;
}

async function openMovieModal(movieId, pushHash = false) {
  try {
    state.currentModalMovieId = movieId;
    if (pushHash) location.hash = `#movie/${movieId}`;

    movieModal.classList.remove("hidden");
    modalContent.innerHTML = renderStatus("Loading movie details...");

    addRecentlyViewed(movieId);

    const [details, credits, recommendations, videos] = await Promise.all([
      getMovieDetails(movieId),
      getMovieCredits(movieId),
      getRecommendations(movieId),
      getMovieVideos(movieId),
    ]);

    const cast = (credits.cast || []).slice(0, 6).map((person) => person.name);
    const genres = (details.genres || []).map((g) => g.name);
    const personalRating = state.user.ratings[movieId] || 0;
    const personalNote = state.user.notes[movieId] || "";
    const personalDiary = state.user.diary[movieId]?.text || "";
    const trailer = getYoutubeTrailer(videos.results || []);

    modalContent.innerHTML = `
      <div class="modal-body">
        <div class="modal-poster">
          ${getPosterMarkup(details.poster_path, details.title)}
        </div>

        <div class="modal-info">
          <h2>${details.title}</h2>
          <p>${details.overview || "No overview available."}</p>

          <div class="modal-tags">
            ${genres.map((genre) => `<span class="tag">${genre}</span>`).join("")}
          </div>

          ${
            trailer
              ? `<div class="video-wrap">
                  <iframe
                    src="https://www.youtube.com/embed/${trailer.key}"
                    title="${details.title} trailer"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                  ></iframe>
                </div>`
              : ""
          }

          <div class="detail-grid">
            <div class="detail-item"><span>Release Year</span><strong>${formatYear(details.release_date)}</strong></div>
            <div class="detail-item"><span>Runtime</span><strong>${details.runtime ? `${details.runtime} min` : "N/A"}</strong></div>
            <div class="detail-item"><span>TMDb Rating</span><strong>${details.vote_average?.toFixed(1) || "N/A"}</strong></div>
            <div class="detail-item"><span>Status</span><strong>${details.status || "N/A"}</strong></div>
            <div class="detail-item"><span>Language</span><strong>${details.original_language?.toUpperCase() || "N/A"}</strong></div>
            <div class="detail-item"><span>Top Cast</span><strong>${cast.length ? cast.join(", ") : "N/A"}</strong></div>
          </div>

          <div class="card-actions">
            <button class="card-btn ${isFavorite(movieId) ? "saved" : ""}" id="modalFavoriteBtn">${isFavorite(movieId) ? "Saved" : "Favorite"}</button>
            <button class="card-btn ${isWatchlist(movieId) ? "saved" : ""}" id="modalWatchlistBtn">${isWatchlist(movieId) ? "Watchlisted" : "Watchlist"}</button>
            <button class="card-btn ${isWatched(movieId) ? "success" : ""}" id="modalWatchedBtn">${isWatched(movieId) ? "Watched" : "Mark Watched"}</button>
          </div>

          <div class="rating-row">
            <strong>Your Rating:</strong>
            <div class="rating-stars">
              ${[1, 2, 3, 4, 5]
                .map((star) => `<button class="star-btn" data-star="${star}">${personalRating >= star ? "★" : "☆"}</button>`)
                .join("")}
            </div>
          </div>

          <div class="note-box">
            <label for="movieNote">Your Note / Review</label>
            <textarea id="movieNote" rows="4" placeholder="Write your thoughts...">${personalNote}</textarea>
            <button class="primary-btn" id="saveNoteBtn">Save Note</button>
          </div>

          <div class="note-box">
            <label for="movieDiary">Diary Entry</label>
            <textarea id="movieDiary" rows="4" placeholder="Write a diary-style entry...">${personalDiary}</textarea>
            <button class="secondary-btn" id="saveDiaryBtn">Save Diary Entry</button>
          </div>

          <div class="note-box">
            <label for="addToListSelect">Add to Custom List</label>
            <select id="addToListSelect">
              <option value="">Choose a list</option>
              ${state.user.customLists.map((list) => `<option value="${list.id}">${list.name}</option>`).join("")}
            </select>
            <button class="secondary-btn" id="addToListBtn">Add Movie to List</button>
          </div>

          <div class="similar-row">
            <h3>Recommendations</h3>
            ${
              (recommendations.results || []).length
                ? `<div class="similar-grid">
                    ${recommendations.results.slice(0, 8).map((movie) => `
                      <div class="similar-card open-similar-btn" data-id="${movie.id}">
                        <div class="poster-wrap">${getPosterMarkup(movie.poster_path, movie.title)}</div>
                        <div class="similar-card-body"><p>${movie.title}</p></div>
                      </div>
                    `).join("")}
                  </div>`
                : renderStatus("No recommendations found.")
            }
          </div>
        </div>
      </div>
    `;

    document.getElementById("modalFavoriteBtn")?.addEventListener("click", () => {
      toggleArrayValue("favorites", movieId);
      openMovieModal(movieId, false);
    });

    document.getElementById("modalWatchlistBtn")?.addEventListener("click", () => {
      toggleArrayValue("watchlist", movieId);
      openMovieModal(movieId, false);
    });

    document.getElementById("modalWatchedBtn")?.addEventListener("click", () => {
      toggleArrayValue("watched", movieId);
      openMovieModal(movieId, false);
    });

    document.querySelectorAll(".star-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        setRating(movieId, Number(btn.dataset.star));
        openMovieModal(movieId, false);
      });
    });

    document.getElementById("saveNoteBtn")?.addEventListener("click", () => {
      saveNote(movieId, document.getElementById("movieNote").value);
      openMovieModal(movieId, false);
    });

    document.getElementById("saveDiaryBtn")?.addEventListener("click", () => {
      saveDiaryEntry(movieId, document.getElementById("movieDiary").value);
      openMovieModal(movieId, false);
    });

    document.getElementById("addToListBtn")?.addEventListener("click", () => {
      const listId = document.getElementById("addToListSelect").value;
      if (!listId) return;
      addMovieToList(listId, movieId);
      openMovieModal(movieId, false);
    });

    document.querySelectorAll(".open-similar-btn").forEach((card) => {
      card.addEventListener("click", () => openMovieModal(Number(card.dataset.id), true));
    });
  } catch (error) {
    modalContent.innerHTML = renderStatus(error.message, "error");
  }
}

function closeModal(updateHash = true) {
  movieModal.classList.add("hidden");
  state.currentModalMovieId = null;
  if (updateHash) location.hash = `#/${state.currentView}`;
}

async function bootstrap() {
  if (!TMDB_TOKEN || TMDB_TOKEN === "YOUR_TMDB_READ_ACCESS_TOKEN") {
    app.innerHTML = renderStatus(
      'Add your TMDb Read Access Token in script.js where it says "YOUR_TMDB_READ_ACCESS_TOKEN".',
      "error"
    );
    return;
  }

  try {
    app.innerHTML = renderSkeletonGrid();

    const [genreData, trendingData, popularData, topRatedData] = await Promise.all([
      getGenres(),
      getTrendingMovies(),
      getPopularMovies(),
      getTopRatedMovies(),
    ]);

    state.genres = genreData.genres || [];
    state.trending = trendingData.results || [];
    state.popular = popularData.results || [];
    state.topRated = topRatedData.results || [];
    state.featuredMovie = state.trending[0] || state.popular[0] || null;

    await loadDiscover(true);
    applyTheme();
    await syncFromHash();
  } catch (error) {
    app.innerHTML = renderStatus(error.message, "error");
  }
}

async function syncFromHash() {
  const hash = location.hash.replace(/^#\/?/, "");
  if (!hash) {
    setView("home", false);
    return;
  }

  if (hash.startsWith("movie/")) {
    const movieId = Number(hash.split("/")[1]);
    renderApp();
    await openMovieModal(movieId, false);
    return;
  }

  const view = hash.split("/")[0];
  if (["home", "discover", "search", "profile", "lists"].includes(view)) {
    setView(view, false);
  } else {
    setView("home", false);
  }
}

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const view = btn.dataset.view;
    if (view === "discover" && !state.discoverResults.length) {
      await loadDiscover(true);
    }
    setView(view, true);
  });
});

themeToggleBtn?.addEventListener("click", toggleTheme);
closeModalBtn.addEventListener("click", () => closeModal(true));
modalBackdrop.addEventListener("click", () => closeModal(true));

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !movieModal.classList.contains("hidden")) {
    closeModal(true);
  }
});

window.addEventListener("hashchange", syncFromHash);

bootstrap();