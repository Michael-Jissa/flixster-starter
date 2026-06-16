// Presentational sort selector.
// Parent owns the selected value and sort behavior.
const SortControl = ({ sortBy, onSortChange }) => {
  return (
    <div className="sort-control">
      <select
        id="movie-sort"
        aria-label="Sort movies"
        value={sortBy}
        onChange={(event) => onSortChange(event.target.value)}
      >
        <option value="title">Title (A-Z)</option>
        <option value="release_date">Release Date (Newest)</option>
        <option value="vote_average">Vote Average (Highest)</option>
      </select>
    </div>
  );
};

export default SortControl;
