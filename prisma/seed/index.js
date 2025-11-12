import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

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
    prisma.refreshToken.deleteMany(),
    prisma.user.deleteMany(),
    prisma.role.deleteMany(),
  ]);

  // Create Departments first
  const departments = await Promise.all([
    prisma.departmentDetails.create({
      data: {
        department: 'Administration',
      },
    }),
    prisma.departmentDetails.create({
      data: {
        department: 'Sales',
      },
    }),
    prisma.departmentDetails.create({
      data: {
        department: 'Inventory',
      },
    }),
    prisma.departmentDetails.create({
      data: {
        department: 'Accounts',
      },
    }),
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

  // Hash passwords
  const hashedPassword = await bcrypt.hash('demo123', 10);

  // Create demo users
  await Promise.all([
    prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@lensbilling.com',
        usercode: 'ADM001',
        password: hashedPassword,
        roleId: roles[0].id,
        createdBy: 1,
        phonenumber: '+1234567890',
        department_id: departments[0].id,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Sales User',
        email: 'sales@lensbilling.com',
        usercode: 'SAL001',
        password: hashedPassword,
        roleId: roles[1].id,
        createdBy: 1,
        phonenumber: '+1234567891',
        department_id: departments[1].id,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Inventory User',
        email: 'inventory@lensbilling.com',
        usercode: 'INV001',
        password: hashedPassword,
        roleId: roles[2].id,
        createdBy: 1,
        phonenumber: '+1234567892',
        department_id: departments[2].id,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Accounts User',
        email: 'accounts@lensbilling.com',
        usercode: 'ACC001',
        password: hashedPassword,
        roleId: roles[3].id,
        createdBy: 1,
        phonenumber: '+1234567893',
        department_id: departments[3].id,
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

  // Get admin user for relationships
  const adminUser = await prisma.user.findFirst({
    where: { email: 'admin@lensbilling.com' }
  });

  // Create Vendors
  const vendors = await Promise.all([
    prisma.vendor.create({
      data: {
        name: 'OptiLens Suppliers',
        code: 'VEND-001',
        shopname: 'OptiLens Store',
        phone: '+91-9876543210',
        email: 'john@optilens.com',
        address: '123 Lens Street, Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        category: 'Lens Supplier',
        gstin: '27AAAAA0000A1Z5',
        active_status: true,
        delete_status: false,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    }),
    prisma.vendor.create({
      data: {
        name: 'Vision Care Products',
        code: 'VEND-002',
        shopname: 'Vision Care Hub',
        phone: '+91-9876543211',
        email: 'sarah@visioncare.com',
        address: '456 Eye Road, Delhi',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        category: 'Eye Care Products',
        gstin: '07BBBBB0000B2Z6',
        active_status: true,
        delete_status: false,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    }),
  ]);

  // Create Customers  
  await Promise.all([
    prisma.customer.create({
      data: {
        name: 'Rahul Kumar',
        code: 'CUST-001',
        shopname: 'Rahul Opticals',
        phone: '+91-9876543212',
        email: 'rahul@gmail.com',
        address: '789 Customer Lane, Chennai',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
        gstin: '33CCCCC0000C3Z7',
        credit_limit: 50000,
        outstanding_credit: 15000,
        active_status: true,
        delete_status: false,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Priya Singh',
        code: 'CUST-002',
        shopname: 'Priya Eye Care',
        phone: '+91-9876543213',
        email: 'priya@gmail.com',
        address: '321 Client Road, Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
        gstin: '29DDDDD0000D4Z8',
        credit_limit: 30000,
        outstanding_credit: 8000,
        active_status: true,
        delete_status: false,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Amit Patel',
        code: 'CUST-003',
        shopname: 'Amit Vision Center',
        phone: '+91-9876543214',
        email: 'amit@gmail.com',
        address: '654 Buyer Street, Hyderabad',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500001',
        gstin: '36EEEEE0000E5Z9',
        credit_limit: 75000,
        outstanding_credit: 22000,
        active_status: true,
        delete_status: false,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
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