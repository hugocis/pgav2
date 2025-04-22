/*
  Warnings:

  - Added the required column `hash` to the `ActivityLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `signature` to the `ActivityLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN     "hash" TEXT NOT NULL,
ADD COLUMN     "prevHash" TEXT,
ADD COLUMN     "signature" TEXT NOT NULL;
