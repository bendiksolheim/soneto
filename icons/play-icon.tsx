type PlayIconProps = {
  size?: number;
};

export function PlayIcon(props: PlayIconProps): React.ReactElement {
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
      aria-label="Play icon"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.985V5.653Z"
      />
    </svg>
  );
}
