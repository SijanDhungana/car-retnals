import type { Metadata } from "next";
import { FOOD_MENU } from "@/lib/food";
import SendForm from "./SendForm";

export const metadata: Metadata = { title: "Food Call — Send" };

export default function SendPage() {
  return <SendForm menu={[...FOOD_MENU]} />;
}
