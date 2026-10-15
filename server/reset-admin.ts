
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "./src/models.js";

declare const process: {
  env: Record<string, string | undefined>;
  exitCode?: number;
};

async function resetAdmin() {
  try {
    const email = String(process.env.ADMIN_EMAIL || "")
      .trim()
      .toLowerCase();

    const password = String(process.env.ADMIN_PASSWORD || "");

    if (!process.env.MONGODB_URI || !email || !password) {
      throw new Error(
        "MONGODB_URI, ADMIN_EMAIL and ADMIN_PASSWORD are required in .env"
      );
    }

    if (password.length < 12) {
      throw new Error("Set a strong ADMIN_PASSWORD of at least 12 characters.");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const admin = await User.findOne({ email });

    if (!admin) {
      console.error(`Admin account not found: ${email}`);
      return;
    }

    admin.passwordHash = await bcrypt.hash(password, 12);
    await admin.save();

    console.log(`Admin password successfully reset for ${email}.`);
  } catch (error) {
    console.error("Password reset failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

resetAdmin();
