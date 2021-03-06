﻿import models = require('./models');
import grunt = require('./grunt');
import logging = require('./logging');
var log = new logging.Log();

export class TaskExecutionPrepareService {
    public static initTaskConfig(grunt, task, config): any {
        if (!config) throw "A task requires a configuration to run";
        delete config[task].task;
        delete config[task].package;
        delete config[task].dependencies;
        grunt.initConfig(config);
    }
}

export class TaskRegisterService {
    grunt: grunt.Grunt;

    public constructor(grunt: grunt.Grunt) {
        this.grunt = grunt;
    }

    registerTaskGroup(task: models.TaskGroup) {
        log.verbose.writeln("Tasks", "Register task group " + task.qualifiedName + " with " + task.tasks.length + " subtasks");
        this.grunt.registerTask(task.qualifiedName, "Automated Task Group", function () {});
        task.tasks.forEach((_) => this.registerTask(_));
    }

    registerTaskRunner(task: models.TaskRunner) {
        log.verbose.writeln("Tasks", "Register task runner " + task.qualifiedName + " with task " + task.task + "@" + task.package);

        var _ = this;
        this.grunt.registerTask(task.qualifiedName, "Automated Task Runner", function () {
            var done = this.async();
            _.grunt.registerExternalTask(task.package, task.dependencies, () => {
                TaskExecutionPrepareService.initTaskConfig(_.grunt, task.task, task.config);
                log.verbose.writeln("Tasks", 'Current Config:' + JSON.stringify(_.grunt.grunt.config()));
                _.grunt.run(task.task);
                log.verbose.writeln("Tasks", "Running task " + task.task + "... ");
                done();
            });
        });
    }

    public registerTask(task: models.Task) {
        if (task instanceof models.TaskGroup) {
            this.registerTaskGroup(<models.TaskGroup>task);
        }
        else if (task instanceof models.TaskRunner) {
            this.registerTaskRunner(<models.TaskRunner>task);
        }
    }
}

export class ConfigTaskRegistrationService {
    grunt: grunt.Grunt;
    taskRegisterService: TaskRegisterService;

    public constructor(grunt: grunt.Grunt,
        taskRegisterService = new TaskRegisterService(grunt)) {
        this.taskRegisterService = taskRegisterService;
        this.grunt = grunt;
    }

    public register(config: models.Configuration) {
        var result: string[] = [];
        config.steps.forEach((step) => {
            this.grunt.registerTask(step.name, "Build Step for " + step.name, () => { });

            step.tasks.forEach((_) => this.taskRegisterService.registerTask(_));
        });
    }
}