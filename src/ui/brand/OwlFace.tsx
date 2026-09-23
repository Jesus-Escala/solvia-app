import { OWL, OWL_COLORS } from './owlGeometry';

/**
 * Soli's face in the 64x64 geometry, shared by the logo mark and the mascot so they are always
 * identical. `happy` draws smiling eyes; `blink` enables the periodic blink animation.
 */
export function OwlFace({
  happy = false,
  blink = false,
  outline = false,
}: {
  happy?: boolean;
  blink?: boolean;
  /** Soft outline around the head (used when it sits on light backgrounds). */
  outline?: boolean;
}) {
  return (
    <g>
      <path
        d={OWL.head}
        fill={OWL_COLORS.head}
        stroke={outline ? OWL_COLORS.outline : undefined}
        strokeWidth={outline ? 1.05 : undefined}
      />
      {OWL.brows.map((brow) => (
        <path
          key={brow}
          d={brow}
          stroke={OWL_COLORS.brow}
          strokeWidth="2.3"
          strokeLinecap="round"
          fill="none"
        />
      ))}
      {OWL.blush.map((cheek) => (
        <ellipse
          key={cheek.cx}
          cx={cheek.cx}
          cy={cheek.cy}
          rx={cheek.rx}
          ry={cheek.ry}
          fill={OWL_COLORS.blush}
          opacity="0.5"
        />
      ))}
      {OWL.eyes.map((eye) => (
        <g key={eye.cx}>
          <circle cx={eye.cx} cy={eye.cy} r={OWL.eyeRing} fill={OWL_COLORS.eyeRing} />
          {happy ? (
            <path
              d={`M${eye.cx - 4.8} ${eye.cy + 1.4} Q${eye.cx} ${eye.cy - 4.4} ${eye.cx + 4.8} ${eye.cy + 1.4}`}
              stroke={OWL_COLORS.pupil}
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            <g className={blink ? 'mascot-blink' : undefined}>
              <circle cx={eye.cx} cy={eye.cy} r={OWL.pupil} fill={OWL_COLORS.pupil} />
              {OWL.highlights.map((spark) => (
                <circle
                  key={spark.dx}
                  cx={eye.cx + spark.dx}
                  cy={eye.cy + spark.dy}
                  r={spark.r}
                  fill="#ffffff"
                />
              ))}
            </g>
          )}
        </g>
      ))}
      <path d={OWL.beak} fill={OWL_COLORS.beak} />
    </g>
  );
}
