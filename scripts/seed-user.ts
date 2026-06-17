// scripts/seed-users.ts
import { config } from "dotenv";
import { resolve } from "path";
import mongoose from "mongoose";
import User, { UserRole } from "../models/User";

// Load .env.local explicitly
config({ path: resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI as string;
const DB_NAME = process.env.DB_NAME || "bcc-queue";

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined in .env.local");
  process.exit(1);
}

async function seedUsers() {
  try {
    console.log(`📦 Database: ${DB_NAME}`);

    // Safety check: Only allow seeding on bcc-queue database
    if (!DB_NAME.startsWith("bcc-queue")) {
      console.error(
        `🚨 CANNOT SEED: Database "${DB_NAME}" is not a bcc-queue database!`,
      );
      console.error(
        "Seeding is only allowed on databases starting with 'bcc-queue'",
      );
      process.exit(1);
    }

    // Block production databases
    if (DB_NAME.includes("prod") || DB_NAME.includes("production")) {
      console.error(
        `🚨 CANNOT SEED: Database "${DB_NAME}" appears to be production!`,
      );
      process.exit(1);
    }

    console.log("✅ Database check passed\n");

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log(`✅ Connected to MongoDB (${DB_NAME})\n`);

    // Check if users already exist
    const existingAdmin = await User.findOne({ email: "admin@bcc.edu.ph" });
    const existingStudent = await User.findOne({ email: "student@bcc.edu.ph" });

    if (existingAdmin && existingStudent) {
      console.log("⚠️  Demo users already exist:");
      console.log("   Admin (Role 1): admin@bcc.edu.ph / admin123");
      console.log("   Student (Role 2): student@bcc.edu.ph / student123");

      process.stdout.write("\nDo you want to recreate them? (y/n): ");

      const answer = await new Promise<string>((resolve) => {
        process.stdin.once("data", (data) => {
          resolve(data.toString().trim().toLowerCase());
        });
      });

      if (answer === "y") {
        await User.deleteMany({
          email: { $in: ["admin@bcc.edu.ph", "student@bcc.edu.ph"] },
        });
        console.log("🗑️  Removed existing demo users\n");
        await createUsers();
      } else {
        console.log("👋 Keeping existing users. Exiting...");
      }
    } else {
      // Remove any partial existing users
      await User.deleteMany({
        email: { $in: ["admin@bcc.edu.ph", "student@bcc.edu.ph"] },
      });
      await createUsers();
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding users:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

async function createUsers() {
  // Create admin user
  const adminUser = new User({
    email: "admin@bcc.edu.ph",
    password: "admin123",
    role: UserRole.ADMIN,
    name: "Admin User",
  });

  // Create student user
  const studentUser = new User({
    email: "student@bcc.edu.ph",
    password: "student123",
    role: UserRole.STUDENT,
    name: "Student User",
  });

  await adminUser.save();
  console.log("✅ Created admin user: admin@bcc.edu.ph / admin123 (Role: 1)");

  await studentUser.save();
  console.log(
    "✅ Created student user: student@bcc.edu.ph / student123 (Role: 2)",
  );

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📋 Demo Credentials:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   Admin:");
  console.log("   📧 Email: admin@bcc.edu.ph");
  console.log("   🔑 Password: admin123");
  console.log("   👤 Role: 1 (Admin)");
  console.log("");
  console.log("   Student:");
  console.log("   📧 Email: student@bcc.edu.ph");
  console.log("   🔑 Password: student123");
  console.log("   👤 Role: 2 (Student)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("✨ Seed data created successfully!");
}

seedUsers();
