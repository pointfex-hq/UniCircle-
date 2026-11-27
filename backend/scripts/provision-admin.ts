import mongoose from 'mongoose';
import { getEnvironment } from '../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../src/lib/mongo.js';
import { normalizeEmail } from '../src/services/auth.js';
import { hashPassword } from '../src/lib/security.js';
import { ApprovedEmailDomain } from '../src/models/approved-email-domain.js';
import { User } from '../src/models/core.js';

async function main() {
  const [universityEmailInput, fullNameInput, displayNameInput] = process.argv.slice(2);
  const password = process.env.UNICIRCLE_ADMIN_PASSWORD;
  delete process.env.UNICIRCLE_ADMIN_PASSWORD;

  if (!universityEmailInput || !fullNameInput || !displayNameInput || !password) {
    throw new Error('Email, full name, display name and a securely supplied password are required.');
  }
  if (fullNameInput.trim().length > 100 || displayNameInput.trim().length < 2 || displayNameInput.trim().length > 50) {
    throw new Error('Admin name values are outside the permitted lengths.');
  }
  if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error('Password must be at least 8 characters and contain upper-case, lower-case and numeric characters.');
  }

  getEnvironment();
  await connectDatabase();
  try {
    const { email, domain } = normalizeEmail(universityEmailInput);
    const passwordHash = await hashPassword(password);
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (!await ApprovedEmailDomain.exists({ domain, isActive: true }).session(session)) {
          throw new Error('The admin email domain is not active and approved.');
        }
        if (await User.exists({ universityEmail: email }).session(session)) {
          throw new Error('An account already exists for this email; provisioning stopped without changing it.');
        }
        await User.create([{
          fullName: fullNameInput.trim(), displayName: displayNameInput.trim(), universityEmail: email, emailDomain: domain,
          passwordHash, role: 'admin', verificationStatus: 'verified', emailVerifiedAt: new Date(),
        }], { session });
      });
    } finally {
      await session.endSession();
    }
    process.stdout.write('Initial verified administrator created successfully.\n');
  } finally {
    await disconnectDatabase();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Administrator provisioning failed.';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
