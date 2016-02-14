module.exports = function(grunt) {
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        uglify: {
            build: {
                src: "client/client.js",
                dest: "server/public/scripts/assets/client.min.js"
            }
        },
        watch: {
    			scripts: {
    				files: ["client/client.js"],
    				tasks: ["uglify"],
    				options: {
    					spawn: false
    				}
    			}
    		},
        copy: {
            main: {
                expand: true,
                cwd: "node_modules/",
                src: [
                    "angular/angular.min.js",
                    "angular/angular.min.js.map",
					          "angular/angular-csp.css",
                    "angular-animate/angular-animate.min.js",
                    "angular-route/angular-route.min.js",
                    "angular-cookies/angular-cookies.min.js",
                    "tr-ng-grid/trNgGrid.min.css",
                    "tr-ng-grid/trNgGrid.min.js",
                    "d3/d3.min.js"
                ],
                "dest": "server/public/scripts/vendors/"
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-watch");

    // Default task(s).
    grunt.registerTask("default", ["copy", "uglify", "watch"]);

};
