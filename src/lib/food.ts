import { z } from "zod";

/**
 * What each shop calls its two ends. `kitchen` makes the food and sends orders;
 * `counter` hears them and can ask the kitchen for things.
 * `spoken` is how the name sounds mid-sentence when read aloud.
 */
export type FoodSides = {
  kitchen: { label: string; spoken: string };
  counter: { label: string; spoken: string };
};

/** The two shops. The slug is used in links: /food/pickering/... */
export const FOOD_LOCATIONS = [
  {
    slug: "pickering",
    name: "Pickering",
    sides: {
      kitchen: { label: "Back room", spoken: "the back room" },
      counter: { label: "Front", spoken: "the front" },
    },
  },
  {
    slug: "scarborough",
    name: "Scarborough",
    sides: {
      kitchen: { label: "Downstairs", spoken: "downstairs" },
      counter: { label: "Upstairs", spoken: "upstairs" },
    },
  },
] as const satisfies readonly { slug: string; name: string; sides: FoodSides }[];

export type FoodLocation = (typeof FOOD_LOCATIONS)[number]["slug"];

export function findLocation(slug: string) {
  return FOOD_LOCATIONS.find((location) => location.slug === slug) ?? null;
}

export function sidesFor(slug: FoodLocation): FoodSides {
  return findLocation(slug)!.sides;
}

function capitalise(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const locationSlugs = FOOD_LOCATIONS.map((location) => location.slug) as [
  FoodLocation,
  ...FoodLocation[],
];

/**
 * Which end a message is for. Stored values kept from the first version:
 * "upstairs" = to the counter (front), "downstairs" = to the kitchen (back room).
 */
export type FoodTarget = "upstairs" | "downstairs";

/**
 * The buttons shown on the downstairs screen: the Savory section of the
 * Craves menu. Items with `pastramiAddOn` get an "Add pastrami" toggle.
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

/** How far back each screen looks when it first opens. */
export const FOOD_HISTORY_HOURS = 16;

export const foodOrderSchema = z
  .object({
    location: z.enum(locationSlugs),
    target: z.enum(["upstairs", "downstairs"]).default("upstairs"),
    kind: z.enum(["order", "request", "message"]).default("order"),
    // Menu items and saved requests are short; messages can be a sentence or two.
    item: z.string().trim().min(1, "Pick an item or type a message").max(200),
    quantity: z.coerce.number().int().min(1).max(50).default(1),
    name: z
      .string()
      .trim()
      .max(40)
      .optional()
      .transform((value) => (value ? value : null)),
  })
  .refine((order) => order.kind === "message" || order.item.length <= 60, {
    message: "Item name is too long",
  });

export const foodButtonSchema = z.object({
  location: z.enum(locationSlugs),
  label: z.string().trim().min(1, "Type what the button should ask for").max(40),
});

export function isFoodLocation(value: string | null): value is FoodLocation {
  return Boolean(value && findLocation(value));
}

/** Shape the API returns; dates as ISO strings so it is JSON-safe. */
export type FoodOrderDto = {
  id: number;
  target: FoodTarget;
  kind: "order" | "request" | "message";
  item: string;
  quantity: number;
  name: string | null;
  createdAt: string;
};

export type FoodButtonDto = { id: number; label: string };

/** "2 × Turkey Melt" — what the screens display. */
export function describeOrder(order: Pick<FoodOrderDto, "kind" | "item" | "quantity">) {
  if (order.kind === "message") return order.item;
  return order.quantity > 1 ? `${order.quantity} × ${order.item}` : order.item;
}

/** Rough English plural so "2 Turkey Melt" is read as "2 turkey melts". */
function plural(item: string) {
  // "Egg Avocado Toast with Pastrami" → pluralise only the part before "with".
  const [main, ...rest] = item.split(" with ");
  const extra = rest.length ? ` with ${rest.join(" with ")}` : "";
  return pluralWord(main.toLowerCase()) + extra.toLowerCase();
}

function pluralWord(word: string) {
  if (/(s|x|z|ch|sh)$/.test(word)) return word.endsWith("s") ? word : `${word}es`;
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
}

/** The sentence read aloud. */
export function spokenOrder(
  order: Pick<FoodOrderDto, "target" | "kind" | "item" | "quantity" | "name">,
  sides: FoodSides,
) {
  const from = order.target === "upstairs" ? sides.kitchen.spoken : sides.counter.spoken;
  if (order.kind === "message") return `Message from ${from}. ${order.item}`;
  if (order.kind === "request") return `${capitalise(sides.counter.spoken)} needs ${order.item}.`;
  const what =
    order.quantity > 1 ? `${order.quantity} ${plural(order.item)}` : order.item;
  const forWho = order.name ? `, for ${order.name}` : "";
  return `New order. ${what}${forWho}.`;
}
