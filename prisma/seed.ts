// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = "chris.ware.j@gmail.com"; // ← CHANGE THIS
  const firstName = "Chris"; // ← CHANGE THIS
  const lastName = "Ware"; // ← CHANGE THIS
  const phone = "917-769-1192"; // ← CHANGE THIS (digits only)
  const password = "Password123"; // ← CHANGE THIS

  const hashed = await bcryptjs.hash(password, 10);

  const user = await db.user.upsert({
    where: { email },
    update: {
      isSuperAdmin: true,
      firstName,
      lastName,
      phone,
    },
    create: {
      email,
      firstName,
      lastName,
      phone,
      password: hashed,
      isSuperAdmin: true,
      emailVerified: new Date(),
    },
  });

  console.log(
    `✓ Super admin ready: ${user.firstName} ${user.lastName} <${user.email}>`,
  );
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
