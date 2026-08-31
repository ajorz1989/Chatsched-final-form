import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { exportAccountData, downloadAccountData } from "../lib/accountExport";
import { formatSupabaseError } from "../lib/supabaseErrors";
import SetupNotice from "../components/SetupNotice";
import SubscriptionSection from "../components/SubscriptionSection";
import Seo from "../components/Seo";

const CONFIRM_PHRASE = "DELETE MY ACCOUNT";

export default function AccountSettings() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<string[] | null>(null);

  if (!isSupabaseConfigured) return <SetupNotice />;
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const data = await exportAccountData(user!.id);
      downloadAccountData(data);
    } catch (err) {
      setExportError(formatSupabaseError(err, "Couldn't generate account data export"));
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    setBlockers(null);
    const { data, error } = await supabase.functions.invoke("delete-account", { body: {} });
    setDeleting(false);
    if (error || data?.error) {
      if (data?.blockers) {
        setBlockers(data.blockers);
      } else {
        setDeleteError(formatSupabaseError(error || data?.error, "Couldn't delete your account"));
      }
      return;
    }
    await signOut();
    navigate("/", { replace: true });
  }

  const isAdmin = profile?.role === "admin";

  return (
    <div className="max-w-xl mx-auto px-5 py-16">
      <Seo title="Account Settings · ChatSched" noindex />
      <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-red text-billboard-red px-3 py-1.5 rounded mb-3">Account</span>
      <h1 className="text-3xl mb-2">Your data, your account.</h1>
      <p className="text-billboard-inkSoft mb-10">Download everything stored against your account, or close it for good.</p>

      {(profile?.role === "business" || profile?.role === "publisher") && (
        <SubscriptionSection userId={user.id} role={profile.role} />
      )}

      <section className="border-[3px] border-billboard-ink rounded p-6 mb-6">
        <h2 className="font-display text-lg mb-1.5">Export your data</h2>
        <p className="text-sm text-billboard-inkSoft mb-4">
          A JSON file with every row stored against your account — profile, requests, payments, messages, reviews, and everything else. Nothing summarized or left out.
        </p>
        {exportError && <p className="text-billboard-red text-xs font-semibold mb-3">{exportError}</p>}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 border-[3px] border-billboard-ink font-bold px-5 py-2.5 rounded hover:-translate-y-0.5 transition text-sm bg-white disabled:opacity-60"
        >
          {exporting ? "Preparing…" : "Download my data"}
        </button>
      </section>

      <section className="border-[3px] border-billboard-red rounded p-6">
        <h2 className="font-display text-lg mb-1.5 text-billboard-red">Delete your account</h2>

        {isAdmin ? (
          <p className="text-sm text-billboard-inkSoft">
            Admin accounts can't be self-deleted here — remove the admin role first, or ask another admin to close this account for you.
          </p>
        ) : (
          <>
            <p className="text-sm text-billboard-inkSoft mb-4">
              Permanently deletes your login and removes your requests, payments, messages, reviews, and other account data. This can't be undone — download your export above first if you want to keep a copy.
            </p>
            {blockers && (
              <div className="border-2 border-billboard-red rounded p-3 mb-4">
                <p className="text-xs font-semibold mb-1.5">Can't delete yet — this affects someone else and needs to be resolved first:</p>
                <ul className="text-xs text-billboard-inkSoft list-disc list-inside space-y-0.5">
                  {blockers.map((b) => <li key={b}>{b}</li>)}
                </ul>
              </div>
            )}
            {deleteError && <p className="text-billboard-red text-xs font-semibold mb-4">{deleteError}</p>}
            <label className="block text-xs font-semibold mb-1.5">
              Type <span className="font-mono">{CONFIRM_PHRASE}</span> to confirm
            </label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full border-2 border-billboard-ink rounded px-3 py-2 text-sm mb-3"
              placeholder={CONFIRM_PHRASE}
            />
            <button
              onClick={handleDelete}
              disabled={deleting || confirmText !== CONFIRM_PHRASE}
              className="w-full bg-billboard-red text-white border-[3px] border-billboard-ink font-bold py-2.5 rounded hover:-translate-y-0.5 transition disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {deleting ? "Deleting…" : "Permanently delete my account"}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
