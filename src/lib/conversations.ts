import { supabase } from "./supabase";

/**
 * Find the existing 1:1 thread between this business and publisher, or
 * open a new empty one. Used by /messages?publisher= when "Contact
 * Publisher" lands on ChatSched Messages.
 */
export async function findOrCreateConversation(
  businessId: string,
  publisherId: string
): Promise<{ id: string | null; error: string | null }> {
  const { data: existing, error: selectError } = await supabase
    .from("conversations")
    .select("id")
    .eq("business_id", businessId)
    .eq("publisher_id", publisherId)
    .maybeSingle();
  if (selectError) return { id: null, error: selectError.message };
  if (existing) return { id: existing.id, error: null };

  const { data: created, error: insertError } = await supabase
    .from("conversations")
    .insert({ business_id: businessId, publisher_id: publisherId })
    .select("id")
    .single();
  if (created) return { id: created.id, error: null };

  // Unique-constraint race: another tab created it first. Read again.
  const { data: again } = await supabase
    .from("conversations")
    .select("id")
    .eq("business_id", businessId)
    .eq("publisher_id", publisherId)
    .maybeSingle();
  if (again) return { id: again.id, error: null };
  return { id: null, error: insertError?.message ?? "Couldn't open that conversation." };
}
