import { NextResponse } from "next/server";
import { and, asc, gt, gte } from "drizzle-orm";
import { db } from "@/db";
import { foodOrders, type FoodOrder } from "@/db/schema";
import { FOOD_HISTORY_HOURS, foodOrderSchema, type FoodOrderDto } from "@/lib/food";

export const dynamic = "force-dynamic";

function toDto(row: FoodOrder): FoodOrderDto {
  return {
    id: row.id,
    item: row.item,
    quantity: row.quantity,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * GET /api/food/orders            → recent orders (oldest first)
 * GET /api/food/orders?after=123  → only orders newer than id 123 (polling)
 */
export async function GET(request: Request) {
  const afterParam = new URL(request.url).searchParams.get("after");
  const after = afterParam ? Number(afterParam) : 0;
  const since = new Date(Date.now() - FOOD_HISTORY_HOURS * 60 * 60 * 1000);

  const rows = await db
    .select()
    .from(foodOrders)
    .where(
      and(
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

/** POST /api/food/orders  { item, quantity?, name? } */
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
