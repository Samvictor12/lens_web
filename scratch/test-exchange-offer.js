import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
  console.log('🧪 Testing EXCHANGE_PRODUCT & EXCHANGE_COATING_PRICE Schema Fields...');

  try {
    // 1. Get first two lens products to use as source and exchange targets
    const products = await prisma.lensProductMaster.findMany({
      take: 2,
      where: { deleteStatus: false }
    });

    if (products.length < 2) {
      console.log('⚠️ Not enough lens products in DB to run exchange test. Creating test products...');
      return;
    }

    const sourceLens = products[0];
    const targetLens = products[1];

    // 2. Get first coating to use as exchange coating
    const coatings = await prisma.lensCoatingMaster.findMany({
      take: 1,
      where: { deleteStatus: false }
    });

    if (coatings.length < 1) {
      console.log('⚠️ No coatings found in DB to run exchange test.');
      return;
    }

    const exchangeCoating = coatings[0];

    console.log(`Using source lens ID: ${sourceLens.id} (${sourceLens.lens_name})`);
    console.log(`Using target lens ID: ${targetLens.id} (${targetLens.lens_name})`);
    console.log(`Using exchange coating ID: ${exchangeCoating.id} (${exchangeCoating.name})`);

    // 3. Test EXCHANGE_COATING_PRICE offer creation
    console.log('\n--- Test 1: Creating EXCHANGE_COATING_PRICE offer ---');
    const coatingOffer = await prisma.lensOffers.create({
      data: {
        offerName: 'Test EXCHANGE_COATING_PRICE Offer',
        description: 'Test description',
        offerType: 'EXCHANGE_COATING_PRICE',
        lens_id: sourceLens.id,
        exchange_lens_id: targetLens.id,
        exchange_coating_id: exchangeCoating.id,
        withDiscount: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
        createdBy: 1,
      },
      include: {
        lensProduct: true,
        exchangeLensProduct: true,
        exchangeCoating: true,
      }
    });

    console.log('✅ Offer created successfully:');
    console.log(`   ID: ${coatingOffer.id}`);
    console.log(`   Name: ${coatingOffer.offerName}`);
    console.log(`   Source Lens ID: ${coatingOffer.lens_id} (${coatingOffer.lensProduct?.lens_name})`);
    console.log(`   Exchange Lens ID: ${coatingOffer.exchange_lens_id} (${coatingOffer.exchangeLensProduct?.lens_name})`);
    console.log(`   Exchange Coating ID: ${coatingOffer.exchange_coating_id} (${coatingOffer.exchangeCoating?.name})`);

    // Verify relations resolved
    if (coatingOffer.exchangeLensProduct?.id === targetLens.id && coatingOffer.exchangeCoating?.id === exchangeCoating.id) {
      console.log('✅ EXCHANGE_COATING_PRICE relation test PASSED!');
    } else {
      console.error('❌ EXCHANGE_COATING_PRICE relation test FAILED.');
    }

    // 4. Test EXCHANGE_PRODUCT offer creation
    console.log('\n--- Test 2: Creating EXCHANGE_PRODUCT offer ---');
    const productOffer = await prisma.lensOffers.create({
      data: {
        offerName: 'Test EXCHANGE_PRODUCT Offer',
        description: 'Test description',
        offerType: 'EXCHANGE_PRODUCT',
        lens_id: sourceLens.id,
        exchange_lens_id: targetLens.id, // target exchange product
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
        createdBy: 1,
      },
      include: {
        lensProduct: true,
        exchangeLensProduct: true,
      }
    });

    console.log('✅ Offer created successfully:');
    console.log(`   ID: ${productOffer.id}`);
    console.log(`   Name: ${productOffer.offerName}`);
    console.log(`   Source Lens ID: ${productOffer.lens_id} (${productOffer.lensProduct?.lens_name})`);
    console.log(`   Exchange Lens ID: ${productOffer.exchange_lens_id} (${productOffer.exchangeLensProduct?.lens_name})`);

    // Verify relations resolved
    if (productOffer.exchangeLensProduct?.id === targetLens.id) {
      console.log('✅ EXCHANGE_PRODUCT relation test PASSED!');
    } else {
      console.error('❌ EXCHANGE_PRODUCT relation test FAILED.');
    }

    // 5. Clean up
    console.log('\nCleaning up test offers...');
    await prisma.lensOffers.deleteMany({
      where: {
        id: {
          in: [coatingOffer.id, productOffer.id]
        }
      }
    });
    console.log('✅ Cleaned up successfully.');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
