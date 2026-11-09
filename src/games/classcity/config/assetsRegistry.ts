export const PASTEL_SHOP_COLORS = [
  '#FDE68A',
  '#BFDBFE',
  '#BBF7D0',
  '#FBCFE8',
  '#DDD6FE',
  '#FED7AA',
  '#99F6E4',
  '#FECACA',
  '#E9D5FF',
  '#A7F3D0',
  '#BAE6FD',
  '#FEF08A',
] as const;

export function urlFor(assetId: string): string {
  if (assetId.startsWith('avatar_') || assetId.startsWith('prop_')) {
    return `/shared-assets/models/${assetId}.glb`;
  }
  return `/games/classcity/models/${assetId}.glb`;
}
