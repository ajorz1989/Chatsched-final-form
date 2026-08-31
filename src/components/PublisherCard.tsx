import { useRef, useState, useEffect, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { LEVEL_META } from "../lib/publisherDisplay";
import { useComparison } from "../contexts/ComparisonContext";
import { useSavedLists } from "../contexts/SavedListsContext";
import { getChannelBySlug } from "../lib/channelRegistry";
import ResponseTimeBadge from "./ResponseTimeBadge";
import type { Publisher } from "../lib/types";

function formatFollowers(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k";
  return String(n);
}

function isCurrentlyFeatured(p: Publisher): boolean {
  return p.featured && (!p.featured_until || new Date(p.featured_until) > new Date());
}

export default function PublisherCard({ publisher, matchReason = null }: { publisher: Publisher; matchReason?: string | null }) {
  const { isComparing, togglePublisher, isFull } = useComparison();
  const { lists, addToList, createList, isInAnyList } = useSavedLists();

  const [showSave, setShowSave] = useState(false);
  const [newListName, setNewListName] = useState("");
  const saveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSave) return;
    function onDown(e: MouseEvent) {
      if (saveRef.current && !saveRef.current.contains(e.target as Node)) setShowSave(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showSave]);

  const comparing = isComparing(publisher.id);
  const saved = isInAnyList(publisher.id);

  function handleNewList(e: FormEvent) {
    e.preventDefault();
    if (!newListName.trim()) return;
    const id = createList(newListName);
    addToList(id, publisher.id);
    setNewListName("");
    setShowSave(false);
  }

  return (
    <div className="border-[3px] border-billboard-ink rounded bg-white overflow-hidden transition hover:-translate-y-1 hover:shadow-block flex flex-col">
      {/* Main card — links to profile */}
      <Link to={`/browse/${publisher.id}`} className="block flex-1">
        <div className={`h-28 bg-gradient-to-br ${publisher.swatch} relative`}>
          {publisher.level && (
            <span className="absolute top-2.5 left-2.5 bg-white/90 text-billboard-ink text-[10px] font-mono font-semibold px-2 py-1 rounded border border-billboard-ink">
              {LEVEL_META[publisher.level].emoji} {LEVEL_META[publisher.level].label.replace(" Publisher", "")}
            </span>
          )}
          {publisher.verified && (
            <span className="absolute top-2.5 right-2.5 bg-billboard-ink text-white text-[10px] font-mono font-semibold px-2 py-1 rounded">
              ✓ Verified
            </span>
          )}
          <div className="absolute -bottom-6 left-4 w-12 h-12 rounded-full bg-billboard-yellow border-[3px] border-billboard-ink flex items-center justify-center font-display text-xs">
            {publisher.initials}
          </div>
          {isCurrentlyFeatured(publisher) && (
            <span className="absolute bottom-2.5 right-2.5 bg-billboard-yellow text-billboard-ink text-[10px] font-mono font-semibold px-2 py-1 rounded border border-billboard-ink">
              ★ Featured
            </span>
          )}
        </div>
        <div className="pt-8 pb-3 px-4">
          <h3 className="font-bold text-base leading-snug">{publisher.name}</h3>
          <p className="text-xs text-billboard-inkSoft mt-0.5">
            {publisher.city}, {publisher.province}
            {publisher.channel_slug && publisher.channel_slug !== "social-media" && (
              <span className="ml-1.5 font-mono text-[10px] uppercase text-billboard-greenDeep">
                · {getChannelBySlug(publisher.channel_slug)?.definition.emoji} {getChannelBySlug(publisher.channel_slug)?.definition.name}
              </span>
            )}
          </p>
          {matchReason && (
            <p className="mt-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-billboard-greenDeep bg-[#EAF3EC] border border-billboard-greenDeep rounded-full px-2 py-0.5 inline-block">
              {matchReason}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 my-2.5">
            {publisher.platforms.map(p => (
              <span key={p} className="font-mono text-[10px] border border-billboard-ink rounded-full px-2 py-0.5 bg-billboard-paperDim">{p}</span>
            ))}
          </div>
          <ResponseTimeBadge avgResponseHours={publisher.avg_response_hours} responseCount={publisher.response_count} className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-billboard-greenDeep mb-1" />
          <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t border-billboard-paperDim">
            <div>
              <div className="font-semibold">{formatFollowers(publisher.followers)} followers</div>
              <div className="text-billboard-inkSoft text-xs">{publisher.engagement}% engagement</div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-billboard-greenDeep">R{publisher.price_per_post}</div>
              <div className="text-xs text-billboard-inkSoft">
                {publisher.rating ? `★ ${publisher.rating} (${publisher.reviews})` : "No reviews yet"}
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Action bar */}
      <div className="flex gap-2 px-4 pb-4 pt-2.5 border-t-2 border-billboard-paperDim">
        {/* Compare button */}
        <button
          onClick={() => togglePublisher(publisher.id)}
          disabled={!comparing && isFull}
          title={!comparing && isFull ? "Comparison is full (max 5)" : comparing ? "Remove from comparison" : "Add to comparison"}
          className={`flex-1 text-xs font-semibold py-1.5 rounded border-2 transition ${
            comparing
              ? "border-billboard-green bg-billboard-green text-white"
              : "border-billboard-ink hover:bg-billboard-paperDim disabled:opacity-40 disabled:cursor-not-allowed"
          }`}
        >
          {comparing ? "✓ Comparing" : isFull ? "Full" : "⊞ Compare"}
        </button>

        {/* Save button + dropdown */}
        <div className="relative flex-1" ref={saveRef}>
          <button
            onClick={() => setShowSave(s => !s)}
            className={`w-full text-xs font-semibold py-1.5 rounded border-2 transition ${
              saved
                ? "border-billboard-yellow bg-billboard-yellow text-billboard-ink"
                : "border-billboard-ink hover:bg-billboard-paperDim"
            }`}
          >
            {saved ? "★ Saved" : "☆ Save"}
          </button>

          {showSave && (
            <div className="absolute bottom-full mb-1 right-0 z-30 w-52 bg-white border-[3px] border-billboard-ink rounded shadow-block overflow-hidden">
              {lists.length > 0 && (
                <div className="max-h-36 overflow-y-auto">
                  {lists.map(list => (
                    <button
                      key={list.id}
                      onClick={() => { addToList(list.id, publisher.id); setShowSave(false); }}
                      className="w-full text-left px-3 py-2.5 text-xs font-semibold hover:bg-billboard-paperDim border-b border-billboard-paperDim last:border-0 truncate"
                    >
                      {list.publisherIds.includes(publisher.id) ? "✓ " : "+ "}{list.name}
                    </button>
                  ))}
                </div>
              )}
              <form onSubmit={handleNewList} className={`p-2.5 ${lists.length > 0 ? "border-t-2 border-billboard-paperDim" : ""}`}>
                <p className="text-[10px] font-mono uppercase text-billboard-inkSoft mb-1.5">New list</p>
                <input
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  placeholder="e.g. Christmas Campaign"
                  className="w-full border-2 border-billboard-ink rounded px-2 py-1.5 text-xs mb-2 bg-white"
                  autoFocus={lists.length === 0}
                />
                <button type="submit" className="w-full bg-billboard-yellow border-2 border-billboard-ink font-bold text-xs py-1.5 rounded hover:-translate-y-0.5 transition">
                  Create & save
                </button>
              </form>
              <Link to="/lists" onClick={() => setShowSave(false)} className="block text-center text-[10px] font-mono uppercase text-billboard-inkSoft py-2 hover:bg-billboard-paperDim border-t border-billboard-paperDim">
                Manage lists →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
