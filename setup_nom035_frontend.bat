@echo off
REM Set base path to Desktop
set "BASE=%USERPROFILE%\Desktop\nom035-frontend"

REM Create directories for React + MUI project structure
mkdir "%BASE%"
mkdir "%BASE%\src"
mkdir "%BASE%\src\api"
mkdir "%BASE%\src\components"

REM Create empty JS files for main components/pages
type nul > "%BASE%\src\App.js"
type nul > "%BASE%\src\api\nom035.js"
type nul > "%BASE%\src\components\LandingPage.js"
type nul > "%BASE%\src\components\EmployeeForm.js"
type nul > "%BASE%\src\components\EmployeeList.js"
type nul > "%BASE%\src\components\SurveyForm.js"
type nul > "%BASE%\src\components\SurveyList.js"
type nul > "%BASE%\src\components\SurveyAnswer.js"
type nul > "%BASE%\src\components\Dashboard.js"
type nul > "%BASE%\src\components\SurveyResponsesTable.js"

REM Create README.md in project root
type nul > "%BASE%\README.md"

echo All directories and empty files for NOM-035 frontend created at:
echo %BASE%
echo.
echo Open each file in your code editor and paste the provided code blocks.
pause