-- AlterTable
ALTER TABLE "ai_tools" ADD COLUMN "market_tier" INTEGER,
ADD COLUMN "pricing_source_url" TEXT,
ADD COLUMN "pricing_verified_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "tool_reports" (
    "id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "report_category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewer_id" TEXT,
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_tools_market_tier_idx" ON "ai_tools"("market_tier");

-- CreateIndex
CREATE INDEX "tool_reports_tool_id_idx" ON "tool_reports"("tool_id");

-- CreateIndex
CREATE INDEX "tool_reports_user_id_idx" ON "tool_reports"("user_id");

-- CreateIndex
CREATE INDEX "tool_reports_status_idx" ON "tool_reports"("status");

-- CreateIndex
CREATE INDEX "tool_reports_report_category_idx" ON "tool_reports"("report_category");

-- CreateIndex
CREATE INDEX "tool_reports_created_at_idx" ON "tool_reports"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "tool_reports" ADD CONSTRAINT "tool_reports_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "ai_tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_reports" ADD CONSTRAINT "tool_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_reports" ADD CONSTRAINT "tool_reports_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
