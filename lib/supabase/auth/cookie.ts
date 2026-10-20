
import "server-only";

import { cookies } from "next/headers";
import {
    createSessionToken,
    verifySessionToken,
    type AdminSession,
} from "@/lib/supabase/auth/session"

const COOKIE_NAME = "borrowbox_session";

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 8,
};

export async function setAdminSession(
    admin: AdminSession
): Promise<void> {
    const token = await createSessionToken(admin);
    const cookieStore = await cookies();

    cookieStore.set(COOKIE_NAME, token, cookieOptions);
}

export async function getAdminSession(): Promise<AdminSession | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
        return null;
    }

    return verifySessionToken(token);
}

export async function clearAdminSession(): Promise<void> {
    const cookieStore = await cookies();

    cookieStore.set(COOKIE_NAME, "", {
        ...cookieOptions,
        maxAge: 0,
    });
}
