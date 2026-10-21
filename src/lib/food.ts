import { z } from "zod";

/**
 * The buttons shown on the "send" screen. Edit this list to match what the
 * downstairs kitchen actually makes — anything not listed can still be typed
 * in with "Something else".
 */
export const FOOD_MENU = [
  "Samosa",
  "Sausage roll",
  "Pasty",
  "Pie",
  "Quiche",
  "Spring roll",
  "Pakora",
  "Toastie",
  "Panini",
  "Wrap",
  "Sandwich",
  "Chips",
] as const;

/** How far back the receiving screen looks when it first opens. */
export const FOOD_HISTORY_HOURS = 16;

export const foodOrderSchema = z.object({
  item: z.string().trim().min(1, "Pick an item").max(60),
  quantity: z.coerce.number().int().min(1).max(50).default(1),
  name: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((value) => (value ? value : null)),
});

export type FoodOrderInput = z.infer<typeof foodOrderSchema>;

/** Shape the API returns; dates as ISO strings so it is JSON-safe. */
export type FoodOrderDto = {
  id: number;
  item: string;
  quantity: number;
  name: string | null;
  createdAt: string;
};

/** "2 sausage rolls" / "1 pasty" — what the receiver displays. */
export function describeOrder(order: Pick<FoodOrderDto, "item" | "quantity">) {
  return order.quantity > 1 ? `${order.quantity} × ${order.item}` : order.item;
}

/** Rough English plural so "2 Sausage roll" is read as "2 sausage rolls". */
function plural(item: string) {
  const word = item.toLowerCase();
  if (/(s|x|z|ch|sh)$/.test(word)) return word.endsWith("s") ? word : `${word}es`;
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
}

/** The sentence read aloud on the receiving screen. */
export function spokenOrder(order: Pick<FoodOrderDto, "item" | "quantity" | "name">) {
  const what =
    order.quantity > 1 ? `${order.quantity} ${plural(order.item)}` : order.item;
  const forWho = order.name ? `, for ${order.name}` : "";
  return `New order. ${what}${forWho}.`;
}
