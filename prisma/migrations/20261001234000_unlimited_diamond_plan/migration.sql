ALTER TABLE "plans" ALTER COLUMN "maxAmount" DROP NOT NULL;

UPDATE "plans"
SET "name" = 'Gold Plan', "roiPercent" = 8, "minAmount" = 50, "maxAmount" = 999, "durationDays" = 1, "referralBonus" = 5, "description" = 'A short-term entry plan with ROI credited within 24 hours.', "features" = ARRAY['8% total ROI', '$50 – $999 Investment', '24 Hour Duration', '5% Referral Bonus', '24/7 Support']::text[]
WHERE "name" = 'Basic Plan';

UPDATE "plans"
SET "name" = 'Silver Plan', "roiPercent" = 30, "minAmount" = 1000, "maxAmount" = 4999, "durationDays" = 1, "referralBonus" = 5, "description" = 'A higher-capital plan with ROI credited within 24 hours.', "features" = ARRAY['30% total ROI', '$1,000 – $4,999 Investment', '24 Hour Duration', '5% Referral Bonus', 'Priority Support']::text[]
WHERE "name" = 'Golden Plan';

UPDATE "plans"
SET "name" = 'Bronze Plan', "roiPercent" = 60, "minAmount" = 10000, "maxAmount" = 49999, "durationDays" = 3, "referralBonus" = 5, "description" = 'A three-day plan for committed investors seeking a larger allocation.', "features" = ARRAY['60% total ROI', '$10,000 – $49,999 Investment', '3 Day Duration', '5% Referral Bonus', 'Dedicated Support']::text[]
WHERE "name" = 'Mega Plan';

UPDATE "plans"
SET "name" = 'Diamond Plan', "roiPercent" = 120, "minAmount" = 100000, "maxAmount" = NULL, "durationDays" = 30, "referralBonus" = 5, "description" = 'The highest-capital plan with a one-month investment duration.', "features" = ARRAY['120% total ROI', '$100,000+ Investment', '1 Month Duration', '5% Referral Bonus', 'VIP Account Support']::text[]
WHERE "name" = 'Premium Plan';
