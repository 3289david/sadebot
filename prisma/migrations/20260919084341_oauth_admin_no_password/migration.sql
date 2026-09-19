/*
  Warnings:

  - You are about to drop the column `loginId` on the `AdminUser` table. All the data in the column will be lost.
  - You are about to drop the column `passwordHash` on the `AdminUser` table. All the data in the column will be lost.
  - You are about to drop the column `totpEnabled` on the `AdminUser` table. All the data in the column will be lost.
  - You are about to drop the column `totpSecret` on the `AdminUser` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "AdminUser_loginId_key";

-- AlterTable
ALTER TABLE "AdminUser" DROP COLUMN "loginId",
DROP COLUMN "passwordHash",
DROP COLUMN "totpEnabled",
DROP COLUMN "totpSecret",
ADD COLUMN     "avatarHash" TEXT;
