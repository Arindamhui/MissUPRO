import { cn } from "@/lib/utils";

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "MU";
}

export function Avatar({
  name,
  imageUrl,
  className,
}: {
  name: string;
  imageUrl?: string | null;
  className?: string;
}) {
  if (imageUrl) {
    return <img src={imageUrl} alt={name} className={cn("h-11 w-11 rounded-full object-cover", className)} />;
  }

  return (
    <div
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6b3d] to-[#ffb84d] text-sm font-bold text-[#1f1420]",
        className,
      )}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
}