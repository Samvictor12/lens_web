import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createInitialData() {
  try {
    console.log('🚀 Starting initial setup...\n');

    // First create the admin role and system user with raw SQL to avoid FK issues
    console.log('👥 Creating initial role...');
    await prisma.$executeRaw`
      INSERT INTO "Role" (id, name, "createdAt", "updatedAt")
      VALUES (1, 'Admin', NOW(), NOW())
      ON CONFLICT (name) DO NOTHING
    `;

    console.log('👤 Creating system user (ID: 1)...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.$executeRaw`
      INSERT INTO "User" (
        id, name, email, username, usercode, password, 
        role_id, active_status, delete_status, 
        "createdAt", "createdBy", "updatedAt", is_login
      )
      VALUES (
        1, 'System Administrator', 'admin@lensapp.com', 'admin', 'USR001', ${hashedPassword},
        1, true, true,
        NOW(), 1, NOW(), false
      )
      ON CONFLICT (username) DO NOTHING
    `;
    console.log('✅ System user created\n');
    
    // 1. Create Departments
    console.log('📁 Creating departments...');
    const departments = await prisma.$transaction([
      prisma.departmentDetails.upsert({
        where: { id: 1 },
        update: {},
        create: {
          id: 1,
          department: 'Administration',
          active_status: true,
          delete_status: false,
          createdBy: 1
        }
      }),
      prisma.departmentDetails.upsert({
        where: { id: 2 },
        update: {},
        create: {
          id: 2,
          department: 'Sales',
          active_status: true,
          delete_status: false,
          createdBy: 1
        }
      }),
      prisma.departmentDetails.upsert({
        where: { id: 3 },
        update: {},
        create: {
          id: 3,
          department: 'Accounts',
          active_status: true,
          delete_status: false,
          createdBy: 1
        }
      }),
      prisma.departmentDetails.upsert({
        where: { id: 4 },
        update: {},
        create: {
          id: 4,
          department: 'Inventory',
          active_status: true,
          delete_status: false,
          createdBy: 1
        }
      }),
      prisma.departmentDetails.upsert({
        where: { id: 5 },
        update: {},
        create: {
          id: 5,
          department: 'Production',
          active_status: true,
          delete_status: false,
          createdBy: 1
        }
      }),
      prisma.departmentDetails.upsert({
        where: { id: 6 },
        update: {},
        create: {
          id: 6,
          department: 'Dispatch',
          active_status: true,
          delete_status: false,
          createdBy: 1
        }
      })
    ]);
    console.log(`✅ Created ${departments.length} departments\n`);

    // 2. Create Additional Roles (Admin already exists)
    console.log('👥 Creating additional roles...');
    await prisma.$executeRaw`
      INSERT INTO "Role" (name, "createdAt", "updatedAt")
      VALUES 
        ('Sales', NOW(), NOW()),
        ('Accounts', NOW(), NOW()),
        ('Inventory', NOW(), NOW()),
        ('Manager', NOW(), NOW()),
        ('Viewer', NOW(), NOW())
      ON CONFLICT (name) DO NOTHING
    `;
    
    const roles = await prisma.role.findMany();
    console.log(`✅ Created ${roles.length} roles\n`);

    // Get Admin role ID
    const adminRole = await prisma.role.findUnique({
      where: { name: 'Admin' }
    });

    // 3. Create Permissions for Admin
    console.log('🔐 Creating permissions for Admin role...');
    const subjects = [
      'User', 'Role', 'Department', 'Customer', 'Vendor', 
      'SaleOrder', 'PurchaseOrder', 'Inventory', 'BusinessCategory', 'LensMaster'
    ];
    const actions = ['manage', 'create', 'read', 'update', 'delete'];

    // Delete existing permissions for admin role
    await prisma.permission.deleteMany({
      where: { role_id: adminRole.id }
    });

    let permissionCount = 0;
    for (const subject of subjects) {
      for (const action of actions) {
        await prisma.permission.create({
          data: {
            action: action,
            subject: subject,
            role_id: adminRole.id
          }
        });
        permissionCount++;
      }
    }
    console.log(`✅ Created ${permissionCount} permissions for Admin role\n`);

    // 4. Update Admin User with department
    console.log('👤 Updating admin user with department...');
    
    const adminUser = await prisma.user.update({
      where: { username: 'admin' },
      data: {
        department_id: 1 // Administration
      },
      include: {
        role: true
      }
    });
    console.log(`✅ Updated admin user: ${adminUser.username}\n`);

    // Print summary
    console.log('═══════════════════════════════════════');
    console.log('✨ Initial setup completed successfully!');
    console.log('═══════════════════════════════════════');
    console.log('\n📋 Summary:');
    console.log(`   • Departments: ${departments.length}`);
    console.log(`   • Roles: ${roles.length}`);
    console.log(`   • Permissions: ${permissionCount}`);
    console.log(`   • Admin User: ${adminUser.username}`);
    console.log('\n🔑 Admin Credentials:');
    console.log(`   Username: ${adminUser.username}`);
    console.log(`   Password: admin123`);
    console.log(`   Email: ${adminUser.email}`);
    console.log('\n⚠️  IMPORTANT: Change the admin password after first login!\n');

  } catch (error) {
    console.error('❌ Error during initial setup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
createInitialData()
  .catch((error) => {
    console.error('Failed to create initial data:', error);
    process.exit(1);
  });
