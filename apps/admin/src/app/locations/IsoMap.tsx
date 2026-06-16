'use client';

import { CSSProperties, MouseEvent } from 'react';

export interface IsoBuildingData {
  id: string;
  name: string;
  gridX: number;
  gridY: number;
  status: string;
  here?: boolean;
  /** vertical extrusion factor (units of cell side) */
  height?: number;
  /** footprint width in cells */
  gridWidth?: number;
  /** footprint depth in cells */
  gridHeight?: number;
}

export type RoadSet = Record<string, true>;

export function key(x: number, y: number) {
  return `${x},${y}`;
}

export function computeRoadMask(roads: RoadSet, x: number, y: number): number {
  let m = 0;
  if (roads[key(x, y - 1)]) m |= 1 << 0;
  if (roads[key(x + 1, y)]) m |= 1 << 1;
  if (roads[key(x, y + 1)]) m |= 1 << 2;
  if (roads[key(x - 1, y)]) m |= 1 << 3;
  if (m === 0) m = 0b1111;
  return m;
}

export function IsoCell({
  x,
  y,
  ts,
  mode = 'placing',
  invalid = false,
  onMouseDown,
  onMouseEnter,
}: {
  x: number;
  y: number;
  ts: number;
  mode?: 'placing' | 'erasing';
  invalid?: boolean;
  onMouseDown?: (e: MouseEvent) => void;
  onMouseEnter?: (e: MouseEvent) => void;
}) {
  return (
    <div
      className={`iso-cell iso-cell--${mode} ${invalid ? 'iso-cell--invalid' : ''}`}
      style={{ left: x * ts, top: y * ts, width: ts, height: ts }}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
    />
  );
}

export function IsoRoad({ x, y, ts, mask = 0b1111 }: { x: number; y: number; ts: number; mask?: number }) {
  const w = Math.max(2, Math.round(ts * 0.1));
  const half = ts / 2;
  const N = (mask >> 0) & 1;
  const E = (mask >> 1) & 1;
  const S = (mask >> 2) & 1;
  const W = (mask >> 3) & 1;
  const segs: JSX.Element[] = [];
  segs.push(
    <div
      key="c"
      className="iso-road"
      style={{ left: x * ts + half - w / 2, top: y * ts + half - w / 2, width: w, height: w }}
    />,
  );
  if (N)
    segs.push(
      <div
        key="n"
        className="iso-road"
        style={{ left: x * ts + half - w / 2, top: y * ts, width: w, height: half }}
      />,
    );
  if (S)
    segs.push(
      <div
        key="s"
        className="iso-road"
        style={{ left: x * ts + half - w / 2, top: y * ts + half, width: w, height: half }}
      />,
    );
  if (E)
    segs.push(
      <div
        key="e"
        className="iso-road"
        style={{ left: x * ts + half, top: y * ts + half - w / 2, width: half, height: w }}
      />,
    );
  if (W)
    segs.push(
      <div
        key="w"
        className="iso-road"
        style={{ left: x * ts, top: y * ts + half - w / 2, width: half, height: w }}
      />,
    );
  return <>{segs}</>;
}

export function IsoBuilding({
  b,
  ts,
  here,
  selected,
  closed,
  onClick,
}: {
  b: IsoBuildingData;
  ts: number;
  here?: boolean;
  selected?: boolean;
  closed?: boolean;
  onClick?: (e: MouseEvent) => void;
}) {
  const gw = Math.max(1, b.gridWidth ?? 1);
  const gh = Math.max(1, b.gridHeight ?? 1);
  const pxW = ts * gw - 4;
  const pxH = ts * gh - 4;
  const heightFactor = b.height ?? 1.4;
  const lift = ts * heightFactor;
  const faces: { transform: string; w: number; h: number; origin: string; side?: boolean }[] = [
    { transform: `translate3d(0px, 0px, 0px) rotateX(90deg)`, w: pxW, h: lift, origin: '0 0' },
    { transform: `translate3d(0px, ${pxH}px, 0px) rotateX(90deg)`, w: pxW, h: lift, origin: '0 0' },
    { transform: `translate3d(0px, 0px, 0px) rotateY(-90deg)`, w: lift, h: pxH, origin: '0 0', side: true },
    { transform: `translate3d(${pxW}px, 0px, 0px) rotateY(-90deg)`, w: lift, h: pxH, origin: '0 0', side: true },
  ];
  const wrap: CSSProperties = {
    position: 'absolute',
    left: b.gridX * ts + 2,
    top: b.gridY * ts + 2,
    width: pxW,
    height: pxH,
    transformStyle: 'preserve-3d',
  };
  return (
    <div
      className={`iso-bldg ${here ? 'iso-bldg--here' : ''} ${selected ? 'iso-bldg--selected' : ''} ${closed ? 'iso-bldg--closed' : ''}`}
      style={wrap}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
    >
      <div className="iso-bldg-base" style={{ left: 0, top: 0, width: pxW, height: pxH }} />
      {faces.map((f, i) => (
        <div
          key={i}
          className={`iso-bldg-extrude ${f.side ? 'iso-bldg-extrude--side' : ''}`}
          style={{ width: f.w, height: f.h, transform: f.transform, transformOrigin: f.origin }}
        />
      ))}
      <div
        className="iso-bldg-roof"
        style={{ left: 0, top: 0, width: pxW, height: pxH, transform: `translateZ(${lift}px)` }}
      />
      <div
        className="iso-bldg-label"
        style={{
          left: 0,
          top: 0,
          width: pxW,
          transform: `translateZ(${lift + 6}px) rotateZ(45deg) rotateX(-58deg)`,
          textAlign: 'center',
        }}
      >
        {b.name.split(' ').slice(0, 2).join(' ').slice(0, 12)}
      </div>
    </div>
  );
}

export function IsoStage({
  width,
  height,
  ts,
  children,
  className = '',
}: {
  width: number;
  height: number;
  ts: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`iso-stage ${className}`}
      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
    >
      <div className="iso-stage__bg" />
      <div className="iso-stage__horizon" />
      <div
        className="iso-cam"
        style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div className="iso-world" style={{ width: width * ts, height: height * ts }}>
          {children}
        </div>
      </div>
    </div>
  );
}
