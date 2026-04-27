// Properties block supports Active Choices and commas
properties([
    parameters([
        choice(
            name: 'INSTANCE',
            choices: ['maurya', 'samurai','preprodrqi1stop','preprodeu','preprodau','preprodchn'],
            description: 'Target Environment'
        ),
        choice(
            name: 'BROWSER',
            choices: ['chromium', 'firefox', 'webkit', 'all'],
            description: 'Browser Selection'
        ),
        [$class: 'ChoiceParameter',
            choiceType: 'PT_SINGLE_SELECT',
            name: 'MODULE',
            description: 'Dynamically fetches all .feature files',
            filterLength: 1,
            filterable: true,
            script: [
                $class: 'GroovyScript',
                fallbackScript: [classpath: [], sandbox: true, script: 'return ["All"]'],
                script: [classpath: [], sandbox: true, script: '''
                    import java.io.File
                    def fileList = ["All"]
                    try {
                        def basePath = System.getenv("JENKINS_HOME") ?: (System.getProperty("user.home") + "/.jenkins")
                        def dir = new File(basePath + "/workspace/RQI-LLP-Playwright-Tests/src/features")
                        if (!dir.exists()) return fileList
                        dir.eachFileRecurse(groovy.io.FileType.FILES) { file ->
                            if (file.name.endsWith('.feature')) {
                                fileList.add(file.name.replace('.feature', ''))
                            }
                        }
                    } catch (Exception e) {}
                    return fileList.sort()
                ''']
            ]
        ],
        [$class: 'ChoiceParameter',
            choiceType: 'PT_SINGLE_SELECT',
            name: 'TAGS',
            description: 'Select a tag to filter scenarios',
            filterLength: 1,
            filterable: true,
            script: [
                $class: 'GroovyScript',
                fallbackScript: [classpath: [], sandbox: true, script: 'return ["All"]'],
                script: [classpath: [], sandbox: true, script: '''
                    import java.io.File
                    def tags = ["All"] as Set
                    try {
                        def basePath = System.getenv("JENKINS_HOME") ?: (System.getProperty("user.home") + "/.jenkins")
                        def dir = new File(basePath + "/workspace/RQI-LLP-Playwright-Tests/src/features")
                        if (dir.exists()) {
                            dir.eachFileRecurse(groovy.io.FileType.FILES) { file ->
                                if (file.name.endsWith('.feature')) {
                                    file.eachLine { line ->
                                        def matcher = line =~ /@([a-zA-Z0-9_-]+)/
                                        matcher.each { tags.add(it[1].toString()) }
                                    }
                                }
                            }
                        }
                    } catch (Exception e) {}
                    return tags.sort().toList()
                ''']
            ]
        ],
        string(
            name: 'PARALLEL',
            defaultValue: '4',
            description: 'Number of parallel workers'
        )
    ])
])

pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        INSTANCE                 = "${params.INSTANCE  ?: 'maurya'}"
        BROWSER                  = "${params.BROWSER   ?: 'chromium'}"
        MODULE                   = "${params.MODULE    ?: 'All'}"
        TAGS                     = "${params.TAGS == null || params.TAGS == 'All' ? '' : (params.TAGS?.startsWith('@') ? params.TAGS : '@' + params.TAGS)}"
        PARALLEL                 = "${params.PARALLEL  ?: '4'}"
        PLAYWRIGHT_BROWSERS_PATH = '0'
    }

    stages {

        stage('Updated Details') {
            steps {
                echo "Instance: ${env.INSTANCE} | Browser: ${env.BROWSER} | Module: ${env.MODULE} | Tags: ${env.TAGS} | Parallel: ${env.PARALLEL}"
            }
        }

        stage('Checkout Code') {
            steps {
                git branch: 'main', url: 'https://github.com/gopislaerdalblr-ctrl/RQI-LLP-Playwright.git'
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm install'
                bat 'npx playwright install --with-deps'
            }
        }

        stage('Execute Test Cases') {
            steps {
                bat 'npx ts-node src/runner.ts'
            }
        }

        stage('Capture Report') {
            steps {
                bat '''
                    if not exist "reports\\latest" mkdir "reports\\latest"
                    copy "reports\\_history\\*\\report.html" "reports\\latest\\index.html"
                '''
            }
        }

        stage('Finalise') {
            steps {
                echo "Execution cycle complete."
            }
        }
    }

    post {
        always {
            script {
                catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                    bat '''
                        if not exist "reports\\latest" mkdir "reports\\latest"
                        copy "reports\\_history\\*\\report.html" "reports\\latest\\index.html"
                    '''
                }

                archiveArtifacts(
                    artifacts: 'reports/**/*.html, reports/**/*.zip',
                    allowEmptyArchive: true
                )

                publishHTML([
                    allowMissing         : true,
                    alwaysLinkToLastBuild: true,
                    keepAll              : true,
                    reportDir            : 'reports/latest',
                    reportFiles          : 'index.html',
                    reportName           : 'Playwright UI Report',
                    reportTitles         : 'Playwright Test Results'
                ])
            }
        }
        success { echo "✅ BUILD PASSED" }
        failure { echo "❌ BUILD FAILED — check Execute Test Cases logs" }
    }
}