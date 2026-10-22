import { NextResponse } from "next/server";
import { and, asc, eq, gt, gte } from "drizzle-orm";
import { db } from "@/db";
import { foodOrders, type FoodOrder } from "@/db/schema";
import {
  FOOD_HISTORY_HOURS,
  foodOrderSchema,
  isFoodLocation,
  type FoodOrderDto,
} from "@/lib/food";

export const dynamic = "force-dynamic";

function toDto(row: FoodOrder): FoodOrderDto {
  return {
    id: row.id,
    target: row.target === "downstairs" ? "downstairs" : "upstairs",
    kind: row.kind === "message" || row.kind === "request" ? row.kind : "order",
    item: row.item,
    quantity: row.quantity,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * GET /api/food/orders?location=pickering&target=upstairs            → recent (oldest first)
 * GET /api/food/orders?location=pickering&target=upstairs&after=123  → newer than id 123
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const location = params.get("location");
  const target = params.get("target") === "downstairs" ? "downstairs" : "upstairs";
  if (!isFoodLocation(location)) {
    return NextResponse.json({ error: "Unknown location" }, { status: 400 });
  }
  const after = Number(params.get("after") ?? 0);
  const since = new Date(Date.now() - FOOD_HISTORY_HOURS * 60 * 60 * 1000);

  const rows = await db
    .select()
    .from(foodOrders)
    .where(
      and(
        eq(foodOrders.location, location),
        eq(foodOrders.target, target),
        gte(foodOrders.createdAt, since),
        Number.isInteger(after) && after > 0 ? gt(foodOrders.id, after) : undefined,
      ),
    )
    .orderBy(asc(foodOrders.id))
    .limit(300);

  return NextResponse.json(
    { orders: rows.map(toDto) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** POST /api/food/orders  { location, target, kind, item, quantity?, name? } */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = foodOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid order" },
      { status: 400 },
    );
  }

  const [row] = await db.insert(foodOrders).values(parsed.data).returning();
  return NextResponse.json({ order: toDto(row) }, { status: 201 });
}
