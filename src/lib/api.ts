import { NextResponse } from "next/server";
import { auth } from "@/auth";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Ensures the current request is from an authenticated admin. Throws ApiError(401) otherwise. */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError(401, "Authentication required");
  }
  return session.user;
}

/** Ensures the current admin is a SUPER_ADMIN. Throws ApiError(403) otherwise. */
export async function requireSuperAdmin() {
  const user = await requireAdmin();
  if (user.role !== "SUPER_ADMIN") {
    throw new ApiError(403, "Super admin privileges required");
  }
  return user;
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
