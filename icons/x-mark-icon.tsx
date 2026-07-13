type XMarkIconProps = {
  size?: number;
};

export function XMarkIcon(props: XMarkIconProps): React.ReactElement {
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
      aria-label="Close icon"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
