import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findLocation } from "@/lib/food";
import UpstairsScreen from "./UpstairsScreen";

export const metadata: Metadata = { title: "Upstairs — Food Call" };

export default async function UpstairsPage({
  params,
}: {
  params: Promise<{ location: string }>;
}) {
  const location = findLocation((await params).location);
  if (!location) notFound();
  return <UpstairsScreen location={location.slug} locationName={location.name} />;
}
