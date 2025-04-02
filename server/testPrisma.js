// server/testPrisma.js
const prisma = require('./src/config/prismaClient');

async function testQuery() {
  try {
    const transcriptions = await prisma.audioTranscription.findMany();
    console.log("Transcriptions:", transcriptions);
  } catch (error) {
    console.error("Error querying database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testQuery();
