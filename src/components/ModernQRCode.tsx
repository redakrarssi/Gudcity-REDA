import React, { useMemo } from 'react';
import QRCode from 'qrcode';

interface ModernQRCodeProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  logoSrc?: string;
  logoSize?: number;
}

// Render a modern-looking QR using circular modules and rounded finder patterns
// High-level UI-only component; encoded data remains unchanged for scanner compatibility
export const ModernQRCode: React.FC<ModernQRCodeProps> = ({
  value,
  size = 250,
  fgColor = '#3b82f6',
  bgColor = '#ffffff',
  logoSrc,
  logoSize = 40
}) => {
  const { modules, quietZone, cellSize } = useMemo(() => {
    try {
      // Build matrix at high error correction
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qr: any = (QRCode as any).create(value, { errorCorrectionLevel: 'H' });
      const count: number = qr.modules.size;
      const marginModules = 4; // quiet zone (4 modules)
      const total = count + marginModules * 2;
      const pxPerCell = size / total;
      return {
        modules: qr.modules,
        quietZone: marginModules,
        cellSize: pxPerCell
      };
    } catch {
      // Fallback to minimal matrix
      const fallback = { size: 21, data: new Array(21 * 21).fill(false) } as unknown as { size: number; data: boolean[] };
      const marginModules = 4;
      const pxPerCell = size / (fallback.size + marginModules * 2);
      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        modules: { size: fallback.size, data: fallback.data } as any,
        quietZone: marginModules,
        cellSize: pxPerCell
      };
    }
  }, [value, size]);

  // Helper to check whether a module is inside finder pattern area
  const isInFinder = (x: number, y: number, n: number) => {
    const inTopLeft = x <= 6 && y <= 6;
    const inTopRight = x >= n - 7 && y <= 6;
    const inBottomLeft = x <= 6 && y >= n - 7;
    return inTopLeft || inTopRight || inBottomLeft;
  };

  const n: number = modules.size;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = modules.data;

  const total = n + quietZone * 2;
  const svgSize = total * cellSize;

  const circles: JSX.Element[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const idx = n * y + x;
      const on = !!data[idx];
      if (!on) continue;
      if (isInFinder(x, y, n)) continue; // skip finder patterns, drawn separately

      const cx = (x + quietZone + 0.5) * cellSize;
      const cy = (y + quietZone + 0.5) * cellSize;
      const r = cellSize * 0.42; // slightly smaller than half for airy look
      circles.push(<circle key={`c-${x}-${y}`} cx={cx} cy={cy} r={r} fill={fgColor} />);
    }
  }

  // Draw a rounded finder square (outer + inner + center)
  const Finder = ({ x, y }: { x: number; y: number }) => {
    const gx = (x + quietZone) * cellSize;
    const gy = (y + quietZone) * cellSize;
    const s7 = cellSize * 7;
    const s5 = cellSize * 5;
    const s3 = cellSize * 3;
    const rOuter = cellSize * 1.5;
    const rInner = cellSize * 1.2;
    return (
      <g>
        <rect x={gx} y={gy} width={s7} height={s7} rx={rOuter} ry={rOuter} fill={fgColor} />
        <rect x={gx + cellSize} y={gy + cellSize} width={s5} height={s5} rx={rInner} ry={rInner} fill={bgColor} />
        <rect x={gx + cellSize * 2} y={gy + cellSize * 2} width={s3} height={s3} rx={cellSize} ry={cellSize} fill={fgColor} />
      </g>
    );
  };

  return (
    <div className="relative" style={{ width: svgSize, height: svgSize }}>
      <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} shapeRendering="geometricPrecision">
        {/* Background */}
        <rect width={svgSize} height={svgSize} fill={bgColor} />
        {/* Circles */}
        {circles}
        {/* Finder patterns */}
        <Finder x={0} y={0} />
        <Finder x={n - 7} y={0} />
        <Finder x={0} y={n - 7} />
      </svg>
      {logoSrc && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-white rounded-md p-1 shadow-sm" style={{ width: logoSize, height: logoSize }}>
            <img src={logoSrc} alt="logo" className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernQRCode;


