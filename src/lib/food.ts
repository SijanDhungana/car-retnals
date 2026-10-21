import { z } from "zod";

/**
 * The buttons shown on the "send" screen: the Savory section of the Craves
 * menu. Items with `pastramiAddOn` get an "Add pastrami" toggle.
 */
export const FOOD_MENU: { name: string; pastramiAddOn?: boolean }[] = [
  { name: "Egg Avocado Toast", pastramiAddOn: true },
  { name: "Egg & Cheese English Muffin", pastramiAddOn: true },
  { name: "Turkey Melt" },
  { name: "Pastrami Melt" },
  { name: "Chicken Fajita Wrap" },
  { name: "Pesto Grilled Cheese" },
  { name: "Tuna Sandwich" },
];

export type FoodMenuItem = (typeof FOOD_MENU)[number];

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
  // "Egg Avocado Toast with Pastrami" → pluralise only the part before "with".
  const [main, ...rest] = item.split(" with ");
  const extra = rest.length ? ` with ${rest.join(" with ")}` : "";
  const word = main.toLowerCase();
  return pluralWord(word) + extra.toLowerCase();
}

function pluralWord(word: string) {
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
