@echo off
echo === GUDCITY ENROLLMENT NOTIFICATION SYSTEM FIX ===
echo This script will fix issues with the enrollment notification process.
echo.

REM Set up the proper database connection environment
set DATABASE_URL=postgres://postgres:postgres@localhost:5432/gudcity
set TEST_CUSTOMER_ID=4
set TEST_BUSINESS_ID=1

echo Step 1: Applying database procedure fixes...
psql -f fix-enrollment-procedure.sql %DATABASE_URL%

echo.
echo Step 2: Checking for broken enrollments...
psql -c "SELECT COUNT(*) FROM program_enrollments pe LEFT JOIN loyalty_cards lc ON pe.customer_id = lc.customer_id AND pe.program_id = lc.program_id WHERE pe.status = 'ACTIVE' AND lc.id IS NULL;" %DATABASE_URL%

echo.
echo Step 3: Fixing any broken enrollments...
psql -c "SELECT fix_stuck_enrollments();" %DATABASE_URL%

echo.
echo Step 4: Verifying the fix worked...
psql -c "SELECT COUNT(*) FROM program_enrollments pe LEFT JOIN loyalty_cards lc ON pe.customer_id = lc.customer_id AND pe.program_id = lc.program_id WHERE pe.status = 'ACTIVE' AND lc.id IS NULL;" %DATABASE_URL%

echo.
echo === ENROLLMENT FIX COMPLETE ===
echo To test the complete enrollment flow, run:
echo     node test-enrollment-notification-fix.mjs
echo.
pause 