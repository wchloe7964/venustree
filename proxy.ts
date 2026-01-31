import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const url = request.nextUrl.clone();

  if (user) {
    // Check if user is approved in the database
    const { data: profile } = await supabase
      .from("profiles")
      .select("approved")
      .eq("id", user.id)
      .single();

    // If logged in but NOT approved, force them to login with a warning
    if (url.pathname.startsWith("/admin") && !profile?.approved) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "pending_approval");
      return NextResponse.redirect(loginUrl);
    }

    // Redirect logged-in and approved users away from login/register
    if (
      (url.pathname === "/login" || url.pathname === "/register") &&
      profile?.approved
    ) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  } else if (url.pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
