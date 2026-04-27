// =========================================================================
// DYNAMIC PARAMETERS MUST BE DEFINED OUTSIDE THE PIPELINE BLOCK
// =========================================================================
properties([
    parameters([
        choice(name: 'INSTANCE', choices: ['maurya', 'samurai','preprodrqi1stop','preprodeu','preprodau','preprodchn',], description: 'Target Environment'),
        choice(name: 'BROWSER', choices: ['chromium', 'firefox', 'webkit', 'all'], description: 'Browser Selection'),
        
        // AUTOMATICALLY FETCHES FEATURE FILES
        [$class: 'ChoiceParameter', 
            choiceType: 'PT_SINGLE_SELECT', 
            description: 'Dynamically fetches all .feature files from your project', 
            filterLength: 1, 
            filterable: false, 
            name: 'MODULE', 
            script: [
                $class: 'GroovyScript', 
                fallbackScript: [classpath: [], sandbox: true, script: 'return ["All", "FALLBACK SCRIPT EXECUTED"]'], 
                script: [classpath: [], sandbox: true, script: '''
                    import java.io.File
                    def fileList = ["All"]
                    
                    try {
                        // Safely gets the Jenkins Home path, even on Windows
                        def basePath = System.getenv("JENKINS_HOME") ?: (System.getProperty("user.home") + "/.jenkins")
                        def dir = new File(basePath + "/workspace/RQILLP-Playwright-Tests/src/features")
                        
                        if (!dir.exists()) {
                            fileList.add("DEBUG: Folder not found at " + dir.absolutePath)
                            return fileList
                        }
                        
                        dir.eachFileRecurse(groovy.io.FileType.FILES) { file ->
                            if (file.name.endsWith('.feature')) {
                                fileList.add(file.name.replace('.feature', ''))
                            }
                        }
                    } catch (Exception e) {
                        fileList.add("ERROR: " + e.toString())
                    }
                    
                    return fileList
                ''']
            ]
        ],
        
        string(name: 'TAGS', defaultValue: '@demo', description: 'Type the Cucumber tags to execute (e.g., @smoke) or leave blank'),
        string(name: 'PARALLEL', defaultValue: '4', description: 'Number of parallel workers')
    ])
])

// =========================================================================
// THE ACTUAL PIPELINE
// =========================================================================
pipeline {
    agent any 

    environment {
        INSTANCE = "${params.INSTANCE}"
        BROWSER = "${params.BROWSER}"
        MODULE = "${params.MODULE}"
        TAGS = "${params.TAGS}"
        PARALLEL = "${params.PARALLEL}"
        PLAYWRIGHT_BROWSERS_PATH = '0' 
    }

    stages {
        stage('Checkout Source Code') {
            steps {
                checkout scm
            }
        }
        stage('NPM Setup') {
            steps {
                bat 'npm install'
                bat 'npx playwright install --with-deps'
            }
        }
        stage('Execute Playwright Tests') {
            steps {
                bat 'npx ts-node src/runner.ts'
            }
        }
    }

    post {
        always {
            echo "Archiving Playwright Reports..."
            archiveArtifacts artifacts: 'reports/**/*.html, reports/**/*.zip', allowEmptyArchive: true
            
            // Copies the dynamic timestamped HTML report to a static name so Jenkins can embed it
            bat '''
                if not exist "reports\\latest" mkdir "reports\\latest"
                copy "reports\\_history\\*\\report.html" "reports\\latest\\index.html"
            '''
            
            // Embeds the report directly into the Jenkins UI
            publishHTML([
                allowMissing: true, 
                alwaysLinkToLastBuild: true, 
                keepAll: true, 
                reportDir: 'reports/latest', 
                reportFiles: 'index.html', 
                reportName: 'Playwright UI Report', 
                reportTitles: 'Playwright Test Results'
            ])
        }
    }
}