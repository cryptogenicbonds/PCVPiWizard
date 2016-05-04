/**
 * Created by msi on 04-05-16.
 */
var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.send("ok"+req.query.ip);
});

module.exports = router;