import { Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import { dbRead, dbWrite } from '~/server/db/client';
import { GetByIdInput } from '~/server/schema/base.schema';
import { EquipCosmeticInput, GetPaginatedCosmeticsInput } from '~/server/schema/cosmetic.schema';
import { simpleCosmeticSelect } from '~/server/selectors/cosmetic.selector';
import { DEFAULT_PAGE_SIZE, getPagination, getPagingData } from '~/server/utils/pagination-helpers';

export async function getCosmeticDetail({ id }: GetByIdInput) {
  const cosmetic = await dbRead.cosmetic.findUnique({
    where: { id },
  });

  return cosmetic;
}

export async function isCosmeticAvailable(id: number, userId?: number) {
  const cosmetic = await dbRead.cosmetic.findUnique({
    where: { id },
    select: { availableStart: true, availableEnd: true, availableQuery: true },
  });
  if (!cosmetic) throw new Error("That cosmetic doesn't exist");

  if (!dayjs().isBetween(cosmetic.availableStart, cosmetic.availableEnd)) return false;
  else if (cosmetic.availableQuery) {
    if (!userId) return false;

    // If the cosmetic has a query, check if the user is eligible
    const result = await dbRead.$queryRawUnsafe<{ available: boolean }[]>(
      cosmetic.availableQuery.replace(/\$\{userId\}/g, `${userId}`)
    );
    if (!result[0].available) return false;
  }

  return true;
}

export const getPaginatedCosmetics = async (input: GetPaginatedCosmeticsInput) => {
  const { limit = DEFAULT_PAGE_SIZE, page } = input || {};
  const { take, skip } = getPagination(limit, page);

  const where: Prisma.CosmeticFindManyArgs['where'] = {};
  if (input.name) where.name = { contains: input.name };
  if (input.types && input.types.length) where.type = { in: input.types };
  const items = await dbRead.cosmetic.findMany({
    where,
    take,
    skip,
    select: {
      ...simpleCosmeticSelect,
      _count: {
        select: {
          cosmeticShopItems: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const count = await dbRead.cosmetic.count({ where });

  return getPagingData({ items, count: (count as number) ?? 0 }, limit, page);
};

export async function equipCosmeticToEntity({
  cosmeticId,
  claimKey,
  equippedToType,
  equippedToId,
  userId,
}: EquipCosmeticInput & { userId: number }) {
  const userCosmetic = await dbWrite.userCosmetic.findFirst({
    where: { userId, cosmeticId, claimKey },
    select: {
      obtainedAt: true,
      equippedToId: true,
      forId: true,
      forType: true,
      cosmetic: { select: { type: true } },
    },
  });

  if (!userCosmetic) throw new Error("You don't have that cosmetic");
  if (
    userCosmetic.forId &&
    userCosmetic.forType &&
    userCosmetic.forId !== equippedToId &&
    userCosmetic.forType !== equippedToType
  ) {
    throw new Error('You cannot equip this cosmetic to this entity');
  }

  // Unquip whaetver version of this cosmetic is equipped on that card
  await dbWrite.userCosmetic.updateMany({
    where: { userId, cosmeticId, equippedToId, equippedToType },
    data: { equippedToId: null, equippedToType: null, equippedAt: null },
  });

  const updated = await dbWrite.userCosmetic.updateMany({
    where: { userId, cosmeticId, claimKey },
    data: { equippedToId, equippedToType, equippedAt: new Date() },
  });

  return updated;
}

export async function unequipCosmetic({
  cosmeticId,
  equippedToId,
  userId,
  claimKey,
}: EquipCosmeticInput & { userId: number }) {
  return dbWrite.userCosmetic.updateMany({
    where: { cosmeticId, equippedToId, userId, claimKey },
    data: { equippedToId: null, equippedToType: null, equippedAt: null },
  });
}
