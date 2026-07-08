export function trackingStatusLabel(status: string): string {
  return status.replace("_", " ");
}

export function trackingStatusVariant(status: string): "default" | "success" | "warning" | "secondary" {
  if (status === "applied" || status === "interview" || status === "offer") return "success";
  if (status === "rejected" || status === "skipped") return "warning";
  if (status === "no_response") return "secondary";
  return "default";
}
