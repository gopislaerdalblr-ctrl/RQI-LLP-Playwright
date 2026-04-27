// Parameters defined here to support Active Choices and avoid the "maps" compilation error
properties([
    parameters([
        choice(name: 'INSTANCE', choices: ['maurya', 'samurai','preprodrqi1stop','preprodeu','preprodau','preprodchn',], description: 'Target Environment'),
        choice(name: 'BROWSER', choices: ['chromium', 'firefox', 'webkit', 'all'], description: 'Browser Selection'),
        
        // DYNAMIC MODULES (Using your exact working script)
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

        // DYNAMIC TAGS (Fixed to prevent &#64; escaping in the UI)
        [$class: 'ChoiceParameter', 
            choiceType: 'PT_SINGLE_SELECT', 
            name: 'TAGS', 
            script: [
                $class: 'GroovyScript', 
                fallbackScript: [classpath: [], sandbox: true, script: 'return ["All", "demo"]'], 
                script: [classpath: [], sandbox: true, script: '''
                    import java.io.File
                    def tags = ["All"] as Set
                    try {
                        def basePath = System.getenv("JENKINS_HOME") ?: (System.getProperty("user.home") + "/.jenkins")
                        def dir = new File(basePath + "/workspace/RQILLP-Playwright-Tests/src/features")
                        if (dir.exists()) {
                            dir.eachFileRecurse(groovy.io.FileType.FILES) { file ->
                                if (file.name.endsWith('.feature')) {
                                    file.eachLine { line ->
                                        // Capture ONLY the tag name to prevent Jenkins from escaping @
                                        def matcher = line =~ /@([\\w-]+)/
                                        matcher.each { tags.add(it[1].toString()) }
                                    }
                                }
                            }
                        }
                    } catch (Exception e) {
                        return ["ERROR: " + e.toString()]
                    }
                    return tags.sort().toList()
                ''']
            ]
        ],
        
        string(name: 'PARALLEL', defaultValue: '4', description: 'Number of parallel workers')
    ])
])

pipeline {
    agent any 

    environment {
        INSTANCE = "${params.INSTANCE}"
        BROWSER = "${params.BROWSER}"
        MODULE = "${params.MODULE}"
        // Re-adds @ so your runner.ts still gets the correct value (e.g., @smoke)
        TAGS = "${params.TAGS == 'All' ? '' : '@' + params.TAGS}"
        PARALLEL = "${params.PARALLEL}"
        PLAYWRIGHT_BROWSERS_PATH = '0' 
    }

    stages {
        // MATCHING STAGE 1 FROM SCREENSHOT
        stage('Updated Details') {
            steps {
                echo "Running tests for ${params.INSTANCE} | Browser: ${params.BROWSER}"
                echo "Selected Module: ${params.MODULE} | Execution Tag: ${env.TAGS}"
            }
        }

        // MATCHING STAGE 2 FROM SCREENSHOT
        stage('Chekout the code') {
            steps {
                checkout scm
            }
        }

        // MATCHING STAGE 3 FROM SCREENSHOT
        stage('powershell script') {
            steps {
                bat 'npm install'
                bat 'npx playwright install --with-deps'
            }
        }

        // MATCHING STAGE 4 FROM SCREENSHOT
        stage('Executing Test Cases') {
            steps {
                // Runs your Playwright/TypeScript/Cucumber suite
                bat 'npx ts-node src/runner.ts'
            }
        }

        // MATCHING STAGE 5 FROM SCREENSHOT
        stage('Capturing Report Screenshot') {
            steps {
                bat '''
                    if not exist "reports\\latest" mkdir "reports\\latest"
                    copy "reports\\_history\\*\\report.html" "reports\\latest\\index.html"
                '''
            }
        }

        // MATCHING STAGE 6 FROM SCREENSHOT
        stage('Start DISM Cleanup') {
            steps {
                echo "Automation job execution complete."
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