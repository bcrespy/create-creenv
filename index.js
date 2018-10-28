#!/usr/bin/env node

/**
 * @author Baptiste Crespy <baptiste.crespy@gmail.com>
 * @license MIT
 * 
 * This CLI is for now really simple: it clones the repo on which the boilerplate is stored, clean the .git folder, run 
 * npm install into the folder, and then ask for informations to update the package.json 
 * 
 * This was only made to get the creenv-boilerplate on your computer faster, nothing else. I'm pretty sure there are some cases 
 * i'm not covering, so if you encounter an error, feel free to report it to the git repo on this project so that we can work 
 * on it. 
 * 
 * The goal on creative environment is to make the process of setting up an es6 environment easy, by doing the less possible. 
 * This way you are still free you make your own choices regarding on the developement of your app. 
 * 
 * <https://github.com/bcrespy/create-creenv>
 * 
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
var readdir         = require('recursive-readdir');
var uncomment       = require('decomment');
var exec            = require('child_process').exec;

var SPACES          = "                             ";
var DEFAULT_FOLDER  = "creenv";
var REPOS           = {
                        default: "https://github.com/bcrespy/creenv-boilerplate.git",
                        demo: "https://github.com/bcrespy/creenv-boilerplate-demo.git",
                        light: "https://github.com/bcrespy/creenv-boilerplate-light.git"
                      };

var PRINT_LOADER    = false;
var LOADING_CHARS   = [ "( ˘ ³˘)♥", "o(╥﹏╥)o", "( ͡° ͜ʖ ͡°)", "(◕‿◕✿)", "(☉_☉)", "٩ʕ•͡×•ʔ۶", "☜(⌒▽⌒)☞", "(‿|‿)", "( . Y . )", "※\(^o^)/※" ];



/**
 * Prints a chain or spaces using the provided color. If such a color 
 * is a background color, then it will print a bar (ez)
 * 
 * @param {string} color a chalk valid color
 */
function separation (color) {
  if (color === undefined) color = "bgBlue";
  console.log("\n"+chalk[color](SPACES)+"\n");
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
 * Start or end the loader depending on the yes value
 * 
 * @param {boolean} yes true if it's a start
 */
function load (yes) {
  if (yes === undefined) yes = true;
  if (yes) {
    PRINT_LOADER = true;
    loader();
  } else {
    PRINT_LOADER = false;
    process.stdout.write("\r");
  }
}


/**
 * Display a funny loader to show it's doint something 
 */
function loader (str) {
  if (PRINT_LOADER) {
    var cols = process.stdout.columns;
    str = LOADING_CHARS[Math.floor(Math.random()*LOADING_CHARS.length)];
    var startAt = Math.round(cols/2)-str.length/2;
    var spaces = "";
    for (let i = 0;i<startAt;i++) spaces+=" ";
    process.stdout.write(spaces+chalk.bold.red(str)+"\r");
    setTimeout(function () {
      loader();
    }, 150);
  } else {
  }
}


/**
 * Called once the installation has succeeded and is completed
 */
function onInstallationCompleted () {
  console.log("\n\n");
  console.log(chalk.bold.green("Installation is done (ง •̀_•́)ง\n"));
  console.log(chalk.bold.blue("See https://github.com/bcrespy/creenv-boilerplate#creenv-the-creative-environment for more informations on how to use Creenv"));
  console.log("\n\n");
}


/**
 * Creates a folder if it doesn't exist and prints informations
 * about the process
 * 
 * @param {string} folder the folder to create
 */
function createFolder (folder) {
  return new Promise(function (resolve, reject) {
    console.log("creating folder "+chalk.bold(folder));
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
      // folder was created
      console.log(chalk.bold.green("folder created"));
      separation();
      resolve();
    } else {
      console.log(chalk.bold.red("folder "+chalk.italic(folder)+" already exists, installation needs an empty folder."));
      answer = readline.question("Do you want to empty the folder "+chalk.italic(folder)+" ? (y/n) ");
      if (answer === "yes" || answer === "y" || answer === "YES" || answer === "Y") {
        rimraf(folder, function (error) {
          createFolder(folder).then(resolve);
        });
      } else {
        console.log(chalk.bold.red("\naborting installation\n\n"));
      }
    }
  });
}


/**
 * Clone the creenv boilerplate repository into the destination 
 * folder. 
 * 
 * @param {string} distFolder the folder in which to clone
 * @param {string} repo url to the distant repo 
 * 
 * @return {Promise} resolve when repo is cloned
 */
function getRepo (distFolder, repo) {
  return new Promise(function (resolve, reject) {
    console.log("fetching the repo");
    load(true);
    git.clone(repo, distFolder, null, function (arg) {
      load(false);
      if (arg === null) {
        resolve();
      } else {
        reject();
      }
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
    console.log("installing node modules");
    load(true);
    process.chdir(dest);
    var child = exec('npm install',
    function (error, stdout, stderr) {
      process.chdir("../");
      load(false);
      if (error !== null) {
        console.log(chalk.red(stderr));
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
    rimraf('.git', function (error) {
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
 * 
 * @return {Promise} resolves if update is valid 
 */
function updateJson (json, folder) {
  return new Promise(function (resolve, reject) {
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
      resolve();
    });
  });
}

/**
 * Remove all the comments from all the javascript files within the /src folder, recusively 
 * 
 * @param {string} dest the installation destination folder
 * 
 * @return {Promise}
 */
function stripComments (dest) {
  return new Promise( function (resolve, reject) {
    readdir(dest+"/src", function (err, files) {
      files.forEach(function (file) {
        let content = fs.readFileSync(file, "utf8");
        let replaced = uncomment(content);
        fs.writeFileSync(file, replaced, { flag: "w" })
      });
      resolve();
    });
  });
}


program
  .version(package.version)
  .arguments('<dest>')
  .option('-m, --mode <mode>', 'the type of project you want to install default|demo|light')
  .option('-n, --nocomment', 'remove all the comments within the js files')
  .option('-v, --version', 'display the current version of the cli')
  .action(function (dest, cmd) {
    if (dest === undefined) dest = DEFAULT_FOLDER;
    
    // if mode as argument, repo matches the mode 
    let repo = REPOS[cmd.mode] !== undefined ? REPOS[cmd.mode] : REPOS["default"];

    startInfos();
    createFolder(dest).then(function(){
      getRepo(dest, repo).then(function(){
        console.log(chalk.bold.green("repo was sucessfully cloned"));
        separation();
  
        install(dest).then(function(){
          console.log(chalk.bold.green("npm install done, node modules were installed"));
    
          removeGitRepo().then(function (ret) {
            if (ret != 0 ) {
              console.log(chalk.bold.red("could not remove the git repository from the folder. you can either do so manually change the remote\n\n"));
            } else {
              console.log(chalk.bold.green("git repo was removed"));
            }
            separation();
    
            // loads the json file 
            var packageJSON = require(process.cwd()+"/"+dest+"/package.json");
            
            // updates the package.json of the destination folder 
            updateJson(packageJSON, dest).then(function () {
              separation();

              // if asked, we remove the comments from the /src folder 
              if (cmd.nocomment) {
                stripComments(dest).then(function () {
                  console.log(chalk.bold.green("\n\nyour project is ready to be used. have a good time :)\n\n"));
                  onInstallationCompleted();
                });
              } else {
                console.log(chalk.bold.green("\n\nyour project is ready to be used. have a good time :)\n\n"));
                onInstallationCompleted();
              }
            }).catch(function (error) {
              console.log(chalk.bold.red("\n\ncould not write the package.json, check it if you want to update it"));
            });
          });
        }).catch(function (error) {
          console.log(chalk.bold.red("installation failed. the project is still in its early development so please report the conditions in which this error occured, thanks :)"))
          console.log("\n\n"+error+"\n\n");
        });

      }).catch(function() {
        console.log(chalk.bold.red("could not clone the repo. check if your internet is on, if it is please report this bug :)"))
      })
    });
  });

program.parse(process.argv);

