import {
  CatalogAdapter,
  CatalogProductQuery,
  PlatformCatalogProduct,
} from './types';
import { validateCatalogProduct } from './catalogValidator';

/**
 * Static fixture dataset referencing real platform 3D asset IDs.
 * Strictly garment assets only for 3D representations.
 */
const DEFAULT_LOCAL_PRODUCTS: PlatformCatalogProduct[] = [
  {
    externalProductId: 'prod_basic_tshirt_001',
    title: 'Essential Crewneck T-Shirt',
    brand: 'Studio Apparel',
    price: 35.0,
    currency: 'USD',
    availability: 'available',
    representation: {
      assetId: 'garment.top.basic-tshirt',
      garmentSlot: 'top',
      supportedAvatarIds: ['male', 'female'],
    },
  },
  {
    externalProductId: 'prod_non_3d_accessory_002',
    title: 'Digital Tote Bag (2D Print)',
    brand: 'Studio Merchandise',
    price: 15.00,
    currency: 'USD',
    availability: 'available',
    representation: null,
  },
];

/**
 * Local Reference Adapter for development and testing.
 * Implements vendor-neutral CatalogAdapter contract using deterministic in-memory catalog records.
 */
export class LocalCatalogAdapter implements CatalogAdapter {
  private products: Map<string, PlatformCatalogProduct> = new Map();

  constructor(initialProducts?: PlatformCatalogProduct[]) {
    const listToSeed = initialProducts || DEFAULT_LOCAL_PRODUCTS;
    listToSeed.forEach((product) => {
      const val = validateCatalogProduct(product, { checkRegistryAssetExistence: false });
      if (!val.valid) {
        throw new Error(`Invalid local catalog product fixture "${product.externalProductId}": ${val.errors.join('; ')}`);
      }
      this.products.set(product.externalProductId, { ...product });
    });
  }

  /**
   * Retrieves a single product by external product ID.
   */
  async getProduct(productId: string): Promise<PlatformCatalogProduct | null> {
    if (!productId || typeof productId !== 'string') return null;
    const product = this.products.get(productId.trim());
    return product ? { ...product } : null;
  }

  /**
   * Retrieves a list of products matching query criteria.
   */
  async getProducts(query?: CatalogProductQuery): Promise<PlatformCatalogProduct[]> {
    let results = Array.from(this.products.values());

    if (query?.availability) {
      results = results.filter((p) => p.availability === query.availability);
    }

    if (query?.has3D !== undefined) {
      results = results.filter((p) => (query.has3D ? p.representation !== null && p.representation !== undefined : p.representation === null || p.representation === undefined));
    }

    const offset = query?.offset && query.offset > 0 ? query.offset : 0;
    const limit = query?.limit && query.limit > 0 ? query.limit : results.length;

    return results.slice(offset, offset + limit).map((p) => ({ ...p }));
  }
}
