import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "SalmonWatch BC — Pacific salmon intelligence platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#080c14",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: "absolute",
            top: -100,
            left: "50%",
            transform: "translateX(-50%)",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(61,154,106,0.12) 0%, transparent 70%)",
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20,
            padding: "6px 16px",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "rgba(52,211,153,0.6)",
            }}
          />
          <span style={{ color: "#94a3b8", fontSize: 14, fontWeight: 500 }}>
            Open-source salmon intelligence
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            gap: 16,
            color: "#ffffff",
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          <span>SalmonWatch</span>
          <span style={{ color: "#64748b" }}>BC</span>
        </div>

        {/* Subtitle */}
        <p
          style={{
            color: "#94a3b8",
            fontSize: 24,
            marginTop: 16,
            textAlign: "center",
          }}
        >
          100 years of Pacific salmon data. 9,800+ populations.
        </p>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 48,
            marginTop: 40,
          }}
        >
          {[
            { value: "6,284", label: "Populations" },
            { value: "100+", label: "Years of Data" },
            { value: "80%", label: "Unmonitored" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span
                style={{ color: "#e2e8f0", fontSize: 28, fontWeight: 600 }}
              >
                {stat.value}
              </span>
              <span
                style={{
                  color: "#475569",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
