// createStructure.js (ES Module version)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Trick to get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const basePath = path.join(__dirname, 'Frontend', 'src');

const structure = {
  components: {
    common: ['Footer.jsx', 'Loading.jsx', 'ErrorBoundary.jsx', 'ProtectedRoute.jsx', 'Timer.jsx'],
    auth: ['Login.jsx', 'Register.jsx', 'ForgotPassword.jsx', 'ResetPassword.jsx'],
    courses: ['CourseCard.jsx', 'CourseList.jsx', 'CourseDetails.jsx', 'CourseFilters.jsx', 'CategoryFilter.jsx'],
    test: ['TestStart.jsx', 'TestQuestion.jsx', 'TestResult.jsx', 'TestHistory.jsx', 'TestCard.jsx'],
    profile: ['UserProfile.jsx', 'ChangePassword.jsx', 'TestResults.jsx', 'ProfileStats.jsx'],
    ui: ['Button.jsx', 'Input.jsx', 'Card.jsx', 'Modal.jsx', 'Chart.jsx']
  },
  pages: ['Home.jsx', 'Courses.jsx', 'Test.jsx', 'Profile.jsx', 'Login.jsx', 'Register.jsx', 'NotFound.jsx'],
  context: ['AuthContext.jsx', 'CourseContext.jsx', 'TestContext.jsx', 'ThemeContext.jsx'],
  hooks: ['useAuth.js', 'useApi.js', 'useTimer.js', 'useLocalStorage.js'],
  services: ['api.js', 'authService.js', 'courseService.js', 'testService.js'],
  utils: ['constants.js', 'helpers.js', 'validation.js', 'storage.js'],
  styles: ['globals.css', 'components.css', 'animations.css']
};

function createDirIfNotExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

function createFileIfNotExists(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '');
    console.log(`Created file: ${filePath}`);
  } else {
    console.log(`File already exists: ${filePath}`);
  }
}

function generateStructure() {
  createDirIfNotExists(basePath);

  const componentsPath = path.join(basePath, 'components');
  createDirIfNotExists(componentsPath);

  for (const [subDir, files] of Object.entries(structure.components)) {
    const subDirPath = path.join(componentsPath, subDir);
    createDirIfNotExists(subDirPath);
    files.forEach(file => createFileIfNotExists(path.join(subDirPath, file)));
  }

  for (const [folder, files] of Object.entries(structure)) {
    if (folder === 'components') continue;

    const folderPath = path.join(basePath, folder);
    createDirIfNotExists(folderPath);
    files.forEach(file => createFileIfNotExists(path.join(folderPath, file)));
  }

  console.log('Structure creation completed.');
}

generateStructure();
