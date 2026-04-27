pipeline {
    agent any 

    parameters {
        choice(name: 'INSTANCE', choices: ['maurya', 'samurai','preprodrqi1stop','preprodeu','preprodau','preprodchn',], description: 'Target Environment')
        choice(name: 'BROWSER', choices: ['chromium', 'firefox', 'webkit', 'all'], description: 'Browser Selection')
        
        // DYNAMIC MODULES (Active Choices)
        [$class: 'ChoiceParameter', 
            choiceType: 'PT_SINGLE_SELECT', 
            name: 'MODULE', 
            script: [
                $class: 'GroovyScript', 
                fallbackScript: [script: 'return ["All"]'], 
                script: [script: '''
                    def fileList = ["All"]
                    def basePath = System.getenv("JENKINS_HOME") ?: (System.getProperty("user.home") + "/.jenkins")
                    // IMPORTANT: Ensure "RQILLP-Playwright-Tests" matches your Job Name exactly
                    def dir = new File(basePath + "/workspace/RQILLP-Playwright-Tests/src/features")
                    if (dir.exists()) {
                        dir.eachFileRecurse(groovy.io.FileType.FILES) { file ->
                            if (file.name.endsWith('.feature')) fileList.add(file.name.replace('.feature', ''))
                        }
                    }
                    return fileList
                ''']
            ]
        ]

        // DYNAMIC TAGS (Active Choices)
        [$class: 'ChoiceParameter', 
            choiceType: 'PT_SINGLE_SELECT', 
            name: 'TAGS', 
            script: [
                $class: 'GroovyScript', 
                fallbackScript: [script: 'return ["@demo"]'], 
                script: [script: '''
                    def tags = ["All"] as Set
                    def basePath = System.getenv("JENKINS_HOME") ?: (System.getProperty("user.home") + "/.jenkins")
                    def dir = new File(basePath + "/workspace/RQILLP-Playwright-Tests/src/features")
                    if (dir.exists()) {
                        dir.eachFileRecurse(groovy.io.FileType.FILES) { file ->
                            if (file.name.endsWith('.feature')) {
                                file.eachLine { line ->
                                    def matcher = line =~ /(@\\w+)/
                                    matcher.each { tags.add(it[0]) }
                                }
                            }
                        }
                    }
                    return tags.sort().toList()
                ''']
            ]
        ]
        
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

    // These stages create the job columns like in your screenshot
    stages {
        stage('Updated Details') {
            steps {
                echo "Target: ${params.INSTANCE} | Browser: ${params.BROWSER}"
                echo "Running Module: ${params.MODULE} with Tags: ${params.TAGS}"
            }
        }

        stage('Chekout the code') {
            steps {
                checkout scm
            }
        }

        stage('powershell script') {
            steps {
                bat 'npm install'
                bat 'npx playwright install --with-deps'
            }
        }

        stage('Executing Test Cases') {
            steps {
                // Runs your Playwright/TypeScript/Cucumber suite
                bat 'npx ts-node src/runner.ts'
            }
        }

        stage('Capturing Report Screenshot') {
            steps {
                // Prepares the HTML report for UI embedding
                bat '''
                    if not exist "reports\\latest" mkdir "reports\\latest"
                    copy "reports\\_history\\*\\report.html" "reports\\latest\\index.html"
                '''
            }
        }

        stage('Start DISM Cleanup') {
            steps {
                echo "Test execution and reporting cycle complete."
            }
        }
    }

    post {
        always {
            script {
                echo "Archiving Playwright Reports..."
                archiveArtifacts artifacts: 'reports/**/*.html, reports/**/*.zip', allowEmptyArchive: true
                
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
}