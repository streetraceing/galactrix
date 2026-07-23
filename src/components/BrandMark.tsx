export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <img
      src="/galactrix-mark.svg"
      width={size}
      height={size}
      alt=""
      draggable={false}
      className="shrink-0 rounded-[22%]"
    />
  );
}
