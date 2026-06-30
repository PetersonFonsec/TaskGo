CREATE TABLE "review_tags" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "review_tags_on_reviews" (
    "review_id" BIGINT NOT NULL,
    "tag_id" BIGINT NOT NULL,

    CONSTRAINT "review_tags_on_reviews_pkey" PRIMARY KEY ("review_id", "tag_id")
);

CREATE UNIQUE INDEX "review_tags_slug_key" ON "review_tags"("slug");
CREATE INDEX "review_tags_is_active_idx" ON "review_tags"("is_active");
CREATE INDEX "review_tags_on_reviews_tag_id_idx" ON "review_tags_on_reviews"("tag_id");

ALTER TABLE "review_tags_on_reviews" ADD CONSTRAINT "review_tags_on_reviews_review_id_fkey"
    FOREIGN KEY ("review_id") REFERENCES "avaliacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "review_tags_on_reviews" ADD CONSTRAINT "review_tags_on_reviews_tag_id_fkey"
    FOREIGN KEY ("tag_id") REFERENCES "review_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
