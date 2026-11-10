export const FENCE_ITEM_IDS = [
  'none',
  'white_picket',
  'brick_wall',
  'hedge',
  'stone_wall',
] as const;
export type FenceItemId = (typeof FENCE_ITEM_IDS)[number];

export const TREE_ITEM_IDS = [
  'none',
  'pine',
  'sakura',
  'fruit_tree',
  'flower_bed',
] as const;
export type TreeItemId = (typeof TREE_ITEM_IDS)[number];

export const PET_ITEM_IDS = [
  'none',
  'puppy',
  'kitten',
  'bunny',
  'duckling',
] as const;
export type PetItemId = (typeof PET_ITEM_IDS)[number];

export const SIGN_ITEM_IDS = [
  'none',
  'wooden_board',
  'standing_banner',
  'neon_post',
  'mailbox_sign',
] as const;
export type SignItemId = (typeof SIGN_ITEM_IDS)[number];

export type LotItemCategory = 'fence' | 'tree' | 'pet' | 'sign';

export interface LotCustomization {
  fence: FenceItemId;
  tree: TreeItemId;
  pet: PetItemId;
  sign: SignItemId;
}

export type LotItemIdFor<K extends LotItemCategory> = LotCustomization[K];

export interface LotItemSpec<Id extends string = string> {
  id: Id;
  category: LotItemCategory;
  labelKey: string;
  assetId: string;
}

export const LOT_ITEM_CATALOG: {
  fence: readonly LotItemSpec<FenceItemId>[];
  tree: readonly LotItemSpec<TreeItemId>[];
  pet: readonly LotItemSpec<PetItemId>[];
  sign: readonly LotItemSpec<SignItemId>[];
} = {
  fence: FENCE_ITEM_IDS.map((id) => ({
    id,
    category: 'fence',
    labelKey: `sidebar.lotItem.fence.${id}`,
    assetId: `prop_fence_${id}`,
  })),
  tree: TREE_ITEM_IDS.map((id) => ({
    id,
    category: 'tree',
    labelKey: `sidebar.lotItem.tree.${id}`,
    assetId: `prop_tree_${id}`,
  })),
  pet: PET_ITEM_IDS.map((id) => ({
    id,
    category: 'pet',
    labelKey: `sidebar.lotItem.pet.${id}`,
    assetId: `prop_pet_${id}`,
  })),
  sign: SIGN_ITEM_IDS.map((id) => ({
    id,
    category: 'sign',
    labelKey: `sidebar.lotItem.sign.${id}`,
    assetId: `prop_sign_${id}`,
  })),
};

const FENCE_SET: ReadonlySet<string> = new Set(FENCE_ITEM_IDS);
const TREE_SET: ReadonlySet<string> = new Set(TREE_ITEM_IDS);
const PET_SET: ReadonlySet<string> = new Set(PET_ITEM_IDS);
const SIGN_SET: ReadonlySet<string> = new Set(SIGN_ITEM_IDS);

export function isValidLotItem<K extends LotItemCategory>(
  category: K,
  value: unknown
): value is LotItemIdFor<K> {
  if (typeof value !== 'string') return false;
  switch (category) {
    case 'fence':
      return FENCE_SET.has(value);
    case 'tree':
      return TREE_SET.has(value);
    case 'pet':
      return PET_SET.has(value);
    case 'sign':
      return SIGN_SET.has(value);
  }
}

/**
 * Deterministic showcase presets used as defaults so every house starts with
 * a curated combination of allowed yard items.
 */
export function defaultLotCustomizationForIndex(index: number): LotCustomization {
  const safe = Math.abs(Math.floor(index));
  const fences = FENCE_ITEM_IDS.slice(1); // Skip 'none' so plots start lively
  const trees = TREE_ITEM_IDS.slice(1);
  const signs = SIGN_ITEM_IDS.slice(1);
  const pets = PET_ITEM_IDS;

  return {
    fence: fences[safe % fences.length] ?? 'white_picket',
    tree: trees[(safe * 3 + 1) % trees.length] ?? 'pine',
    pet: pets[(safe + 1) % pets.length] ?? 'puppy',
    sign: signs[(safe * 2) % signs.length] ?? 'wooden_board',
  };
}

/**
 * Normalizes untrusted persisted or imported yard customization into the allowed catalog set.
 */
export function sanitizeLotCustomization(
  raw: unknown,
  fallbackIndex = 0
): LotCustomization {
  const fallback = defaultLotCustomizationForIndex(fallbackIndex);
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }
  const obj = raw as Record<string, unknown>;
  return {
    fence: isValidLotItem('fence', obj.fence) ? obj.fence : fallback.fence,
    tree: isValidLotItem('tree', obj.tree) ? obj.tree : fallback.tree,
    pet: isValidLotItem('pet', obj.pet) ? obj.pet : fallback.pet,
    sign: isValidLotItem('sign', obj.sign) ? obj.sign : fallback.sign,
  };
}
