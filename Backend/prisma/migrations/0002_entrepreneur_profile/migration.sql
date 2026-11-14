-- CreateTable
CREATE TABLE "entrepreneur_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "venture_name" TEXT,
    "industry" TEXT NOT NULL DEFAULT 'Other / Interdisciplinary',
    "problem_statement" TEXT,
    "venture_stage" TEXT NOT NULL DEFAULT 'exploring_idea',
    "primary_goal" TEXT,
    "skills_to_develop" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "business_challenges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferred_support" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_complete" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entrepreneur_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entrepreneur_profiles_user_id_key" ON "entrepreneur_profiles"("user_id");

-- CreateIndex
CREATE INDEX "entrepreneur_profiles_industry_idx" ON "entrepreneur_profiles"("industry");

-- CreateIndex
CREATE INDEX "entrepreneur_profiles_venture_stage_idx" ON "entrepreneur_profiles"("venture_stage");

-- AddForeignKey
ALTER TABLE "entrepreneur_profiles" ADD CONSTRAINT "entrepreneur_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

