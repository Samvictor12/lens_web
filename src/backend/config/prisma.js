/**
 * Prisma Client Singleton
 * Creates a single shared instance of PrismaClient to be used across all services
 * This improves performance by reusing the same connection pool
 */

import { PrismaClient } from '@prisma/client';

// Singleton instance
let prisma;

/**
 * Get or create Prisma Client instance
 * @returns {PrismaClient} Shared Prisma Client instance
 */
export function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ['error']
    });

    // Log connection status (non-blocking)
    prisma.$connect()
      .then(() => {
        console.log('✅ Prisma Client connected successfully');
      })
      .catch((error) => {
        console.error('❌ Prisma Client connection error:', error);
      });

    // Cleanup on app termination
    process.on('beforeExit', async () => {
      await prisma.$disconnect();
      console.log('Prisma Client disconnected');
    });
  }

  return prisma;
}

// Export the singleton instance
export default getPrismaClient();
