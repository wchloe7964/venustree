"use server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// 1. GOD MODE CLIENT (Bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

// 2. SESSION CLIENT (User-level access)
async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {}
        },
        remove(name: string, options: any) {
          try {
            cookieStore.delete({ name, ...options });
          } catch {}
        },
      },
    },
  );
}

const MASTER_EMAIL = "wchloe7964@gmail.com";

// --- SUPER ADMIN ACTIONS ---

export async function toggleNodeLock(userId: string, lockStatus: boolean) {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.email !== MASTER_EMAIL) return { success: false };

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ is_locked: lockStatus })
    .eq("id", userId);

  revalidatePath("/admin/super");
  return { success: !error };
}

export async function sendTargetedMessage(
  userId: string,
  message: string,
  type: "INFO" | "ALERT" | "DIRECT_LOCK" = "INFO",
) {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.email !== MASTER_EMAIL) return { success: false };

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      system_message: message,
      message_type: type, // This column now exists!
    })
    .eq("id", userId);

  revalidatePath("/admin/super");
  return { success: !error };
}
/**
 * Broadcasts a system-wide message via the system_config table.
 * All nodes will see this regardless of their individual settings.
 */
export async function broadcastSystemMessage(
  message: string,
  type: "INFO" | "ALERT" | "MAINTENANCE",
) {
  try {
    const supabase = await getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email !== MASTER_EMAIL) return { success: false };

    // We use upsert on the 'system_broadcast' key so there's only ever one active global message
    const { error } = await supabaseAdmin.from("system_config").upsert(
      {
        key: "system_broadcast",
        value: {
          message,
          type,
          timestamp: new Date().toISOString(),
        },
      },
      { onConflict: "key" },
    );

    if (error) {
      console.error("Broadcast Error:", error);
      return { success: false };
    }

    revalidatePath("/admin"); // Refresh everyone's dashboard
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function getGlobalBroadcast() {
  try {
    const { data, error } = await supabaseAdmin
      .from("system_config")
      .select("value")
      .eq("key", "system_broadcast")
      .single();

    // If there's an error, no data, or the message is empty/whitespace, return null
    if (error || !data || !data.value?.message?.trim()) {
      return null;
    }

    return data.value as { message: string; type: string; timestamp: string };
  } catch {
    return null;
  }
}

export async function getPendingUsers() {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("approved", false);
  return data || [];
}

export async function getGlobalLoot() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_REMOTE_API}`, {
      cache: "no-store",
    });
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

export async function approveUser(userId: string) {
  try {
    const supabase = await getSupabase();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (currentUser?.email !== MASTER_EMAIL) {
      return { success: false, error: "Unauthorized" };
    }

    const tenant_id = `node_${Math.random().toString(36).substring(2, 10)}`;
    const { data: authUser } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    const { error: dbError } = await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        email: authUser.user?.email,
        approved: true,
        tenant_id: tenant_id,
        is_locked: false,
        system_message: "",
        message_type: "INFO",
        last_active: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (dbError) return { success: false, error: dbError.message };

    revalidatePath("/admin/super");
    return { success: true };
  } catch (err) {
    return { success: false, error: "Internal server error" };
  }
}

export async function declineUser(userId: string) {
  try {
    const supabase = await getSupabase();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (currentUser?.email !== MASTER_EMAIL) return { success: false };

    await supabaseAdmin.auth.admin.deleteUser(userId);
    const { error: dbError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    revalidatePath("/admin/super");
    return { success: !dbError };
  } catch (error) {
    return { success: false };
  }
}

export async function updateAdminCredentials(
  userId: string,
  data: { email?: string; password?: string },
) {
  const updateFields: any = { email_confirm: true };
  if (data.email) updateFields.email = data.email;
  if (data.password) updateFields.password = data.password;

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    updateFields,
  );
  if (authError) return { success: false, error: authError.message };

  if (data.email) {
    await supabaseAdmin
      .from("profiles")
      .update({ email: data.email })
      .eq("id", userId);
  }

  revalidatePath("/admin/super");
  return { success: true };
}

// --- STANDARD ADMIN ACTIONS ---

export async function getNodeStatus() {
  try {
    const supabase = await getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // Use Admin client to bypass RLS for critical lock checks
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("is_locked, approved, tenant_id, system_message, message_type")
      .eq("id", user.id)
      .single();

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getRemoteLoot() {
  try {
    const supabase = await getSupabase();
    // Use { auth: { refreshSession: true } } implicitly by calling getUser
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    // Use admin client to ensure we get the tenant_id even if RLS is acting up
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id, approved, is_locked")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile?.approved ||
      !profile?.tenant_id ||
      profile?.is_locked
    ) {
      return [];
    }

    // Update heartbeat WITHOUT awaiting to speed up response
    supabaseAdmin
      .from("profiles")
      .update({ last_active: new Date().toISOString() })
      .eq("id", user.id)
      .then();

    // CACHE BUSTING: Add a timestamp to the URL so Next.js doesn't cache the JSON
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_REMOTE_API}?tenant=${profile.tenant_id}&ts=${Date.now()}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      },
    );

    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error("Loot Fetch Error:", error);
    return [];
  }
}

export async function purgeRemoteLoot() {
  try {
    const supabase = await getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false };

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) return { success: false };

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_REMOTE_API}?tenant=${profile.tenant_id}`,
      { method: "DELETE", cache: "no-store" },
    );

    return { success: res.ok };
  } catch (error) {
    return { success: false };
  }
}

export async function logout() {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
