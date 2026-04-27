pipeline {
    agent any 

    parameters {
        choice(name: 'INSTANCE', choices: ['maurya', 'samurai','preprodrqi1stop','preprodeu','preprodau','preprodchn',], description: 'Target Environment')
        choice(name: 'BROWSER', choices: ['chromium', 'firefox', 'webkit', 'all'], description: 'Browser Selection')
        choice(name: 'MODULE', choices: ['All', 'courselaunch', 'admin', 'login'], description: 'Select the feature module to run')
        choice(name: 'TAGS', choices: ['@demo', '@smoke', '@regression', 'All'], description: 'Cucumber tags to execute')
        string(name: 'PARALLEL', defaultValue: '4', description: 'Number of parallel workers')
    }

    environment {
        INSTANCE = "${params.INSTANCE}"
        BROWSER = "${params.BROWSER}"
        MODULE = "${params.MODULE}"
        TAGS = "${params.TAGS}"
        PARALLEL = "${params.PARALLEL}"
        PLAYWRIGHT_BROWSERS_PATH = '0' 
    }

    // Every 'stage' here becomes a new column in your Jenkins Stage View grid!
    stages {
        stage('Checkout Source Code') {
            steps {
                checkout scm
            }
        }

        stage('NPM Setup & Dependencies') {
            steps {
                bat 'npm install'
            }
        }

        stage('Install Playwright Browsers') {
            steps {
                bat 'npx playwright install --with-deps'
            }
        }

        stage('Execute Playwright Tests') {
            steps {
                // Your custom runner handles the parallel execution and logic
                bat 'npx ts-node src/runner.ts'
            }
        }
    }

    // This will automatically create the "Declarative: Post Actions" column at the end
    post {
        always {
            echo "Archiving Playwright Reports..."
            archiveArtifacts artifacts: 'reports/**/*.html, reports/**/*.zip', allowEmptyArchive: true
        }
        success {
            echo "✅ All tests passed successfully against ${params.INSTANCE}!"
        }
        failure {
            echo "❌ Failures detected. Check the zipped artifacts for videos and screenshots."
        }
    }
}