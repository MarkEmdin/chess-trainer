import ChessboardWithNotation from '@/app/components/ChessboardWithNotation';

type Variant = 'card' | 'modal';

type Props = {
  position: string;
  orientation: 'white' | 'black';
  variant?: Variant;
};

// `card` sizes for the coaching thread/admin cards (centered on mobile,
// pinned to the left and slightly narrower from `sm` up). `modal` is wider
// and never centers, since the request modal already constrains its width.
const VARIANT_CLASSES: Record<Variant, string> = {
  card: 'w-[220px] mx-auto sm:w-[200px] sm:mx-0 sm:shrink-0 sm:self-start pointer-events-none',
  modal: 'w-full sm:w-[240px] sm:shrink-0 sm:self-start pointer-events-none',
};

export default function ChessboardContainer({
  position,
  orientation,
  variant = 'card',
}: Props) {
  return (
    <div className={VARIANT_CLASSES[variant]}>
      <ChessboardWithNotation position={position} boardOrientation={orientation} />
    </div>
  );
}
