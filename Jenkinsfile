// =========================================================================
// DYNAMIC PARAMETERS MUST BE DEFINED OUTSIDE THE PIPELINE BLOCK
// =========================================================================
properties([
    parameters([
        properties([
    parameters([
        choice(name: 'INSTANCE', choices: ['maurya', 'samurai', 'rqi1stop', 'preprod'], description: 'Target Environment'),
        choice(name: 'BROWSER', choices: ['chromium', 'firefox', 'webkit', 'all'], description: 'Browser Selection'),
        
        // DYNAMIC MODULES
        [$class: 'ChoiceParameter', 
            choiceType: 'PT_SINGLE_SELECT', 
            name: 'MODULE', 
            script: [
                $class: 'GroovyScript', 
                fallbackScript: [script: 'return ["All"]'], 
                script: [script: '''
                    def fileList = ["All"]
                    def basePath = System.getenv("JENKINS_HOME") ?: (System.getProperty("user.home") + "/.jenkins")
                    def dir = new File(basePath + "/workspace/RQILLP-Playwright-Tests/src/features")
                    if (dir.exists()) {
                        dir.eachFileRecurse(groovy.io.FileType.FILES) { file ->
                            if (file.name.endsWith('.feature')) fileList.add(file.name.replace('.feature', ''))
                        }
                    }
                    return fileList
                ''']
            ]
        ],

        // DYNAMIC TAGS (Scans files for @ symbols)
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
        ],
        
        string(name: 'PARALLEL', defaultValue: '4', description: 'Number of parallel workers')
    ])
]),
        choice(name: 'BROWSER', choices: ['chromium', 'firefox', 'webkit', 'all'], description: 'Browser Selection'),
        
        // DYNAMIC MODULES
        [$class: 'ChoiceParameter', 
            choiceType: 'PT_SINGLE_SELECT', 
            name: 'MODULE', 
            script: [
                $class: 'GroovyScript', 
                fallbackScript: [script: 'return ["All"]'], 
                script: [script: '''
                    def fileList = ["All"]
                    def basePath = System.getenv("JENKINS_HOME") ?: (System.getProperty("user.home") + "/.jenkins")
                    def dir = new File(basePath + "/workspace/RQILLP-Playwright-Tests/src/features")
                    if (dir.exists()) {
                        dir.eachFileRecurse(groovy.io.FileType.FILES) { file ->
                            if (file.name.endsWith('.feature')) fileList.add(file.name.replace('.feature', ''))
                        }
                    }
                    return fileList
                ''']
            ]
        ],

        // DYNAMIC TAGS (Scans files for @ symbols)
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
        ],
        
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