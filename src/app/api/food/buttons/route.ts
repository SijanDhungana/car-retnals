import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { foodRequestButtons } from "@/db/schema";
import { foodButtonSchema, isFoodLocation } from "@/lib/food";

export const dynamic = "force-dynamic";

/** GET /api/food/buttons?location=pickering → saved request buttons for that shop. */
export async function GET(request: Request) {
  const location = new URL(request.url).searchParams.get("location");
  if (!isFoodLocation(location)) {
    return NextResponse.json({ error: "Unknown location" }, { status: 400 });
  }
  const rows = await db
    .select({ id: foodRequestButtons.id, label: foodRequestButtons.label })
    .from(foodRequestButtons)
    .where(eq(foodRequestButtons.location, location))
    .orderBy(asc(foodRequestButtons.id));
  return NextResponse.json({ buttons: rows }, { headers: { "Cache-Control": "no-store" } });
}

/** POST /api/food/buttons { location, label } → adds a button. */
export async function POST(request: Request) {
  const parsed = foodButtonSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid button" },
      { status: 400 },
    );
  }
  const [row] = await db
    .insert(foodRequestButtons)
    .values(parsed.data)
    .returning({ id: foodRequestButtons.id, label: foodRequestButtons.label });
  return NextResponse.json({ button: row }, { status: 201 });
}

/** DELETE /api/food/buttons?location=pickering&id=3 → removes a button. */
export async function DELETE(request: Request) {
  const params = new URL(request.url).searchParams;
  const location = params.get("location");
  const id = Number(params.get("id"));
  if (!isFoodLocation(location) || !Number.isInteger(id)) {
    return NextResponse.json({ error: "Unknown button" }, { status: 400 });
  }
  await db
    .delete(foodRequestButtons)
    .where(and(eq(foodRequestButtons.id, id), eq(foodRequestButtons.location, location)));
  return new NextResponse(null, { status: 204 });
}
