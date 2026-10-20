
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";


export async function GET() {
    try {
        const { error } = await supabaseAdmin
            .from("equipment")
            .select("id", { count: "exact", head: true });

        if (error) {
            console.error("Supabase health check failed:", error.message);

            return NextResponse.json(
                { ok: false, message: "Database connection failed." },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            message: "Supabase database connection successful.",
        });
    } catch (error) {
        console.error("Health check error:", error);

        return NextResponse.json(
            { ok: false, message: "Server health check failed." },
            { status: 500 }
        );
    }
}
