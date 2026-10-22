import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findLocation } from "@/lib/food";
import UpstairsScreen from "./UpstairsScreen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ location: string }>;
}): Promise<Metadata> {
  const location = findLocation((await params).location);
  return { title: `${location?.sides.counter.label ?? "Food Call"} — Food Call` };
}

export default async function UpstairsPage({
  params,
}: {
  params: Promise<{ location: string }>;
}) {
  const location = findLocation((await params).location);
  if (!location) notFound();
  return <UpstairsScreen location={location.slug} locationName={location.name} />;
}
