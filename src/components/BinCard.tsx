import Link from "next/link";

type Props = {
  name: string;
  count: number;
  href: string;
  variant?: "compact" | "default" | "wide";
  description?: string;
};

export default function BinCard({
  name,
  count,
  href,
  variant = "default",
  description,
}: Props) {
  const isCompact = variant === "compact";
  const isWide = variant === "wide";

  return (
    <Link
      href={href}
      className={[
        "block rounded-xl border border-emerald-950/50 shadow-sm",
        "bg-[#135B0A] text-[#F5F4CB]",
        "px-4 py-3",
        "hover:bg-[#0f3f0a] transition",
      ].join(" ")}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-none rounded-lg bg-[#0B3D06] px-2 py-1 text-xs font-semibold">
          exe
        </div>

        {isWide ? (
          <div
            className={[
              "min-w-0 flex-1 grid items-center gap-4",
              description
                ? "grid-cols-[minmax(100px,300px)_1px_1fr]"
                : "grid-cols-[minmax(100px,1fr)]",
            ].join(" ")}
          >
            <div className="min-w-0">
              <div className="font-bold text-2xl leading-tight truncate" title={name}>
                {name}
              </div>
            </div>

            {description ? (
              <>
                <div className="self-stretch w-px bg-[#F5F4CB]/40" />
                <div
                  className="min-w-0 text-sm text-[#F5F4CB]/90 leading-snug"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                  title={description}
                >
                  {description}
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <div
              className={[
                "font-semibold truncate leading-tight",
                isCompact ? "text-[clamp(13px,1.1vw,16px)]" : "text-lg",
              ].join(" ")}
              title={name}
            >
              {name}
            </div>
          </div>
        )}

        <div
          className={[
            "flex-none shrink-0",
            "w-10 h-10 aspect-square rounded-full",
            "grid place-items-center",
            "font-bold text-sm",
            count > 0 ? "bg-[#E58A7B] text-black" : "bg-white text-black",
          ].join(" ")}
          aria-label={`hits ${count}`}
        >
          {count}
        </div>
      </div>
    </Link>
  );
}
