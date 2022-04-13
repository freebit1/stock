var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
//스웨거 적용
const { swaggerUi, specs } = require('./config/swagger');
//const MemoryStore = require("memorystore")(session);
var cors = require("cors");
var app = express();





var indexRouter = require('./routes/render/index');
//var usersRouter = require('./routes/render/users');
//var apiUsersRouter = require('./routes/apis/users');
//var apIndexRouter = require('./routes/apis/index');
//var apIboardRouter = require('./routes/apis/board');
var apIStockRouter = require('./routes/apis/stock');
//var queryRouter = require('./query/query');
//var apIauthRouter = require('./routes/apis/auth');
//var mysqlRouter = require('./routes/apis/mysql');

// view engine setup
app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'ejs');





app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//스웨거
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));


//app.use(apIStockRouter));

app.use('/', cors(indexRouter));  //서버 가동시 왜 render index.js의 /경로로 이동하는지 확인
//app.use('/users', usersRouter);
//app.use('/api/users', apiUsersRouter);
//app.use('/api', apIndexRouter);
//app.use('/api/board', apIboardRouter);
app.use('/api/stock', cors(apIStockRouter));
//app.use('/query', queryRouter);
//app.use('/api/auth', apIauthRouter);
//app.use('/api/mysql', mysqlRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});



module.exports = app;
