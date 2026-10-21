import type { Metadata } from "next";
import ReceiveBoard from "./ReceiveBoard";

export const metadata: Metadata = { title: "Food Call — Receive" };

export default function ReceivePage() {
  return <ReceiveBoard />;
}
