import { Link } from "react-router";

/** Placeholder for pages built in later milestones. */
export default function ComingSoon({ title, milestone, detail }: { title: string; milestone: number; detail: string }) {
  return (
    <div className="page-x flex flex-col items-center gap-4 py-20 text-center">
      <span className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-emerald">Milestone {milestone}</span>
      <h1 className="text-[26px] font-extrabold tracking-[-0.5px]">{title}</h1>
      <p className="max-w-md text-[15px] leading-relaxed text-muted">{detail}</p>
      <Link to="/menu" className="btn-primary mt-2">Browse the menu</Link>
    </div>
  );
}
