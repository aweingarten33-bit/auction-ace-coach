import { SVGProps } from "react";

/**
 * Football × Superman shield mashup. Pointed shield silhouette with
 * football laces down the center seam.
 */
export default function FootballShieldIcon({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Shield outline */}
      <path d="M12 2.5 L20.5 5.5 V12 c0 5.2 -3.8 8.4 -8.5 9.5 C7.3 20.4 3.5 17.2 3.5 12 V5.5 Z" />
      {/* Football seam */}
      <path d="M8 14 C 10 11.5 14 11.5 16 9" />
      {/* Laces */}
      <path d="M11 13 L11.8 12.2" />
      <path d="M12 12 L12.8 11.2" />
      <path d="M13 11 L13.8 10.2" />
    </svg>
  );
}
