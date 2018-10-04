#!/usr/bin/env node

/**
 * This project is distributed under the MIT license, you are free to 
 * use it however you want :) 
 * 
 * This CLI is for now really simple: it clones the repo on which the 
 * boilerplate is stored, clean the .git folder, run npm install into
 * the folder, and then ask for informations to update the package.json 
 * 
 * This was only made to get the creenv-boilerplate on your computer
 * faster, nothing else. I'm pretty sure there are some cases i'm not 
 * covering, so if you encounter an error, feel free to report it to 
 * the git repo on this project so that we can work on it. 
 * 
 * The goal on creative environment is to make the process of setting 
 * up an es6 environment easy, by doing the less possible. This way 
 * you are still free you make your own choices regarding on the 
 * developement of your app. 
 * 
 * [https://github.com/bcrespy/create-creenv](repo)
 * [https://github.com/bcrespy/create-creenv/issues](report)
 * 
 * Originally developed by Baptiste Crespy 
 * ---------
 * Contributors 
 * My mum :(
 */

var fs              = require('fs');
var rimraf          = require('rimraf')
var program         = require('commander');
var chalk           = require('chalk');
var package         = require('./package.json');
var git             = require('simple-git')();
var spawn           = require('cross-spawn');
var readline        = require('readline-sync');
var exec            = require('child_process').exec;

var SPACES          = "                             ";
var REPO            = "https://github.com/bcrespy/creenv-boilerplate.git";
var DEFAULT_FOLDER  = "creenv";



/**
 * Prints a chain or spaces using the provided color. If such a color 
 * is a background color, then it will print a bar (ez)
 * 
 * @param {string} color a chalk valid color
 */
function separation (color) {
  if (color === undefined) color = "bgBlue";
  console.log(chalk[color](SPACES));
}


/**
 * Basic informations about the begining of the installation 
 */
function startInfos () {
  separation();
  console.log("starting installation");
  separation();
}


/**
 * Creates a folder if it doesn't exist and prints informations
 * about the process
 * 
 * @param {string} folder the folder to create
 */
function createFolder (folder) {
  console.log("creating folder "+chalk.bold(folder));
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder);
    // folder was created
    console.log(chalk.green("folder created"));
  } else {
    console.log("folder already existing, moving to next step");
  }
  separation();
}


/**
 * Clone the creenv boilerplate repository into the destination 
 * folder. 
 * 
 * @param {string} distFolder the folder in which to clone
 * 
 * @return {Promise} resolve when repo is cloned
 */
function getRepo (distFolder) {
  return new Promise(function (resolve, reject) {
    console.log("fetching the repo");
    git.clone(REPO, distFolder, null, function (arg) {
      if (arg === null) {
        resolve();
      } else {
        reject();
      }
      separation();
    });
  });
}


/**
 * Run the npm install command into the dest folder
 * 
 * @param {string} dest the destination where npm install will run
 * 
 * @return {Promise} resolve when npm install is done
 */
function install (dest) {
  return new Promise(function (resolve, reject) {
    process.chdir(dest);
    var child = exec('npm install',
    function (error, stdout, stderr) {
        console.log(chalk.grey(stdout));
        console.log(chalk.grey(stderr));
        if (error !== null) {
          console.log(error);
          reject();
        } else {
          resolve();
        }
        separation();
    });
  })
}


/**
 * Removes the .git folder so that the project is not linked to 
 * the creenv-boilerplate repo 
 * 
 * @return {Promise} resolve when the folder is deleted
 */
function removeGitRepo () {
  return new Promise((resolve, reject) => {
    console.log("removing the git repo currently on the project");
    rimraf('/.git', function (error) {
      resolve(error === null ? 0 : 1);
    }); 
  });
}


/**
 * Ask the user for informations about his project to update the
 * package.json file, then saves the file into the project directory 
 * 
 * @param {object} json the JSON object from the package.json
 * @param {string} folder the folder path in which the package was from
 */
function updateJson (json, folder) {
  var answer = null;

  answer = readline.question("What's the name of your project (if empty, "+folder+" will be used) ? ");
  json.name = answer === "" ? folder : answer;

  answer = readline.question("Description of your project (optional): ");
  json.description = answer;

  answer = readline.question("Your name (will be saved in the package.json) ? ");
  json.author = answer;

  json.version = "0.0.1";
  json.repository = {};
  json.bugs = {};
  json.homepage = {};

  fs.writeFile("./package.json", JSON.stringify(json, null, 2), function (err) {
    if (err) {
      console.log(chalk.bold.red("\n\ncould not write the package.json, check it if you want to update it"))
    }
    console.log(chalk.bold.green("\n\nyour project is ready to be used. have a good time :)\n\n"));
  });
}


program
  .version(package.version)
  .arguments('<dest>')
  .option('-o, --open', 'if you want to enter the folder after installation')
  .option('-v, --version', 'display the current version of the cli')
  .option('-V, --VERSION <version>', 'fetch a specific version of the creative environment')
  .action(function (dest, cmd) {
    if (dest === undefined) dest = DEFAULT_FOLDER;
    startInfos();
    createFolder(dest);
    getRepo(dest).then(function(){
      console.log(chalk.bold.green("repo was sucessfully cloned"));

      install(dest).then(function(){
        console.log(chalk.green("npm install done, node modules were installed"));
  
        removeGitRepo().then(function (ret) {
          if (ret != 0 ) {
            console.log(chalk.bold.red("could not remove the git repository from the folder. you can either do so manually change the remote\n\n"));
          } else {
            console.log(chalk.green("git repo was removed"));
          }
          separation();
  
          // loads the json file 
          var packageJSON = require("./"+dest+"/package.json");
          // updates the package.json of the destination folder 
          updateJson(packageJSON, dest);
        })
      }).catch(function(error){
        console.log(chalk.bold.red("installation failed. the project is still in its early development so please report the conditions in which this error occured, thanks :)"))
        console.log("\n\n"+error+"\n\n");
      });

    }).catch(function() {
      console.log(chalk.bold.red("could not clone the repo. check if your internet is on, if it is please report this bug :)"))
    })
  });

program.parse(process.argv);

