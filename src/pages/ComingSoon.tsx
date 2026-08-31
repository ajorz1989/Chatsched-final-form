import { Link } from "react-router-dom";
import { whatsappLink } from "../lib/constants";

export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="max-w-2xl mx-auto px-5 py-24 text-center">
      <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-red text-billboard-red px-3 py-1.5 rounded mb-4">Coming next</span>
      <h1 className="text-3xl mb-3">{title}</h1>
      <p className="text-billboard-inkSoft mb-7">This page is next on the list — we're building it out as the platform grows. In the meantime, browse the directory or reach us on WhatsApp.</p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link to="/browse" className="inline-flex items-center gap-2 border-[3px] border-billboard-ink font-bold px-5 py-3 rounded">Browse Publishers</Link>
        <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border-[3px] border-billboard-greenDeep bg-billboard-green text-white font-bold px-5 py-3 rounded">WhatsApp us</a>
      </div>
    </div>
  );
}
