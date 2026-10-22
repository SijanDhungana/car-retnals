import { redirect } from "next/navigation";

/** Old link from before locations existed — send people to the location picker. */
export default function OldLink() {
  redirect("/food");
}
