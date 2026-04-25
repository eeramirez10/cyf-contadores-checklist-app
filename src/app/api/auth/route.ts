import { NextResponse, type NextRequest } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, message: "Auth endpoint placeholder" });
}

type LoginPayload = {
  email?: unknown;
  password?: unknown;
};

const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginPayload;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Email invalido." }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "Password requerido." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        {
          error:
            "Falta configuracion de Supabase: NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        },
        { status: 500 },
      );
    }

    const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        email,
        password,
      }),
      cache: "no-store",
    });

    const payload = (await authResponse.json().catch(() => ({}))) as Record<string, unknown>;
    if (!authResponse.ok) {
      const errorMessage =
        (typeof payload.msg === "string" && payload.msg) ||
        (typeof payload.error_description === "string" && payload.error_description) ||
        (typeof payload.error === "string" && payload.error) ||
        "No se pudo iniciar sesion.";
      return NextResponse.json({ error: errorMessage }, { status: authResponse.status });
    }

    const accessToken =
      typeof payload.access_token === "string" ? payload.access_token : null;
    const refreshToken =
      typeof payload.refresh_token === "string" ? payload.refresh_token : null;
    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { error: "Respuesta de autenticacion incompleta." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: payload.user ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
