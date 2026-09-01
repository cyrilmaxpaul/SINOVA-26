export function Footer({ className = "" }: { className?: string }) {
  return (
    <footer className={`py-6 text-center text-xs text-muted-foreground ${className}`}>
      Powered By{" "}
      <span className="font-semibold text-foreground/80">Standard Insights</span>
    </footer>
  );
}
