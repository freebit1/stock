var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    console.log('1111');
    //res.redirect('stock', { title: 'Express' });  // views/auth login.ejs로 보냄
    //res.redirect(`/api/stock/stocknews/vz`); 
    res.render('stock');
});

router.get('/about', function(req, res, next) {
  res.render('pages/about', { title: 'Express' });
});

// NOTE: 로그인페이지
router.get('/auth/login', function(req, res, next) {
  res.render('auth/login', { title: 'Express' });  // views/auth login.ejs로 보냄
  
});


/*
// NOTE: 로그아웃
router.get('/auth/logout', function(req, res, next) {
  console.log('render logout session:' + req.session)
  res.render('auth/logout', { title: 'Express' }); 
  
});
*/


module.exports = router;
