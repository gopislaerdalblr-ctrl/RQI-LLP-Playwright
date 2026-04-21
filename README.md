## Setup on a new machine

1. Install Node (recommended: Node 20)
2. In project root run:
   npm run setup

To run tests:
npm test

## Setup (new machine)

```bash
npm run setup
npm test
npm run check:env

```

# 🎭 RQI/LLP-Playwright Automation Framework

![Playwright](https://img.shields.io/badge/Playwright-Test-green)
![Cucumber](https://img.shields.io/badge/Cucumber-BDD-brightgreen)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue)
![Node.js](https://img.shields.io/badge/Node.js-16%2B-orange)

A robust End-to-End (E2E) test automation framework that combines the speed and reliability of **Playwright** with the readability of **Cucumber (BDD)** and the type safety of **TypeScript**.

---

## 🚀 Key Features

- **BDD Approach**: Write tests in plain English (`.feature` files) using Gherkin syntax.
- **Page Object Model (POM)**: Modular and reusable page classes for better maintenance.
- **Cross-Browser Support**: Run tests on Chromium, Firefox, and WebKit.
- **Parallel Execution**: drastically reduces test execution time.
- **Rich Reporting**: Generates HTML reports with screenshots and videos on failure.
- **CI/CD Ready**: Configured for easy integration with GitHub Actions or Jenkins.
- **Utilities**: Built-in helpers for random data generation, logging, and assertions.

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:

1.  **Node.js** (v16 or higher): [Download here](https://nodejs.org/)
2.  **Visual Studio Code** (Recommended IDE): [Download here](https://code.visualstudio.com/)
3.  **Cucumber (Gherkin) Extension** for VS Code: [Cucumber (Gherkin) Full Support](https://marketplace.visualstudio.com/items?itemName=alexkrechik.cucumberautocomplete)

---

## ⚙️ Installation

1.  **Clone the repository:**

    ```bash
    git clone [https://github.com/gopislaerdalblr-ctrl/RQI-LLP-Playwright.git](https://github.com/gopislaerdalblr-ctrl/RQI-LLP-Playwright.git)
    cd RQI-LLP-Playwright
    ```

2.  **Install project dependencies:**

    ```bash
    npm install
    ```

3.  **Install Playwright browsers:**
    ```bash
    npx playwright install
    ```

---

## 📂 Project Structure

A high-level overview of the framework architecture:

```text
RQI-LLP-Playwright/
│
├── src/
│   ├── api/                  # Direct HTTP API layer for course completion signals
│   │   ├── api-loader.ts     # Loads environment-specific API payloads (XML templates, headers)
│   │   ├── course-completion.ts  # Sends xAPI-style course completion POST requests
│   │   └── http-client.ts    # Thin Playwright-based HTTP client wrapper
│   │
│   ├── config/               # All environment & test data configuration
│   │   ├── instances.json    # Per-environment URLs, org IDs, subdomains
│   │   ├── config.json       # Admin credential pools (per instance, per parallel worker)
│   │   ├── course.json       # Course names, IDs, and test configuration
│   │   ├── course-config.ts  # TypeScript accessor for course.json
│   │   └── runtime.ts        # Unified runtime config loader (instances + secrets)
│   │
│   ├── features/             # BDD Gherkin feature files (plain English test scenarios)
│   │   ├── courselaunch.feature      # Full end-to-end course completion scenarios
│   │   ├── admin-login.feature       # Admin login, org navigation, student import
│   │   ├── merge-users.feature       # User merge / support action workflows
│   │   ├── tcts-regression.feature   # TCTS regression suite
│   │   └── moodle-user-creation.feature  # Moodle user creation scenarios
│   │
│   ├── pages/                # Centralized UI element dictionary
│   │   └── selectors.ts      # The "S" object — single source of truth for all locators
│   │
│   ├── steps/                # Step definition implementations (TypeScript)
│   │   ├── courselaunch.steps.ts       # Core e2e journey steps (largest, ~1300 lines)
│   │   ├── admin-login.steps.ts        # Admin portal navigation steps
│   │   ├── org-products.steps.ts       # Product & course management steps
│   │   ├── merge-users.steps.ts        # User merge workflow steps
│   │   ├── global-user-management.steps.ts  # Global user edit/search steps
│   │   ├── tcts-regression.steps.ts    # TCTS-specific regression steps
│   │   ├── moodle.steps.ts             # Moodle user creation steps
│   │   └── accessibility-helper.steps.ts   # Axe-core accessibility check step
│   │
│   ├── support/              # Cucumber lifecycle management
│   │   ├── hooks.ts          # Before/After/BeforeStep/AfterStep hooks + full telemetry
│   │   ├── world.ts          # Custom Cucumber World class (shared state between steps)
│   │   ├── pageFixture.ts    # Global page reference for utility access
│   │   ├── playwright-manager.ts  # Browser/context launch orchestration
│   │   └── healwright.ts     # AI-powered self-healing selector integration
│   │
│   ├── utils/                # Shared utility library
│   │   ├── ui-actions.ts     # Smart, resilient click/fill helpers with fallback logic
│   │   ├── credential-manager.ts  # Worker-aware admin credential pool dispatcher
│   │   ├── mutex.ts          # File-system mutex for critical section locking in parallel runs
│   │   ├── user-registry.ts  # Rolling JSON log of users created during execution
│   │   ├── date-helpers.ts   # Quarter-offset date calculator for course activation dates
│   │   ├── url-utils.ts      # URL normalization helpers
│   │   └── accessibility-helper.ts  # Axe-core integration for WCAG scanning
│   │
│   ├── report/               # Automated post-run report generation
│   │   ├── generate-report.ts  # Merges JSON, generates themed HTML, produces ZIP archive
│   │   └── rotate-reports.ts   # Prunes old report history (keeps last N runs)
│   │
│   └── runner.ts             # THE ENTRY POINT — custom orchestration & multi-browser runner
│
├── cucumber.js               # Cucumber configuration (paths, require, formatters, timeout)
├── package.json              # Dependencies, Node engine constraints, npm scripts
├── tsconfig.json             # TypeScript compiler configuration
└── reports/                  # Output artifacts (auto-generated, gitignored)
    ├── _tmp/                 # Per-run working files (JSON, screenshots, videos, logs)
    └── _history/             # Timestamped HTML report archives (ZIP + HTML)


```

Running Tests
You can execute tests using the scripts defined in package.json.

1. Run All Tests
   Executes all feature files in headless mode.

npm test

2. Run Specific Tags
   Execute scenarios tagged with @smoke or @regression.

Bash

# Run smoke tests

npm run test:smoke

# Run regression tests

npm run test:regression

3. Run in Headed Mode
   Watches the test execution in a visible browser window.

Bash
npm run test:headed 4. Run on Specific Browser
By default, tests run on Chromium. To run on Firefox or WebKit:

Bash
npm test -- --browser firefox
Reporting
After execution, reports are automatically generated in the reports/ directory.

HTML Report: Provides a visual summary of the test run.

Cucumber JSON: Used for CI/CD integration.

Screenshots: Automatically attached to the report for failed steps.

To open the generated HTML report manually:

Bash
npx open reports/cucumber_report.html

Debugging & Troubleshooting
VS Code Configuration
For the best experience, add a .vscode/settings.json file to enable "Go to Definition" for steps:

JSON
{
"cucumberautocomplete.steps": [
"src/test/steps/*.ts"
],
"cucumberautocomplete.syncfeatures": "src/test/features/\*.feature",
"cucumberautocomplete.strictGherkinCompletion": true
}
Viewing Traces
If a test fails, a Playwright Trace zip file is generated in test-results/. You can view it using:

Bash
npx playwright show-trace test-results/trace.zip

CI/CD Integration (GitHub Actions)
This repo includes a basic workflow in .github/workflows/main.yml. It triggers on every push to the main branch.

Workflow Summary:

Checkout code

Install Node.js & Dependencies

Install Playwright Browsers

Run Tests (npm test)

Upload Report Artifacts

Contributing
Create a new branch: git checkout -b feature/your-feature-name

Commit your changes: git commit -m 'Add some feature'

Push to the branch: git push origin feature/your-feature-name

Open a Pull Request.

```

```
