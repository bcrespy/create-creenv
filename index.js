#!/usr/bin/env node

var fs              = require('fs');
var program         = require('commander');
var chalk           = require('chalk');
var package         = require('./package.json');
var git             = require('simple-git')();
var spawn           = require('cross-spawn');
var readline        = require('readline-sync');


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
 */
function getRepo (distFolder) {
  console.log("fetching the repo");
  git.clone(REPO, distFolder);
  console.log("repo cloned");
  separation();
}

/**
 * Run the npm install command into the dest folder
 * 
 * @param {string} dest the destination where npm install will run
 */
function install (dest) {
  return new Promise(function (resolve, reject){
    process.chdir(dest);
    let command = 'npm',
        args = [
          'install',
          '--save',
          '--save-exact',
          '--loglevel',
          'error',
        ];

    var child = spawn(command, args, { stdio: 'inherit' });
    child.on('close', function (code, signal) {
      if (code !== 0) {
        reject(signal);
        return;
      }
      resolve();
      separation();
    });
  })
}

function removeGitRepo () {
  return new Promise((resolve, reject) => {
    console.log("removing the git repo currently on the project");
    var child = spawn("rm", ["-rf", ".git"], { stdio: 'inherit' });
    child.on('close', function (code, signal) {
      if (code !== 0) {
        reject(signal);
        return;
      } else {
        resolve(0);
      }
    });
  });
}

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
    getRepo(dest);
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
        var packageJSON = require("./package.json");
        // updates the package.json of the destination folder 
        updateJson(packageJSON, dest);
      })
    }).catch(function(error){
      console.log(chalk.bold.red("installation failed. the project is still in its early development so please report the conditions in which this error occured, thanks :)"))
      console.log("\n\n"+error+"\n\n");
    });
  });

program.parse(process.argv);

