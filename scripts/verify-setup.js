import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifySetup() {
  try {
    // Check users
    const users = await prisma.user.findMany()
    console.log('\n👥 Users:', users.length)
    console.log(users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.roleId })))

    // Check roles and permissions
    const roles = await prisma.role.findMany({
      include: {
        permissions: true
      }
    })
    console.log('\n👑 Roles:', roles.length)
    console.log(roles.map(r => ({
      id: r.id,
      name: r.name,
      permissionCount: r.permissions.length
    })))

    // Check lens types and variants
    const lensTypes = await prisma.lensType.findMany({
      include: {
        variants: true
      }
    })
    console.log('\n🔎 Lens Types:', lensTypes.length)
    console.log(lensTypes.map(lt => ({
      id: lt.id,
      name: lt.name,
      variantCount: lt.variants.length
    })))

    // Check customers
    const customers = await prisma.customer.findMany()
    console.log('\n👤 Customers:', customers.length)
    console.log(customers.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email
    })))

    // Check vendors
    const vendors = await prisma.vendor.findMany()
    console.log('\n🏭 Vendors:', vendors.length)
    console.log(vendors.map(v => ({
      id: v.id,
      name: v.name,
      email: v.email
    })))

  } catch (error) {
    console.error('Error verifying setup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifySetup()