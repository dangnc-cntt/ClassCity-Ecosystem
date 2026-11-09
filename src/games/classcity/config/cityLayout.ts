export interface Lot {
  id: number;
  position: [number, number, number];
  rotationY: number;
  roadWaypointId: string;
  parkingPoint: [number, number];
  parkingHeading: number;
  cameraFocus: {
    position: [number, number, number];
    lookAt: [number, number, number];
  };
  sidewalkPatrol: {
    a: [number, number];
    b: [number, number];
  };
}

export interface WaypointGraph {
  nodes: Record<string, [number, number]>;
  ringOrder: string[];
}

export interface CityLayout {
  lots: Lot[];
  graph: WaypointGraph;
}

export function generateCityLayout(lotCount = 36): CityLayout {
  void lotCount;
  return {
    lots: [],
    graph: { nodes: {}, ringOrder: [] },
  };
}
