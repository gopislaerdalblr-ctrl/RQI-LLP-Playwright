properties([
    parameters([
        choice(name: 'INSTANCE', choices: ['maurya', 'samurai','preprodrqi1stop','preprodeu','preprodau','preprodchn',], description: 'Target Environment'),
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