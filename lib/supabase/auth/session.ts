
import "server-only";

import { SignJWT, jwtVerify } from "jose";

const secretValue = process.env.SESSION_SECRET;

if (!secretValue || secretValue.length < 32) {
    throw new Error(
        "SESSION_SECRET must be configured with at least 32 characters."
    );
}

const secret = new TextEncoder().encode(secretValue);

export type AdminSession = {
    adminId: string;
    username: string;
};

export async function createSessionToken(
    admin: AdminSession
): Promise<string> {
    return new SignJWT({
        adminId: admin.adminId,
        username: admin.username,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("8h")
        .sign(secret);
}

export async function verifySessionToken(
    token: string
): Promise<AdminSession | null> {
    try {
        const { payload } = await jwtVerify(token, secret, {
            algorithms: ["HS256"],
        });

        if (
            typeof payload.adminId !== "string" ||
            typeof payload.username !== "string"
        ) {
            return null;
        }

        return {
            adminId: payload.adminId,
            username: payload.username,
        };
    } catch {
        return null;
    }
}
