import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export function getDb() {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }

  return global.prismaGlobal;
}
