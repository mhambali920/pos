<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Brand\Models\Brand;
use App\Modules\Category\Models\Category;
use App\Modules\Inventory\Contracts\InventoryLedgerContract;
use App\Modules\Inventory\Data\StockMutationData;
use App\Modules\Inventory\Domain\Enums\StockMovementType;
use App\Modules\Inventory\Models\StockMovement;
use App\Modules\Organization\Models\Organization;
use App\Modules\Product\Domain\Enums\ProductType;
use App\Modules\Product\Models\Product;
use App\Modules\Product\Models\ProductBarcode;
use App\Modules\Product\Models\ProductVariant;
use App\Modules\Tax\Models\Tax;
use App\Modules\Unit\Models\Unit;
use App\Modules\Warehouse\Models\Warehouse;
use Illuminate\Database\Seeder;

class DemoCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(DatabaseSeeder::class);

        $org = Organization::query()->where('code', 'ORG-DEFAULT')->firstOrFail();
        $warehouse = Warehouse::query()->where('organization_id', $org->id)->where('code', 'WH-001')->firstOrFail();
        $pcs = Unit::query()->where('organization_id', $org->id)->where('code', 'PCS')->firstOrFail();
        $tax = Tax::query()->where('organization_id', $org->id)->where('code', 'PPN11')->first();
        $admin = User::query()->where('email', 'admin@pos.local')->first();

        $categories = [
            'BEV' => Category::query()->firstOrCreate(
                ['organization_id' => $org->id, 'code' => 'BEV'],
                ['name' => 'Beverages', 'slug' => 'beverages', 'is_active' => true],
            ),
            'SNK' => Category::query()->firstOrCreate(
                ['organization_id' => $org->id, 'code' => 'SNK'],
                ['name' => 'Snacks & Food', 'slug' => 'snacks-food', 'is_active' => true],
            ),
            'PCR' => Category::query()->firstOrCreate(
                ['organization_id' => $org->id, 'code' => 'PCR'],
                ['name' => 'Personal Care', 'slug' => 'personal-care', 'is_active' => true],
            ),
            'HSH' => Category::query()->firstOrCreate(
                ['organization_id' => $org->id, 'code' => 'HSH'],
                ['name' => 'Household & Tech', 'slug' => 'household-tech', 'is_active' => true],
            ),
        ];

        $brands = [
            'FRESH' => Brand::query()->firstOrCreate(
                ['organization_id' => $org->id, 'code' => 'FRESH'],
                ['name' => 'FreshCo', 'is_active' => true],
            ),
            'NUSA' => Brand::query()->firstOrCreate(
                ['organization_id' => $org->id, 'code' => 'NUSA'],
                ['name' => 'Nusantara', 'is_active' => true],
            ),
            'GLOW' => Brand::query()->firstOrCreate(
                ['organization_id' => $org->id, 'code' => 'GLOW'],
                ['name' => 'GlowLab', 'is_active' => true],
            ),
            'TECH' => Brand::query()->firstOrCreate(
                ['organization_id' => $org->id, 'code' => 'TECH'],
                ['name' => 'TechHome', 'is_active' => true],
            ),
        ];

        /** @var list<array{sku: string, barcode: string, name: string, cat: string, brand: string, buy: numeric-string, sell: numeric-string, stock: numeric-string}> $catalog */
        $catalog = [
            ['sku' => 'BEV-001', 'barcode' => '8991001000011', 'name' => 'Air Mineral 600ml', 'cat' => 'BEV', 'brand' => 'FRESH', 'buy' => '2200.00', 'sell' => '4000.00', 'stock' => '120.0000'],
            ['sku' => 'BEV-002', 'barcode' => '8991001000028', 'name' => 'Teh Melati Botol 350ml', 'cat' => 'BEV', 'brand' => 'NUSA', 'buy' => '3500.00', 'sell' => '6000.00', 'stock' => '80.0000'],
            ['sku' => 'BEV-003', 'barcode' => '8991001000035', 'name' => 'Kopi Susu Kaleng 240ml', 'cat' => 'BEV', 'brand' => 'NUSA', 'buy' => '6500.00', 'sell' => '10500.00', 'stock' => '60.0000'],
            ['sku' => 'BEV-004', 'barcode' => '8991001000042', 'name' => 'Susu UHT Full Cream 1L', 'cat' => 'BEV', 'brand' => 'FRESH', 'buy' => '15500.00', 'sell' => '21000.00', 'stock' => '45.0000'],
            ['sku' => 'BEV-005', 'barcode' => '8991001000059', 'name' => 'Jus Jeruk Segar 500ml', 'cat' => 'BEV', 'brand' => 'FRESH', 'buy' => '9000.00', 'sell' => '14500.00', 'stock' => '50.0000'],
            ['sku' => 'SNK-001', 'barcode' => '8991002000018', 'name' => 'Keripik Kentang Original 68g', 'cat' => 'SNK', 'brand' => 'NUSA', 'buy' => '7500.00', 'sell' => '12000.00', 'stock' => '75.0000'],
            ['sku' => 'SNK-002', 'barcode' => '8991002000025', 'name' => 'Biskuit Cokelat Krim 137g', 'cat' => 'SNK', 'brand' => 'NUSA', 'buy' => '6000.00', 'sell' => '9500.00', 'stock' => '90.0000'],
            ['sku' => 'SNK-003', 'barcode' => '8991002000032', 'name' => 'Roti Tawar Gandum 350g', 'cat' => 'SNK', 'brand' => 'FRESH', 'buy' => '12000.00', 'sell' => '17500.00', 'stock' => '35.0000'],
            ['sku' => 'SNK-004', 'barcode' => '8991002000049', 'name' => 'Mie Instan Goreng 85g', 'cat' => 'SNK', 'brand' => 'NUSA', 'buy' => '2600.00', 'sell' => '3500.00', 'stock' => '200.0000'],
            ['sku' => 'SNK-005', 'barcode' => '8991002000056', 'name' => 'Kacang Panggang Madu 150g', 'cat' => 'SNK', 'brand' => 'NUSA', 'buy' => '11000.00', 'sell' => '16500.00', 'stock' => '55.0000'],
            ['sku' => 'PCR-001', 'barcode' => '8991003000015', 'name' => 'Sabun Mandi Cair 450ml', 'cat' => 'PCR', 'brand' => 'GLOW', 'buy' => '21000.00', 'sell' => '32000.00', 'stock' => '40.0000'],
            ['sku' => 'PCR-002', 'barcode' => '8991003000022', 'name' => 'Shampo Anti Ketombe 340ml', 'cat' => 'PCR', 'brand' => 'GLOW', 'buy' => '26000.00', 'sell' => '39500.00', 'stock' => '38.0000'],
            ['sku' => 'PCR-003', 'barcode' => '8991003000039', 'name' => 'Pasta Gigi Herbal 190g', 'cat' => 'PCR', 'brand' => 'GLOW', 'buy' => '10500.00', 'sell' => '16000.00', 'stock' => '65.0000'],
            ['sku' => 'PCR-004', 'barcode' => '8991003000046', 'name' => 'Facial Wash Gentle 100ml', 'cat' => 'PCR', 'brand' => 'GLOW', 'buy' => '24000.00', 'sell' => '36000.00', 'stock' => '42.0000'],
            ['sku' => 'PCR-005', 'barcode' => '8991003000053', 'name' => 'Sunscreen SPF 50+ 50ml', 'cat' => 'PCR', 'brand' => 'GLOW', 'buy' => '48000.00', 'sell' => '75000.00', 'stock' => '30.0000'],
            ['sku' => 'HSH-001', 'barcode' => '8991004000012', 'name' => 'Tisu Wajah 250 Sheet', 'cat' => 'HSH', 'brand' => 'FRESH', 'buy' => '9500.00', 'sell' => '15000.00', 'stock' => '85.0000'],
            ['sku' => 'HSH-002', 'barcode' => '8991004000029', 'name' => 'Sabun Cuci Piring Jeruk 780ml', 'cat' => 'HSH', 'brand' => 'FRESH', 'buy' => '13000.00', 'sell' => '19500.00', 'stock' => '60.0000'],
            ['sku' => 'HSH-003', 'barcode' => '8991004000036', 'name' => 'Kabel USB-C Fast Charging 1m', 'cat' => 'HSH', 'brand' => 'TECH', 'buy' => '28000.00', 'sell' => '55000.00', 'stock' => '40.0000'],
            ['sku' => 'HSH-004', 'barcode' => '8991004000043', 'name' => 'Lampu LED 12W Putih', 'cat' => 'HSH', 'brand' => 'TECH', 'buy' => '19000.00', 'sell' => '34000.00', 'stock' => '50.0000'],
            ['sku' => 'HSH-005', 'barcode' => '8991004000050', 'name' => 'Baterai Alkaline AA Isi 4', 'cat' => 'HSH', 'brand' => 'TECH', 'buy' => '16000.00', 'sell' => '26500.00', 'stock' => '70.0000'],
        ];

        /** @var InventoryLedgerContract $ledger */
        $ledger = app(InventoryLedgerContract::class);

        foreach ($catalog as $index => $item) {
            $variant = ProductVariant::query()->where('sku', $item['sku'])->first();

            $imagePath = "/images/products/{$item['sku']}.svg";

            if (! $variant instanceof ProductVariant) {
                $product = Product::query()->create([
                    'organization_id' => $org->id,
                    'category_id' => $categories[$item['cat']]->id,
                    'brand_id' => $brands[$item['brand']]->id,
                    'base_unit_id' => $pcs->id,
                    'tax_id' => $tax?->id,
                    'product_type' => ProductType::Standard,
                    'name' => $item['name'],
                    'image_path' => $imagePath,
                    'track_inventory' => true,
                    'is_active' => true,
                ]);

                $variant = ProductVariant::query()->create([
                    'product_id' => $product->id,
                    'sku' => $item['sku'],
                    'name' => $item['name'],
                    'purchase_price' => $item['buy'],
                    'selling_price' => $item['sell'],
                    'min_selling_price' => $item['buy'],
                    'average_cost' => $item['buy'],
                    'min_stock' => '10.0000',
                    'reorder_point' => '15.0000',
                    'is_active' => true,
                ]);

                ProductBarcode::query()->firstOrCreate(
                    ['organization_id' => $org->id, 'barcode' => $item['barcode']],
                    ['product_variant_id' => $variant->id, 'is_primary' => true],
                );
            } else {
                Product::query()
                    ->where('id', $variant->product_id)
                    ->whereNull('image_path')
                    ->update(['image_path' => $imagePath]);
            }

            $hasMovements = StockMovement::query()
                ->where('warehouse_id', $warehouse->id)
                ->where('product_variant_id', $variant->id)
                ->exists();

            if (! $hasMovements) {
                $ledger->mutate(new StockMutationData(
                    organizationId: $org->id,
                    warehouseId: $warehouse->id,
                    productVariantId: $variant->id,
                    movementType: StockMovementType::AdjustmentIn,
                    qtyChange: $item['stock'],
                    referenceType: 'demo_seed',
                    referenceId: $index + 1,
                    unitCost: $item['buy'],
                    notes: 'Initial demo catalog stock',
                    actorId: $admin?->id,
                ));
            }
        }
    }
}
