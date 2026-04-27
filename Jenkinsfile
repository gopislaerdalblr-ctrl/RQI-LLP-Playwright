pipeline {
    agent any 

    // Creates the drop-down menus and text boxes in the Jenkins UI
    parameters {
        choice(name: 'INSTANCE', choices: ['maurya', 'samurai','preprodrqi1stop','preprodeu','preprodau','preprodchn',], description: 'Target Environment')
        choice(name: 'BROWSER', choices: ['chromium', 'firefox', 'webkit', 'all'], description: 'Browser Selection')
        string(name: 'TAGS', defaultValue: '@demo', description: 'Cucumber tags (e.g., @smoke or @regression)')
        string(name: 'PARALLEL', defaultValue: '4', description: 'Number of parallel workers')
    }

    // Injects the UI choices securely into Node.js process.env
    environment {
        INSTANCE = "${params.INSTANCE}"
        BROWSER = "${params.BROWSER}"
        TAGS = "${params.TAGS}"
        PARALLEL = "${params.PARALLEL}"
        
        // Ensures Playwright downloads browsers if the Jenkins agent is fresh
        PLAYWRIGHT_BROWSERS_PATH = '0' 
    }

    stages {
        stage('Checkout Repo') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                // If your Jenkins is running on Linux, change 'bat' to 'sh'
                bat 'npm install'
                bat 'npx playwright install --with-deps'
            }
        }

        stage('Execute Playwright Suite') {
            steps {
                // The runner will automatically absorb the environment variables set above!
                bat 'npx ts-node src/runner.ts'
            }
        }
    }

    // Capture the reports regardless of Pass/Fail
    post {
        always {
            echo "Archiving Playwright Reports..."
            // Grabs the HTML and ZIP files from your reports folder
            archiveArtifacts artifacts: 'reports/*.html, reports/*.zip', allowEmptyArchive: true
        }
        success {
            echo "✅ All tests passed successfully against ${params.INSTANCE}!"
        }
        failure {
            echo "❌ Failures detected. Check the zipped artifacts for videos and screenshots."
        }
    }
}