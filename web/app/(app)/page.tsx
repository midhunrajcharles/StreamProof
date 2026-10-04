import { redirect } from "next/navigation";

// The app starts at the Try page (citizen or organisation); signed-in people go on to their dashboard.
export default function Root() {
  redirect("/start");
}
