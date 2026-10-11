DO $$ BEGIN
  CREATE TYPE "SupportThreadStatus" AS ENUM ('OPEN', 'PENDING', 'RESOLVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "SupportMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'NOTE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "SupportDeliveryStatus" AS ENUM ('DELIVERED', 'QUEUED', 'SENT', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "support_threads" (
  "id" TEXT NOT NULL,
  "senderEmail" TEXT NOT NULL,
  "senderName" TEXT,
  "subject" TEXT NOT NULL,
  "status" "SupportThreadStatus" NOT NULL DEFAULT 'OPEN',
  "assignedAdminId" TEXT,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "support_threads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "support_messages" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "direction" "SupportMessageDirection" NOT NULL,
  "deliveryStatus" "SupportDeliveryStatus" NOT NULL DEFAULT 'DELIVERED',
  "providerEmailId" TEXT,
  "idempotencyKey" TEXT,
  "internetMessageId" TEXT,
  "inReplyTo" TEXT,
  "fromAddress" TEXT NOT NULL,
  "toAddress" TEXT,
  "emailSubject" TEXT,
  "replyHeaders" JSONB,
  "textBody" TEXT NOT NULL,
  "authorAdminId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "support_messages" ADD COLUMN IF NOT EXISTS "emailSubject" TEXT;
ALTER TABLE "support_messages" ADD COLUMN IF NOT EXISTS "replyHeaders" JSONB;

CREATE TABLE IF NOT EXISTS "support_attachments" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "providerAttachmentId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "contentType" TEXT,
  "contentDisposition" TEXT,
  "contentId" TEXT,
  "size" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "support_audit_logs" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "actorAdminId" TEXT,
  "action" TEXT NOT NULL,
  "details" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "support_messages_providerEmailId_key" ON "support_messages"("providerEmailId");
CREATE UNIQUE INDEX IF NOT EXISTS "support_messages_idempotencyKey_key" ON "support_messages"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "support_messages_internetMessageId_idx" ON "support_messages"("internetMessageId");
CREATE UNIQUE INDEX IF NOT EXISTS "support_attachments_messageId_providerAttachmentId_key" ON "support_attachments"("messageId", "providerAttachmentId");
CREATE INDEX IF NOT EXISTS "support_threads_status_lastMessageAt_idx" ON "support_threads"("status", "lastMessageAt");
CREATE INDEX IF NOT EXISTS "support_threads_assignedAdminId_status_idx" ON "support_threads"("assignedAdminId", "status");
CREATE INDEX IF NOT EXISTS "support_threads_senderEmail_idx" ON "support_threads"("senderEmail");
CREATE INDEX IF NOT EXISTS "support_messages_threadId_createdAt_idx" ON "support_messages"("threadId", "createdAt");
CREATE INDEX IF NOT EXISTS "support_messages_inReplyTo_idx" ON "support_messages"("inReplyTo");
CREATE INDEX IF NOT EXISTS "support_attachments_messageId_idx" ON "support_attachments"("messageId");
CREATE INDEX IF NOT EXISTS "support_audit_logs_threadId_createdAt_idx" ON "support_audit_logs"("threadId", "createdAt");
CREATE INDEX IF NOT EXISTS "support_audit_logs_actorAdminId_createdAt_idx" ON "support_audit_logs"("actorAdminId", "createdAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_threads_assignedAdminId_fkey') THEN
    ALTER TABLE "support_threads" ADD CONSTRAINT "support_threads_assignedAdminId_fkey"
      FOREIGN KEY ("assignedAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_messages_threadId_fkey') THEN
    ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_threadId_fkey"
      FOREIGN KEY ("threadId") REFERENCES "support_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_messages_authorAdminId_fkey') THEN
    ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_authorAdminId_fkey"
      FOREIGN KEY ("authorAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_attachments_messageId_fkey') THEN
    ALTER TABLE "support_attachments" ADD CONSTRAINT "support_attachments_messageId_fkey"
      FOREIGN KEY ("messageId") REFERENCES "support_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_audit_logs_threadId_fkey') THEN
    ALTER TABLE "support_audit_logs" ADD CONSTRAINT "support_audit_logs_threadId_fkey"
      FOREIGN KEY ("threadId") REFERENCES "support_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_audit_logs_actorAdminId_fkey') THEN
    ALTER TABLE "support_audit_logs" ADD CONSTRAINT "support_audit_logs_actorAdminId_fkey"
      FOREIGN KEY ("actorAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
