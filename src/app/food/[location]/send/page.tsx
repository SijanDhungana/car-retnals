import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findLocation } from "@/lib/food";
import DownstairsScreen from "./DownstairsScreen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ location: string }>;
}): Promise<Metadata> {
  const location = findLocation((await params).location);
  return { title: `${location?.sides.kitchen.label ?? "Food Call"} — Food Call` };
}

export default async function DownstairsPage({
  params,
}: {
  params: Promise<{ location: string }>;
}) {
  const location = findLocation((await params).location);
  if (!location) notFound();
  return <DownstairsScreen location={location.slug} locationName={location.name} />;
}
