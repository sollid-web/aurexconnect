CREATE TABLE "kyc_documents" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "data" BYTEA NOT NULL,
  "mimeType" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kyc_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "kyc_documents_userId_createdAt_idx" ON "kyc_documents"("userId", "createdAt");

ALTER TABLE "kyc_documents"
  ADD CONSTRAINT "kyc_documents_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
