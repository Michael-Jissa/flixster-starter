// Simple presentational footer with attribution.
const Footer = () => {
  // Keep year current automatically.
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <p>© {currentYear} Flixster. Built with TMDb data.</p>
      <a
        href="https://www.themoviedb.org/"
        target="_blank"
        rel="noreferrer"
      >
        The Movie Database (TMDb)
      </a>
    </footer>
  );
};

export default Footer;
