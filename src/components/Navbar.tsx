import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="border-b border-base-border bg-base-soft">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="font-heading text-xl text-white">
          ESTIM<span className="text-accent">ATHON</span>
        </Link>
      </div>
    </header>
  );
}
