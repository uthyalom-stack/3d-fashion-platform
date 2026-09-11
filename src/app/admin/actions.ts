'use server';

import { Platform3DAsset, AssetType } from '@/types/asset';
import { PersistedAssetRecord } from '@/lib/3d/persistence/types';
import * as adminService from '@/lib/admin/assetAdminService';

/**
 * Server Actions Boundary for Platform Admin UI.
 * Ensures admin CRUD operations execute strictly on the server and do not directly expose
 * persistence service implementation graph or repository internals to browser components.
 */

export async function listAssetsAction(): Promise<Platform3DAsset[]> {
  return adminService.listAssets();
}

export async function listAssetsByTypeAction(assetType: AssetType): Promise<Platform3DAsset[]> {
  return adminService.listAssetsByType(assetType);
}

export async function getAssetAction(assetId: string): Promise<Platform3DAsset | null> {
  return adminService.getAsset(assetId);
}

export async function getAssetRecordAction(assetId: string): Promise<PersistedAssetRecord | null> {
  return adminService.getAssetRecord(assetId);
}

export async function listAssetRecordsAction(): Promise<PersistedAssetRecord[]> {
  return adminService.listAssetRecords();
}

export async function hasAssetAction(assetId: string): Promise<boolean> {
  return adminService.hasAsset(assetId);
}

export async function createAssetAction(asset: Platform3DAsset, aliasIds: string[] = []): Promise<void> {
  return adminService.createAsset(asset, aliasIds);
}

export async function updateAssetAction(
  assetId: string,
  asset: Platform3DAsset,
  aliasIds: string[] = []
): Promise<void> {
  return adminService.updateAsset(assetId, asset, aliasIds);
}

export async function deleteAssetAction(assetId: string): Promise<boolean> {
  return adminService.deleteAsset(assetId);
}
