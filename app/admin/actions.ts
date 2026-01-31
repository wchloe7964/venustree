"use server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// 1. GOD MODE CLIENT
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

// 2. SESSION CLIENT
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
            cookieStore.set({ name, value: "", ...options });
          } catch {}
        },
      },
    },
  );
}

const MASTER_EMAIL = "wchloe7964@gmail.com";

// --- SUPER ADMIN ACTIONS (God Mode) ---

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

    // 1. Security Check: Only you can approve users
    if (currentUser?.email !== MASTER_EMAIL) {
      return { success: false, error: "Unauthorized" };
    }

    // 2. Generate a clean Tenant ID (8 chars, alphanumeric)
    const tenant_id = `node_${Math.random().toString(36).substring(2, 10)}`;

    // 3. Update Profile using Admin Client (Bypasses RLS)
    const { data, error: dbError } = await supabaseAdmin
      .from("profiles")
      .update({
        approved: true,
        tenant_id: tenant_id,
        last_active: new Date().toISOString(),
      })
      .eq("id", userId)
      .select(); // select() helps confirm the update actually happened

    if (dbError) {
      console.error("Database Approval Error:", dbError.message);
      return { success: false, error: dbError.message };
    }

    if (!data || data.length === 0) {
      return { success: false, error: "User profile not found." };
    }

    revalidatePath("/admin/super");
    return { success: true };
  } catch (err) {
    console.error("Approve Logic Crash:", err);
    return { success: false, error: "Internal server error" };
  }
}

export async function declineUser(userId: string) {
  try {
    const supabase = await getSupabase();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (currentUser?.email !== MASTER_EMAIL) {
      return { success: false, error: "Unauthorized access." };
    }

    // 1. Delete from Auth
    const { error: authError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    // 2. Delete from Profiles
    const { error: dbError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    revalidatePath("/admin/super");
    return { success: !dbError };
  } catch (error: any) {
    return { success: false, error: "Server error during deletion." };
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

export async function getRemoteLoot() {
  try {
    const supabase = await getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, approved")
      .eq("id", user.id)
      .single();

    if (!profile?.approved || !profile?.tenant_id) return [];

    // --- PULSE: Update Last Seen ---
    supabaseAdmin
      .from("profiles")
      .update({ last_active: new Date().toISOString() })
      .eq("id", user.id)
      .then();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_REMOTE_API}?tenant=${profile.tenant_id}`,
      { cache: "no-store" },
    );
    return res.ok ? await res.json() : [];
  } catch (error) {
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

    const { data: profile } = await supabase
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
