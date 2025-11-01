import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

async function main() {
  try {
    // Test the connection
    await prisma.$connect()
    console.log('Successfully connected to database')
    
    // Get the current database URL
    const url = process.env.DATABASE_URL
    console.log('Database URL:', url)
  } catch (error) {
    console.error('Error connecting to database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()