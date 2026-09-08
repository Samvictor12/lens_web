-- RefreshToken 1:n per user: drop userId uniqueness, unique on token, index userId.
-- Existing rows stay in place.

-- DropIndex
DROP INDEX "refresh_tokens_userId_key";

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");
