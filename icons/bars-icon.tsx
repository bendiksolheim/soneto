type BarsIconProps = {
  size?: number;
};

export function BarsIcon(props: BarsIconProps): React.ReactElement {
  const size = props.size || 24;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      role="img"
      aria-label="Menu icon"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
      />
    </svg>
  );
}
