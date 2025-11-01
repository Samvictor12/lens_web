import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.$transaction([
    prisma.pOItem.deleteMany(),
    prisma.purchaseOrder.deleteMany(),
    prisma.saleOrderItem.deleteMany(),
    prisma.saleOrder.deleteMany(),
    prisma.lensVariant.deleteMany(),
    prisma.lensType.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.vendor.deleteMany(),
    prisma.permission.deleteMany(),
    prisma.user.deleteMany(),
    prisma.role.deleteMany(),
  ]);

  // Create Roles
  const roles = await Promise.all([
    prisma.role.create({
      data: {
        name: 'Admin',
        permissions: {
          create: [
            { action: 'create', subject: 'all' },
            { action: 'read', subject: 'all' },
            { action: 'update', subject: 'all' },
            { action: 'delete', subject: 'all' },
          ],
        },
      },
    }),
    prisma.role.create({
      data: {
        name: 'Sales',
        permissions: {
          create: [
            { action: 'create', subject: 'SaleOrder' },
            { action: 'read', subject: 'SaleOrder' },
            { action: 'update', subject: 'SaleOrder' },
            { action: 'read', subject: 'Customer' },
            { action: 'create', subject: 'Customer' },
            { action: 'read', subject: 'LensType' },
            { action: 'read', subject: 'LensVariant' },
          ],
        },
      },
    }),
    prisma.role.create({
      data: {
        name: 'Inventory',
        permissions: {
          create: [
            { action: 'create', subject: 'PurchaseOrder' },
            { action: 'read', subject: 'PurchaseOrder' },
            { action: 'update', subject: 'PurchaseOrder' },
            { action: 'read', subject: 'Vendor' },
            { action: 'create', subject: 'Vendor' },
            { action: 'update', subject: 'LensVariant' },
          ],
        },
      },
    }),
    prisma.role.create({
      data: {
        name: 'Accounts',
        permissions: {
          create: [
            { action: 'read', subject: 'Invoice' },
            { action: 'create', subject: 'Payment' },
            { action: 'read', subject: 'Payment' },
            { action: 'read', subject: 'SaleOrder' },
            { action: 'read', subject: 'PurchaseOrder' },
          ],
        },
      },
    }),
  ]);

  // Create demo users
  await Promise.all([
    prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@lensbilling.com',
        password: 'demo123', // In production, use hashed passwords
        roleId: roles[0].id,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Sales User',
        email: 'sales@lensbilling.com',
        password: 'demo123',
        roleId: roles[1].id,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Inventory User',
        email: 'inventory@lensbilling.com',
        password: 'demo123',
        roleId: roles[2].id,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Accounts User',
        email: 'accounts@lensbilling.com',
        password: 'demo123',
        roleId: roles[3].id,
      },
    }),
  ]);

  // Create Lens Types and Variants
  const lensTypes = await Promise.all([
    prisma.lensType.create({
      data: {
        name: 'Single Vision',
        description: 'Standard single vision lenses',
        variants: {
          create: [
            {
              name: 'SV Basic',
              description: 'Basic single vision lens',
              price: 1500,
              isRx: false,
              stock: 50,
            },
            {
              name: 'SV Premium',
              description: 'Premium single vision lens with blue light filter',
              price: 3000,
              isRx: true,
              stock: 20,
            },
          ],
        },
      },
    }),
    prisma.lensType.create({
      data: {
        name: 'Progressive',
        description: 'Multi-focal progressive lenses',
        variants: {
          create: [
            {
              name: 'Progressive Standard',
              description: 'Standard progressive lens',
              price: 5000,
              isRx: true,
              stock: 15,
            },
            {
              name: 'Progressive Premium',
              description: 'Premium progressive lens with anti-glare',
              price: 8000,
              isRx: true,
              stock: 10,
            },
          ],
        },
      },
    }),
  ]);

  // Create Vendors
  const vendors = await Promise.all([
    prisma.vendor.create({
      data: {
        name: 'OptiLens Suppliers',
        contactPerson: 'John Smith',
        phone: '+91-9876543210',
        email: 'john@optilens.com',
        address: '123 Lens Street, Mumbai',
      },
    }),
    prisma.vendor.create({
      data: {
        name: 'Vision Care Products',
        contactPerson: 'Sarah Johnson',
        phone: '+91-9876543211',
        email: 'sarah@visioncare.com',
        address: '456 Eye Road, Delhi',
      },
    }),
  ]);

  // Create Customers
  await Promise.all([
    prisma.customer.create({
      data: {
        name: 'Rahul Kumar',
        phone: '+91-9876543212',
        email: 'rahul@gmail.com',
        address: '789 Customer Lane, Chennai',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Priya Singh',
        phone: '+91-9876543213',
        email: 'priya@gmail.com',
        address: '321 Client Road, Bangalore',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Amit Patel',
        phone: '+91-9876543214',
        email: 'amit@gmail.com',
        address: '654 Buyer Street, Hyderabad',
      },
    }),
  ]);

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });