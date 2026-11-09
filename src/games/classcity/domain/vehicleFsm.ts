export type VehicleState =
  | 'idle'
  | 'manual'
  | 'accelerating'
  | 'cruising'
  | 'decelerating'
  | 'parked'
  | 'cameraZoom'
  | 'called';

export const INITIAL_VEHICLE_STATE: VehicleState = 'idle';
