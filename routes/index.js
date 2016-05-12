var express = require('express');
var router = express.Router();
var fs = require('fs');
var os = require('os');
var child_process = require('child_process');
var randomstring = require("randomstring");
var http = require('http');
var extract = require('extract-zip');
var statePath = os.homedir() + '/PCVPiWizard/state.json';

/* GET home page. */
router.get('/', function(req, res, next) {
  var state = require(statePath);

  if(state.state == 'initial')
    res.render('index');
  else
    res.render('progress');
});

router.post('/', function(req, res){
  var state = require(statePath);
  var showIndex = true;
  if(state.state == 'initial') {
    if (req.body.rootpassword != ""
        && req.body.password != ""
        && req.body.username != "") {

      if(req.body.rootpassword == req.body.rootpasswordConfirm
          && req.body.password == req.body.passwordConfirm){
        showIndex = false;
        res.render('progress');

        state.state = 'clone';

        fs.writeFile(statePath, JSON.stringify(state), {flag: 'w'}, function (err) {
          if (err) return console.log(err);
        });

        var rootpassword = req.body.rootpassword.replace('"', '\\"');
        rootpassword = rootpassword.replace(' ', '\\ ');

        child_process.exec('echo "pi:'+rootpassword+'" | sudo chpasswd', function (error, stdout, stderr) {});

        var daemonPath = os.homedir() + '/CryptoBullion-CBX';
        var walletPath = os.homedir() + '/PersonalCloudVault';

        child_process.exec("cd "+daemonPath+" && git pull", function (error, stdout, stderr) {
          console.log(error);
          console.log(stdout);
          console.log(stderr);

          child_process.exec("cd "+walletPath+" && git pull && npm update", function (error, stdout, stderr) {
            console.log(error);
            console.log(stdout);
            console.log(stderr);

            // Set up the wallet
            var users = {};
            var daemonStatus = {};
            var book = {};

            daemonStatus.status = 'update';
            users[req.body.username] = {
              'password': req.body.password,
              'id': 1
            };

            var daemonConfig = require(walletPath+'/configs/daemon.example.json');
            daemonConfig.port = randomInt(5000, 15000);
            daemonConfig.user = randomstring.generate(7)
            daemonConfig.password = randomstring.generate(40);

            fs.writeFile(walletPath+'/db/users.json', JSON.stringify(users), {flag: 'w'}, function (err) {
              if (err) return console.log(err);
            });

            fs.writeFile(walletPath+'/db/status.json', JSON.stringify(daemonStatus), {flag: 'w'}, function (err) {
              if (err) return console.log(err);
            });

            fs.writeFile(walletPath+'/db/book.json', JSON.stringify(book), {flag: 'w'}, function (err) {
              if (err) return console.log(err);
            });

            fs.writeFile(walletPath+'/configs/daemon.json', JSON.stringify(daemonConfig), {flag: 'w'}, function (err) {
              if (err) return console.log(err);
            });

            child_process.exec("mkdir "+os.homedir()+"/.CryptoBullion", function (error, stdout, stderr) { // it's Inception really
              var cryptoBullionConf  = "rpcuser="+daemonConfig.user+"\n";
              cryptoBullionConf += "rpcpassword="+daemonConfig.password+"\n";
              cryptoBullionConf += "rpcport="+daemonConfig.port+"\n";
              cryptoBullionConf += "rpcallowip=127.0.0.1\n";
              cryptoBullionConf += "rpcallowconnect=127.0.0.1\n";

              fs.writeFile(os.homedir()+"/.CryptoBullion/CryptoBullion.conf", cryptoBullionConf, {flag: 'w'}, function (err) {
                state.state = 'bootstrap';
                fs.writeFile(statePath, JSON.stringify(state), {flag: 'w'}, function (err) {
                  if (err) return console.log(err);
                });

                var bootstrap = fs.createWriteStream("bootstrap.zip");

                var options = {
                  host: 'cryptobullion.io',
                  port: 80,
                  path: '/bootstrap.zip'
                };

                http.get(options, function(res) {
                  res.on('data', function(data) {
                    bootstrap.write(data);
                  }).on('end', function() {
                    bootstrap.end();

                    extract("bootstrap.zip", {dir: os.homedir()+"/.CryptoBullion"}, function (err) {
                      child_process.exec("sudo mv "+walletPath+"/startup.sh "+os.homedir()+"/startup.sh && sudo chmod +x "+os.homedir()+"/startup.sh", function (error, stdout, stderr) {
                        state.state = 'done';
                        fs.writeFile(statePath, JSON.stringify(state), {flag: 'w'}, function (err) {
                          if (err) return console.log(err);
                        });

                        child_process.exec('sudo reboot', function (error, stdout, stderr) {
                        });
                      });
                    });;
                  });
                });


              });
            });

          });
        });

      }
    }

    if(showIndex)
      res.render('index');
  }
});

function randomInt (low, high) {
  return Math.floor(Math.random() * (high - low) + low);
}

module.exports = router;
