import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="page-x flex flex-col items-center gap-4 py-20 text-center">
      <h1 className="text-[26px] font-extrabold">We can't find that page</h1>
      <p className="text-muted">The link may be old or mistyped.</p>
      <Link to="/" className="btn-primary">Go to the home page</Link>
    </div>
  );
}
