export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="text-muted-foreground">
      <div className="px-4 py-2">
        <p className="text-xs opacity-75">
          Bluegold © {currentYear} • KnowledgeLInk
        </p>
      </div>
    </footer>
  );
}
