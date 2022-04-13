var express = require('express');
var router = express.Router();
var msgBoardQuery = require('../../query/query.js');
var msgBoardUtil = require('../../util/util.js');
const pool = require("../../util/db");
//var mysql = require('mysql');  // db 폴더를 만들어서 conn 과 info 를 만들어 코드의 길이를 최대한줄일수도있다고한다
//const puppeteer = require("puppeteer"); //크롤링

//크롤링
const axios = require("axios");
const cheerio = require("cheerio");
const request = require("request");
const iconv = require("iconv-lite");  // 2022.04.03

const xlsxFile = require('read-excel-file/node');

//import { logger } from './config/winston';
// var logger = require('../../config/winston');
const { closeDelimiter } = require('ejs');

//env설정
const env = require('dotenv');
env.config();


/*
//mysql 연동소스
const mysql = require('mysql');
const PoolConfig = require('mysql/lib/PoolConfig');
//const { request } = require('../../app.js');
const { get } = require('express/lib/response');
const { response } = require('../../app.js');
const conn = {
    host: 'localhost',
    port: '3306',
    user: 'cjk',
    password: 'root',
    database: 'msgboard',
    connectionLimit : 10
};


var connection = mysql.createConnection(conn); //DB커넥션 생성
connection.connect();
*/



//************미국주식 api START************************

//etf업데이트
router.get('/etfUpdate/:stock',  async function(req, res){
    console.log('etf 업데이트');
    try {
        var { num } = req.params; // :num 로 맵핑할 req 값을 가져온다
        const conn = await pool.awaitGetConnection();
        const yahooFinance = require('yahoo-finance2').default;
        const { stock } = req.params;
        
        if(stock === null || stock === '' || stock === undefined ){
            console.log('그냥들어옴');
            res.render('stock', {title : '주식정보'}); // list:rows[0]도 가능 대신 ejs에서 그냥받아올수있다
        } else {
            
            
            const result = await yahooFinance.quoteSummary(stock);//   quote('T');
            const result2 = await yahooFinance.quote(stock);//   quote('T');
         
            var ticker = result2.symbol;    //심볼
            var name = result2.displayName; //종목명
            var targetPrice = '';
            if(result.price.targetPrice === undefined){
                targetPrice = '';
            } else{
                targetPrice = result.price.targetPrice;
            } 
            
            var currentPrice = result.price.postMarketPrice; //현재주가
            var input = [ticker, name, currentPrice , targetPrice
                        ,ticker, name, currentPrice , targetPrice];
            

            //주식정보 입력
            console.log('ETF 테이블 인서트');
            const sql =  msgBoardQuery.insertEtfStock();
            await conn.awaitQuery(sql, input);
            
            await conn.release();
            res.json('ETF 업데이트 완료');
            //res.redirect('/api/board/list'); 
            //res.render('stock', {title : '주식정보', result:data}); // list:rows[0]도 가능 대신 ejs에서 그냥받아올수있다
        }

    } catch (error) {
        console.log(error);
        res.json({
            error: error.message
        })
    } finally {
        console.log('미국ETF업데이트 실행 finally');
    }
});


//ETF 주식정보 조회
router.get('/etfSelect/:stock',  async function(req, res){
    try {
        
        /**
         * var conn = await pool.awaitGetConnection();
            const { stock } = req.params;
            console.log('stock 조회: ' + stock);
        
            var sql = 'select * from stock where ticker = ?;';
            var stockData = await conn.awaitQuery(sql, [stock]);
        
            var sql2 = 'select * from stockdetail where ticker = ?;';
            var stockData2 = await conn.awaitQuery(sql2, [stock]);
         */
            var conn = await pool.awaitGetConnection();
            const { stock } = req.params;
            console.log('etf 조회: ' + stock);
        
            var sql = msgBoardQuery.selectStock() ;
            
            var stockData = await conn.awaitQuery(sql, [stock]);
            
            var result = {stockData:stockData, 
                         };
        
            console.log('주식데이터?? : ' + result.stockData.length);
            conn.release();

            if(result.stockData.length === 0){
                throw new Error('보낼 데이터 없음')
                
            }
            res.json(result);

        } catch (error) {
        console.log(error);
        res.json({
            error: error.message
        })
    } finally {
        console.log('미국etf조회 실행 finally');
    }
})


/**
 * @swagger
 * /api/stock/abroadStockUpdate/{stock}:
 *   
 *   get:
 *     description: 미국주식 리스트 업데이트
 *     summary: "미국주식 리스트 업데이트"
 *     tags: [Post]
 *     produces:
 *     - "application/json"
 *     parameters:
 *      - in: path
 *        name: stock
 *        required: true
 *        description: 주식티커
 *        schema:
 *          type: string
 *     responses:
 *       "200":
 *         description: "successful operation"
 *     
*/
//미국주식정보 리스트 업데이트
//router.get('/stockMenu/:stock', isLogged, async function(req, res, next){
router.get('/abroadStockUpdate/:stock',  async function(req, res){
    
    console.log('업데이트 들어옴');
    //logger.info('주식 기본정보만 전체적으로 업데이트 처리');
    try {
        
        
        var { num } = req.params; // :num 로 맵핑할 req 값을 가져온다
        const conn = await pool.awaitGetConnection();
        const yahooFinance = require('yahoo-finance2').default;
        const { stock } = req.params;
        
        if(stock === null || stock === '' || stock === undefined ){
            console.log('그냥들어옴');
            res.render('stock', {title : '주식정보'}); // list:rows[0]도 가능 대신 ejs에서 그냥받아올수있다
        } else {
            //미국 주식티커 리스트 가지고 옮
            var code = [];
            await xlsxFile('../../지광업무진행/quick_aboard_api_serve/file/nyse.xlsx').then((rows) => {
                for(i in rows){
                    code[i] = rows[i][0];
                }
                console.log('전체리스트수: ' + rows.length);
            });
            
            var result; 
            var result2;
            var result3;
            var result4;
            var result5;
            var updateTickerList = []; 
            var cnt = 1;
            for(var tickerCnt=1 ; tickerCnt<=code.length; tickerCnt++){
                
                //야후파이낸스 미국주식 정보 조회 api
                if(tickerCnt % 500 != 0){ //500개씩 저장
                    updateTickerList[cnt] = `${code[tickerCnt]}`;
                    cnt ++;
                    
                    if(tickerCnt != code.length){
                        continue; //api 조회전 티커리스트 저장
                    }
                }

                
                console.log('aa: ' + updateTickerList);
                //console.log('중간: ' + updateTickerList);
                //console.log('비교: '  +updateTickerList2);
                
                //미국주식 정보 api 진행
                try {
                    console.log('순서:  ' + tickerCnt + '  저장리스트: ' + updateTickerList.length);
                    result = await yahooFinance.quote(updateTickerList);// 리스트로 저장가능한 api function
                    //result = await yahooFinance.quoteSummary(['VZ']);
                    
                } catch (error) {
                    console.log('야후 파이낸스 미국주식정보 조회 에러 '+ tickerCnt);
                    continue;    
                }
                
                var ticker;         //티커
                var name;           //종목명
                var targetPrice;    //목표가
                var currentPrice;   //현재가
                var trailingPE;     //PER
                var priceToBook;    //PBR
                var epsTrailingTwelveMonths;    //EPS
                
                
                
                //미국주식 정보 추출
                for(var i=0; i<result.length; i++){
                
                    if(result[i].symbol === undefined || result[i].symbol === null){
                        continue; //심볼이 없으면 저장 안한다.
                    }
                    ticker = result[i].symbol;    //심볼

                    if(result[i].displayName === undefined){ //종목명
                        name = ''; 
                    } else {
                        name = result[i].displayName;
                    }

                    if(result[i].fiftyDayAverage === undefined){ //목표가
                        targetPrice = '';
                    } else {
                        targetPrice = result[i].fiftyDayAverage;
                    } 
                    
                    if(result[i].regularMarketPrice === undefined){ //현재가
                        currentPrice = '';
                    } else {
                        currentPrice = result[i].regularMarketPrice;
                    } 
                    
                    if(result[i].trailingPE === undefined){ //PER (주가/주당순이익)
                        trailingPE = ''; 
                    } else {
                        trailingPE = result[i].trailingPE;
                    } 
                    
                    if(result[i].priceToBook === undefined){ //PBR (시가총액 / 기업순자산)
                        priceToBook = '';
                    } else {
                        priceToBook = result[i].priceToBook;
                    }

                    if(result[i].epsTrailingTwelveMonths === undefined){ //EPS (당기순이익 / 총주식수)
                        epsTrailingTwelveMonths = '';
                    } else {
                        epsTrailingTwelveMonths = result[i].epsTrailingTwelveMonths;
                    }

                    //ROE
                    //ROI

                    
                    var input = [ticker, name, currentPrice , targetPrice, trailingPE, priceToBook,epsTrailingTwelveMonths
                                ,ticker, name, currentPrice , targetPrice, trailingPE, priceToBook,epsTrailingTwelveMonths];
                    
                    //주식정보 insert
                    console.log(i)
                    const sql =  msgBoardQuery.insertStock();
                    await conn.awaitQuery(sql, input);
    
                }

                updateTickerList = []; //초기화
                cnt = 1;
                
                /*
                const results = await yahooFinance.quote(['AAPL', 'NO_SUCH_SYMBOL', 'GOOGL']);
                const result = { AAPL: result[0], GOOGL: result[1]  };
                
                
                continue; //test
                */
                /*
                //야후 파이낸스 재무상태표, 현금흐름표, 손익계산서 api조회
                try {
                    result3 = await yahooFinance.quoteSummary(updateTickerList, { modules: [ "balanceSheetHistoryQuarterly" ] });  //재무상태표
                    result4 = await yahooFinance.quoteSummary(updateTickerList, { modules: [ "cashflowStatementHistoryQuarterly" ] }); //현금흐름표
                    result5 = await yahooFinance.quoteSummary(updateTickerList, { modules: [ "incomeStatementHistoryQuarterly" ] });  //손익계산서
                } catch (error) {
                    console.log('야후파이낸스 재무정보 에러: ' + tickerCnt);
                    continue;
                }
                var balTotalAssets = [];
                var cashNetIncome = [];
                var totalRevenue = [];
                
                const sql2 = msgBoardQuery.insertStockDetail();
                for(var i=0; i<result3.balanceSheetHistoryQuarterly.balanceSheetStatements.length; i++){  
                    balTotalAssets[i] = result3.balanceSheetHistoryQuarterly.balanceSheetStatements[i].totalCurrentAssets;
                    cashNetIncome[i] = result4.cashflowStatementHistoryQuarterly.cashflowStatements[i].cashNetIncome;
                    totalRevenue[i] = result5.incomeStatementHistoryQuarterly.incomeStatementHistory[i].totalRevenue;

                    //연도 및 분기 추출
                    const quarterDate = new Date(result3.balanceSheetHistoryQuarterly.balanceSheetStatements[i].endDate);
                    var quarter = quarterDate.toDateString().substring(4,7);
                    if(quarter === 'Mar'){ //1분기
                        quarter = 1;
                    } else if(quarter === 'Jun') { //2분기
                        quarter = 2;
                    } else if(quarter === 'Sep') { //3분기
                        quarter = 3;
                    } else if(quarter === 'Dec') { //4분기
                        quarter = 4;
                    }
                    

                    var year = quarterDate.toDateString().substring(11,15) //string 안잘림 

                    //재무제표 데이터 추출
                    if(balTotalAssets[i] == undefined ){
                        balTotalAssets[i] = ''
                    } 
                    if(cashNetIncome[i] == undefined ){
                        cashNetIncome[i] = ''
                    } 
                    if(totalRevenue[i] == undefined ){
                        totalRevenue[i] = ''
                    } 
                    
                    var input = [ticker, year, quarter , balTotalAssets[i], cashNetIncome[i], totalRevenue[i]
                                ,ticker, year, quarter , balTotalAssets[i], cashNetIncome[i], totalRevenue[i]];
                    console.log('순서: ' + i + '   ' + input);
                    await conn.awaitQuery(sql2, input);
                
                }//for문 끝

                */

                //res.redirect('/api/board/list'); 
                //res.render('stock', {title : '주식정보', result:data}); // list:rows[0]도 가능 대신 ejs에서 그냥받아올수있다
            }//for문 끝
            await conn.release();
            res.json('업데이트 완료');
                
        }

    } catch (error) {
        console.log(error);
        res.json({
            error: error.message
        })
    } finally {
        console.log('미국주식업데이트 실행 finally');
    }
});


/////////////////미국주식 전체라우터 조회 start/////////////////////


//finviz뉴스 조회
async function searchNews(req, res){
    const { stock } = req.params;   
    const getHTML = async(keyword) => { 
        try{
            return await axios.get("https://finviz.com/quote.ashx?t=" + encodeURI(keyword)) //finviz
            //return await axios.get("https://finance.yahoo.com/quote/" +  encodeURI(keyword)  + "/news?p=" + encodeURI(keyword)) //""안에는 URL 삽입 
            //return await axios.get("https://search.naver.com/search.naver?where=news&ie=UTF-8&query=" + encodeURI(keyword)) //""안에는 URL 삽입 
        }catch(err) { 
            console.log(err); 
        } 
    } // 파싱 함수 

    let informations = [];
    let parsing = async (keyword) => { 
        const html = await getHTML(keyword) 
        const $ = cheerio.load(html.data);// 가지고 오는 data load 
        //const $titlist = $(".news_area"); 
        //const $titlist = $("#main_pack > section.sc_new.sp_nnews._prs_nws > div > div.group_news > ul").children("li.bx");
        const $yahooNewsList = $("#news-table > tbody").children("tr");
               
        
        $yahooNewsList.each(function(i, elem){
            informations[i] = {
                //link : $(this).find("div.news_wrap.api_ani_send > a.dsc_thumb").attr('href')
                //link : $(this).find(`div > div.Cf > div.Ov\\(h\\).Pend\\(44px\\).Pstart\\(25px\\) > h3 > a.js-content-viewer`).attr('href')
                link : $(this).find("td:nth-child(2) > div > div.news-link-left > a.tab-link-news").attr('href')
            }
        })
    } 
    
    
    await parsing(stock); // 검색어 await붙이고 나니 informations에 정보 담아서 보냄
    
    return informations;
    
}



//미국주식 정보 조회
async function directAbroadStockSelect(req, res){
    console.log('미국주식 전체라우터 조회 시작');
    //logger.info('실시간 테스트!');
    
    try {
        
        var { num } = req.params; // :num 로 맵핑할 req 값을 가져온다
        const conn = await pool.awaitGetConnection();
        await conn.beginTransaction() // 트랜잭션 적용 시작
        const yahooFinance = require('yahoo-finance2').default;
        const { stock } = req.params;
        
        if(stock === null || stock === '' || stock === undefined ){
            console.log('그냥들어옴');
            res.json('티커를 정확히 입력하십시오: ' + stock);
            //res.render('stock', {title : '주식정보'}); // list:rows[0]도 가능 대신 ejs에서 그냥받아올수있다
        } else {
            
            //테이블에 저장되어 있는 데이터 조회
            var stockData = await conn.awaitQuery(msgBoardQuery.selectStock(), [stock]);
            var stockData2 = await conn.awaitQuery(msgBoardQuery.selectStockDetail(), [stock]);
            
            var stockInfo = {stockData:stockData, stockDataDetail:stockData2};
        
            if(stockData.length != 0){ //테이블에 데이터가 존재하면
                var diff = await conn.awaitQuery(msgBoardQuery.selectDiffTime(), stockData[0].lstDate);  //저장된 시간과 현재시간의 차이가 60분이 넘으면 새로운 데이터 insert후 조회해서 리턴해준다
                console.log('시간차이 확인: ' + diff[0].diff);
                if(diff[0].diff < 60){ //저장한 시간이 60분 미만이면 조회한 데이터 리턴해주고 종료
                    console.log('테이블에서 조회된 데이터 전달 완료');
                    
                    //res.json(stockInfo);

                    return stockInfo;
                }
            }
            
            //미국주식 업데이트 진행후 리턴 start

            var result; 
            var result2;
            var result3;
            var result4;
            var result5;
            
            //야후파이낸스 미국주식 정보 조회 api
            try {
                result = await yahooFinance.quote(stock);// 리스트로 저장가능한 api function
                result2 = await yahooFinance.quoteSummary(stock);
            } catch (error) {
                console.log('야후 파이낸스 미국주식정보 api 조회 에러 ');
                throw new Error('야후 파이낸스 미국주식정보 api  조회 에러');
            }
            
            var ticker;         //티커
            var name;           //종목명
            var targetPrice;    //목표가
            var currentPrice;   //현재가
            var trailingPE;     //PER
            var priceToBook;    //PBR
            var epsTrailingTwelveMonths;    //EPS
            var exchangeName;   //거래소명 (ex: nasdaq)
            
            
            //미국주식 정보 추출
            if(result.symbol === undefined || result.symbol === null){
                return; //심볼이 없으면 저장 안한다.
            }
            ticker = result.symbol;    //심볼

            if(result.displayName === undefined){ //종목명
                name = ''; 
            } else {
                name = result.displayName;
            }

            if(result.fiftyDayAverage === undefined){ //목표가
                targetPrice = '';
            } else {
                targetPrice = result.fiftyDayAverage;
            } 
            
            if(result.regularMarketPrice === undefined){ //현재가
                currentPrice = '';
            } else {
                currentPrice = result.regularMarketPrice;
            } 
            
            if(result.trailingPE === undefined){ //PER (주가/주당순이익)
                trailingPE = ''; 
            } else {
                trailingPE = result.trailingPE;
            } 
            
            if(result.priceToBook === undefined){ //PBR (시가총액 / 기업순자산)
                priceToBook = '';
            } else {
                priceToBook = result.priceToBook;
            }

            if(result.epsTrailingTwelveMonths === undefined){ //EPS (당기순이익 / 총주식수)
                epsTrailingTwelveMonths = '';
            } else {
                epsTrailingTwelveMonths = result.epsTrailingTwelveMonths;
            }

            //ROE
            //ROI
            
            if(result2.price.exchangeName === undefined){ //거래소
                exchangeName = '';
            } else {
                exchangeName = result2.price.exchangeName;
            }

            var input = [ticker, name, currentPrice , targetPrice, trailingPE, priceToBook,epsTrailingTwelveMonths, exchangeName
                        ,ticker, name, currentPrice , targetPrice, trailingPE, priceToBook,epsTrailingTwelveMonths, exchangeName];
            
            //주식정보 insert
            //logger.info('미국주식 정보 입력: ' + input);
            console.log('미국주식 정보 입력: ' + input);
            const sql =  msgBoardQuery.insertApiStock();

            
            await conn.awaitQuery(sql, input); //쿼리 파라미터 맵핑된 쿼리 로그 보는법?
            
            //야후 파이낸스 손익계산서, 재무상태표, 현금흐름표  api조회
            try {
                result3 = await yahooFinance.quoteSummary(stock, { modules: [ "incomeStatementHistoryQuarterly" ] });  //손익계산서
                result4 = await yahooFinance.quoteSummary(stock, { modules: [ "balanceSheetHistoryQuarterly" ] });  //재무상태표
                result5 = await yahooFinance.quoteSummary(stock, { modules: [ "cashflowStatementHistoryQuarterly" ] }); //현금흐름표
                
            } catch (error) {
                console.log('야후 파이낸스 재무정보 api 조회 에러 ');
                throw new Error('야후 파이낸스 재무정보 api  조회 에러');
            }
            

            //손익계산서
            var totalRevenue = []; //총수입
            var netIncome = []; //순수익
            var costOfRevenue = []; //매출원가


            //재무상태표
            var totalAssets = []; //총자산
            var totalCurrentAssets = []; //유동자산
            var totalCurrentLiabilities = [];//유동부채
            var totalLiab = []; //부채총계
            
            //현금흐름표
            var totalCashFromOperatingActivities = []; //영업현금흐름 
            var totalCashflowsFromInvestingActivities = []; //투자현금흐름
            var totalCashFromFinancingActivities = []; //재무현금흐름 
            
            
            for(var i=0; i<result3.incomeStatementHistoryQuarterly.incomeStatementHistory.length; i++){  
                
                //손익계산서
                totalRevenue[i] = result3.incomeStatementHistoryQuarterly.incomeStatementHistory[i].totalRevenue;
                netIncome[i] = result3.incomeStatementHistoryQuarterly.incomeStatementHistory[i].netIncome;
                costOfRevenue[i] = result3.incomeStatementHistoryQuarterly.incomeStatementHistory[i].costOfRevenue;
                
                //재무상태표
                totalAssets[i] = result4.balanceSheetHistoryQuarterly.balanceSheetStatements[i].totalAssets;
                totalCurrentAssets[i] = result4.balanceSheetHistoryQuarterly.balanceSheetStatements[i].totalCurrentAssets;
                totalCurrentLiabilities[i] = result4.balanceSheetHistoryQuarterly.balanceSheetStatements[i].totalCurrentLiabilities;
                totalLiab[i] = result4.balanceSheetHistoryQuarterly.balanceSheetStatements[i].totalLiab;
                
                //현금흐름표
                totalCashFromOperatingActivities[i] = result5.cashflowStatementHistoryQuarterly.cashflowStatements[i].totalCashFromOperatingActivities;
                totalCashflowsFromInvestingActivities[i] = result5.cashflowStatementHistoryQuarterly.cashflowStatements[i].totalCashflowsFromInvestingActivities;
                totalCashFromFinancingActivities[i] = result5.cashflowStatementHistoryQuarterly.cashflowStatements[i].totalCashFromFinancingActivities;
                

                //연도 및 분기 추출
                const quarterDate = new Date(result4.balanceSheetHistoryQuarterly.balanceSheetStatements[i].endDate);
                var quarter = quarterDate.toDateString().substring(4,7);
                if(quarter === 'Mar'){ //1분기
                    quarter = 1;
                } else if(quarter === 'Jun') { //2분기
                    quarter = 2;
                } else if(quarter === 'Sep') { //3분기
                    quarter = 3;
                } else if(quarter === 'Dec') { //4분기
                    quarter = 4;
                }
                

                var year = quarterDate.toDateString().substring(11,15) //string 안잘림 

                //재무제표 데이터 유무 확인
                if(totalRevenue[i] == undefined ){
                    totalRevenue[i] = ''
                } 
                if(netIncome[i] == undefined ){
                    netIncome[i] = ''
                } 
                if(costOfRevenue[i] == undefined ){
                    costOfRevenue[i] = ''
                } 
                
                if(totalAssets[i] == undefined ){
                    totalAssets[i] = ''
                } 
                if(totalCurrentAssets[i] == undefined ){
                    totalCurrentAssets[i] = ''
                } 
                if(totalCurrentLiabilities[i] == undefined ){
                    totalCurrentLiabilities[i] = ''
                } 
                if(totalLiab[i] == undefined ){
                    totalLiab[i] = ''
                } 

                if(totalCashFromOperatingActivities[i] == undefined ){
                    totalCashFromOperatingActivities[i] = ''
                } 
                if(totalCashflowsFromInvestingActivities[i] == undefined ){
                    totalCashflowsFromInvestingActivities[i] = ''
                } 
                if(totalCashFromFinancingActivities[i] == undefined ){
                    totalCashFromFinancingActivities[i] = ''
                } 
                


                var input = [ticker, year, quarter , totalRevenue[i], netIncome[i], costOfRevenue[i], 
                             totalAssets[i], totalCurrentAssets[i], totalCurrentLiabilities[i], totalLiab[i],
                             totalCashFromOperatingActivities[i], totalCashflowsFromInvestingActivities[i], totalCashFromFinancingActivities[i],

                             ticker, year, quarter , totalRevenue[i], netIncome[i], costOfRevenue[i],
                             totalAssets[i], totalCurrentAssets[i], totalCurrentLiabilities[i], totalLiab[i],
                             totalCashFromOperatingActivities[i], totalCashflowsFromInvestingActivities[i], totalCashFromFinancingActivities[i],
                            ];
                            
                
                //logger.info('미국주식 재무정보 입력: ' + input);
                console.log('미국주식 재무정보 입력: ' + input);
                await conn.awaitQuery(msgBoardQuery.insertApiStockDetail(), input);
                
            }//for문 끝

            //미국주식 실시간 업데이트 후 데이터 조회
            var stockData = await conn.awaitQuery(msgBoardQuery.selectStock(), [stock]);
            var stockData2 = await conn.awaitQuery(msgBoardQuery.selectStockDetail(), [stock]);
            
            if(stockData.length === 0){ //테이블에 데이터가 존재하지 않으면
                throw new Error('실시간 미국주식 데이터 리턴전 오류')
            }
            
            await conn.commit();//커밋
            await conn.release();
            
            console.log('미국주식 업데이트 후 리턴');
            stockInfo = {stockData:stockData, stockDataDetail:stockData2};//미국주식 실시간 업데이트 후 리턴
            //res.json(stockInfo);
            return stockInfo;
            //미국주식 업데이트 진행후 리턴 end
        }

    } catch (error) {
        console.log(error);
        console.log('에러 발생');
        await conn.rollback();//롤백
        await conn.release();
        res.json({
            error: error.message
        })
        return error.message;

    } finally {
        console.log('야후 api 미국주식조회 실행 finally');
    }
}

//배당 밸류에이션 정보
async function selectDividend(req, res){
    console.log('배당정보 진행');
    try {
        
        const conn = await pool.awaitGetConnection();
        await conn.beginTransaction() // 트랜잭션 적용 시작
        const yahooFinance = require('yahoo-finance2').default;
        var { stock } = req.params;
        var { startDate } = req.params;
        
        if(startDate == undefined || startDate == null){
            startDate = '2022-01-01';
        }
        console.log('주식종목: ' + stock.replace(':', '') + "  startDate:  "  +startDate);    
        

        const symbol = stock.replace(':', ''); // 파라미터 ':'제외
        const queryOptions = { period1: startDate, /* ... */ };
        
        //종목별 배당정보(기업 배당 정보, 배당 수익율), 벨류에이션 지표 API
        var stockData = await conn.awaitQuery(msgBoardQuery.selectDividend(), symbol);
                
        if(stockData.length != 0){ //테이블에 데이터가 존재하면
            var diff = await conn.awaitQuery(msgBoardQuery.selectDiffTime(), stockData[0].lstDate);  //저장된 시간과 현재시간의 차이가 60분이 넘으면 새로운 데이터 insert후 조회해서 리턴해준다
            console.log('시간차이 확인: ' + diff[0].diff);
            if(diff[0].diff < 60){ //저장한 시간이 60분 미만이면 조회한 데이터 리턴해주고 종료
                console.log('테이블에서 조회된 되이터 전달 완료');
                //res.json(stockData);
                return stockData;
            }
        }

        try {
            var result = await yahooFinance._chart(symbol, queryOptions);
            var result2 = await yahooFinance.quoteSummary(symbol, { modules: [ "calendarEvents" ] });
            var result3 = await yahooFinance.quoteSummary(symbol, { modules: [ "defaultKeyStatistics" ] });
            var result4 = await yahooFinance.quoteSummary(symbol, { modules: [ "financialData" ] });
            var result5 = await yahooFinance.quoteCombine(symbol);
        } catch (error) {
            console.log('야후 파이낸스 배당정보 api 조회 에러 ');
            throw new Error('야후 파이낸스 배당정보 api  조회 에러');  
        }
        
        var exDividendDate = result2.calendarEvents.exDividendDate; //배당락일
        var dividendDate = result2.calendarEvents.dividendDate.toDateString; //배당일
        var profitMargins = result3.defaultKeyStatistics.profitMargins;//순이익률
        var priceToBook = result3.defaultKeyStatistics.priceToBook; //pbr
        var operatingMargins = result4.financialData.operatingMargins; //영업이익률
        var returnOnEquity = result4.financialData.returnOnEquity; // ROE
        var returnOnAssets = result4.financialData.returnOnAssets; //ROA
        var trailingAnnualDividendRate = result5.trailingAnnualDividendRate; // 연간배당금
        var trailingAnnualDividendYield = result5.trailingAnnualDividendYield; // 연간배당률


        //연도 및 분기 추출
        var dividendDate = [];//배당일자
        var dividendAmount = [];//배당금
        var dividendRate = [];//배당률
        var dividendInfo = [];//배당정보
        if(result.events.dividends.length > 0){ //배당데이터가 있으면
            for(var i=0 ; i<result.events.dividends.length; i++){
                dividendDate[i] = new Date(result.events.dividends[i].date.toDateString());
                dividendAmount[i] = result.events.dividends[i].amount;
                dividendRate[i] = result.events.dividends[i].amount / result.meta.regularMarketPrice;
                dividendInfo[i] = [ {dividendHistoryDate:dividendDate[i]}, {dividendAmount:dividendAmount[i]}, {dividendRate:dividendRate[i]}];
            }
        }

        //배당 재무정보 insert
        const sql =  msgBoardQuery.insertDividend();
      
        var aa =await conn.awaitQuery(sql, [symbol, exDividendDate, '', returnOnEquity, returnOnAssets, operatingMargins, profitMargins,
                                    symbol, exDividendDate, '', returnOnEquity, returnOnAssets, operatingMargins, profitMargins 
                                    ]); //쿼리 파라미터 맵핑된 쿼리 로그 보는법?
                
        await conn.commit();//롤백
        await conn.release();

        //insert 후 조회
        stockData = await conn.awaitQuery(msgBoardQuery.selectDividend(), symbol);
        //res.json(stockData);           
        return stockData;
    } catch (error) {
        console.log(error);
        console.log('에러 발생');
        await conn.rollback();//롤백
        await conn.release();
        res.json({
            error: error.message
        })
        return error.message;
    } finally {
        console.log('배당,재무정보 조회 완료');
    }
}

//연관섹터 종목리스트
async function selectStockRelatedList(req, res){
    
    console.log('종목정보 - 연관섹터 종목리스트');

    try {
        
        const conn = await pool.awaitGetConnection();
        await conn.beginTransaction() // 트랜잭션 적용 시작
        const yahooFinance = require('yahoo-finance2').default;
        const { stock } = req.params;    
        
        
        //3. 연관 섹터 종목 리스트 API -> 주가 및 간단정보 가지고옮
        var stockData = await conn.awaitQuery(msgBoardQuery.selectStockOhter(), [stock]);
        
        if(stockData.length != 0){ //테이블에 데이터가 존재하면
            var diff = await conn.awaitQuery(msgBoardQuery.selectDiffTime(), stockData[0].lstDate);  //저장된 시간과 현재시간의 차이가 60분이 넘으면 새로운 데이터 insert후 조회해서 리턴해준다
            console.log('시간차이 확인: ' + diff[0].diff);
            if(diff[0].diff < 60){ //저장한 시간이 60분 미만이면 조회한 데이터 리턴해주고 종료
                console.log('테이블에서 조회된 되이터 전달 완료');
                //res.json(stockData);
                return stockData;
            }
        }

        //연관섹터 종목리스트 조회 api
        try {
            const searchSingle = await yahooFinance.recommendationsBySymbol(stock); //
            console.log(searchSingle.recommendedSymbols[0].symbol);
            var list = [];
            var result; //연관주가정보 결과
            if(searchSingle.recommendedSymbols.length > 0){
                for(var i=0 ; i<searchSingle.recommendedSymbols.length; i++){
                    list[i] = searchSingle.recommendedSymbols[i].symbol;
                }
                result = await yahooFinance.quote(list);
            }
        } catch (error) {
            console.log('야후 파이낸스 연관섹터 종목리스트 api 조회 에러 ');
            throw new Error('야후 파이낸스 연관섹터 종목리스트 api  조회 에러');
        }

        var listSymbol = [];
        var listPirce = [];
        if(result.length > 0){
            for(var i=0; i<result.length; i++){
                listSymbol[i] = result[i].symbol;
                listPirce[i] = result[i].regularMarketPrice;
                const sql =  msgBoardQuery.insertStockOther();
                await conn.awaitQuery(sql, [stock, i, listSymbol[i], listPirce[i],
                                            stock, i, listSymbol[i], listPirce[i]]); //쿼리 파라미터 맵핑된 쿼리 로그 보는법?
                                                
            }
        }
        await conn.commit();//커밋
        await conn.release();        

        //연관섹터 종목리스트 insert 후 조회
        stockData = await conn.awaitQuery(msgBoardQuery.selectStockOhter(), [stock]);
        //res.json(stockData);           
        return stockData;
    } catch (error) {
        console.log(error);
        console.log('에러 발생');
        await conn.rollback();//롤백
        await conn.release();
        res.json({
            error: error.message
        })
        return error.message;
    } finally {
        console.log('연관 섹터 리스트 조회 완료');
    }
}

//관련 뉴스 정보
async function selectStockNews(req, res){

    console.log('종목정보 - 연관섹터 종목리스트');
    //4. 연관 섹터 뉴스 API -> 해당조회티커 5개 기사만 가지고 옮
    try {
        
        const conn = await pool.awaitGetConnection();
        await conn.beginTransaction() // 트랜잭션 적용 시작
        const yahooFinance = require('yahoo-finance2').default;
        const { stock } = req.params;    
        
        var stockData = await conn.awaitQuery(msgBoardQuery.selectStockNews(), [stock, 'yahooapi']);
        
        if(stockData.length != 0){ //테이블에 데이터가 존재하면
            var diff = await conn.awaitQuery(msgBoardQuery.selectDiffTime(), stockData[0].lstDate);  //저장된 시간과 현재시간의 차이가 60분이 넘으면 새로운 데이터 insert후 조회해서 리턴해준다
            console.log('시간차이 확인: ' + diff[0].diff);
            if(diff[0].diff < 60){ //저장한 시간이 60분 미만이면 조회한 데이터 리턴해주고 종료
                console.log('테이블에서 조회된 되이터 전달 완료');
                //res.json(stockData);
                return stockData;
            }
        }

        //연관섹터 종목리스트 조회 api
        try {
            var news = await yahooFinance.search(stock, /* queryOptions */);
        
        } catch (error) {
            console.log('야후 파이낸스 뉴스 api 조회 에러 ');
            throw new Error('야후 파이낸스 뉴스  api  조회 에러');
        }

        var title = [];
        var link = [];
        var stocknewscproviderPublishTimeol = [];
        
        if(news.news.length > 0){
            for(var i=0; i<news.news.length; i++){
                title[i] = news.news[i].title;
                link[i] = news.news[i].link;
                stocknewscproviderPublishTimeol[i] = news.news[i].stocknewscproviderPublishTimeol;
                const sql =  msgBoardQuery.insertStockNews();
                await conn.awaitQuery(sql, [stock, 'yahooapi', i, title[i], link[i], stocknewscproviderPublishTimeol[i],
                                            stock, 'yahooapi', i, title[i], link[i], stocknewscproviderPublishTimeol[i]]); //쿼리 파라미터 맵핑된 쿼리 로그 보는법?
                                                
            }
        }
        await conn.commit();//커밋
        await conn.release();        

        //연관섹터 종목리스트 insert 후 조회
        stockData = await conn.awaitQuery(msgBoardQuery.selectStockNews(), [stock]);
        //res.json(stockData);           
        return stockData;           
    } catch (error) {
        console.log(error);
        console.log('에러 발생');
        await conn.rollback();//롤백
        await conn.release();
        res.json({
            error: error.message
        })
        return error.message;
    } finally {
        console.log('연관 뉴스 조회 완료');
    }

    
}


/**
 * @swagger
 * /api/stock/allStockRouter/{stock}:
 *   
 *   get:
 *     description: 미국주식 전체 라우터 조회
 *     summary: "미국주식 전체 라우터 조회"
 *     tags: [Post]
 *     produces:
 *     - "application/json"
 *     parameters:
 *      - in: path
 *        name: stock
 *        required: true
 *        description: 주식티커
 *        schema:
 *          type: string
 *     responses:
 *       "200":
 *         description: "successful operation"
 *     
*/
//미국주식 전체 라우터 조회
router.get('/allStockRouter/:stock',  async function(req, res, next){
    
    var result;

    console.log('promise all 테스트');
    console.time('실행시간');
    // var stockInfo = await directAbroadStockSelect(req, res); //주식정보
    // var devidend = await selectDividend(req, res);  //배당,밸류에이션 정보
    // var relatedSector = await selectStockRelatedList(req, res); //연관섹터 정보리스트
    // var stockNews = await selectStockNews(req, res); //관련정보 리스트
    // var stockInfo; //주식정보
    // var devidend; //배당,밸류에이션 정보
    // var relatedSector; //연관섹터 정보리스트
    // var stockNews; //관련정보 리스트

    var [stockInfo, devidend, relatedSector, stockNews ] = await Promise.all([
        directAbroadStockSelect(req, res), //주식정보
        selectDividend(req, res), //배당,밸류에이션 정보
        selectStockRelatedList(req, res), //연관섹터 정보리스트
        selectStockNews(req, res) //관련정보 리스트
    ]);

    console.timeEnd('실행시간');
    result = {stockInfo:stockInfo, devidend:devidend,
              relatedSector:relatedSector, stockNews:stockNews };//미국주식 실시간 업데이트 후 리턴}
    console.log(result);
    
    res.json(result);
    
    

});


/////////////////미국주식 전체라우터 조회 end/////////////////////



/**
 * @swagger
 * /api/stock/directAbroadStockSelect/{stock}:
 *   
 *   get:
 *     description: 야후api 미국주식정보 조회(단건)
 *     summary: "야후api 미국주식정보 조회(단건)"
 *     tags: [Post]
 *     produces:
 *     - "application/json"
 *     parameters:
 *      - in: path
 *        name: stock
 *        required: true
 *        description: 주식티커
 *        schema:
 *          type: string
 *     responses:
 *       "200":
 *         description: "successful operation"
 *     
*/
//야후api 미국주식 조회(단건)
router.get('/directAbroadStockSelect/:stock',  async function(req, res, next){
    console.log('미국주식 조회 시작');
    //logger.info('실시간 테스트!');
    try {
        
        var { num } = req.params; // :num 로 맵핑할 req 값을 가져온다
        const conn = await pool.awaitGetConnection();
        await conn.beginTransaction() // 트랜잭션 적용 시작
        const yahooFinance = require('yahoo-finance2').default;
        const { stock } = req.params;
        
        if(stock === null || stock === '' || stock === undefined ){
            console.log('그냥들어옴');
            res.json('티커를 정확히 입력하십시오: ' + stock);
            //res.render('stock', {title : '주식정보'}); // list:rows[0]도 가능 대신 ejs에서 그냥받아올수있다
        } else {
            
            //테이블에 저장되어 있는 데이터 조회
            var stockData = await conn.awaitQuery(msgBoardQuery.selectStock(), [stock]);
            var stockData2 = await conn.awaitQuery(msgBoardQuery.selectStockDetail(), [stock]);
            
            var stockInfo = {stockData:stockData, stockDataDetail:stockData2};
        
            if(stockData.length != 0){ //테이블에 데이터가 존재하면
                var diff = await conn.awaitQuery(msgBoardQuery.selectDiffTime(), stockData[0].lstDate);  //저장된 시간과 현재시간의 차이가 60분이 넘으면 새로운 데이터 insert후 조회해서 리턴해준다
                console.log('시간차이 확인: ' + diff[0].diff);
                if(diff[0].diff < 60){ //저장한 시간이 60분 미만이면 조회한 데이터 리턴해주고 종료
                    console.log('테이블에서 조회된 데이터 전달 완료');
                    
                    res.json(stockInfo);
                    
                    return stockInfo;
                }
            }
            
            //미국주식 업데이트 진행후 리턴 start

            var result; 
            var result2;
            var result3;
            var result4;
            var result5;
            
            //야후파이낸스 미국주식 정보 조회 api
            try {
                result = await yahooFinance.quote(stock);// 리스트로 저장가능한 api function
                result2 = await yahooFinance.quoteSummary(stock);
            } catch (error) {
                console.log('야후 파이낸스 미국주식정보 api 조회 에러 ');
                throw new Error('야후 파이낸스 미국주식정보 api  조회 에러');
            }
            
            var ticker;         //티커
            var name;           //종목명
            var targetPrice;    //목표가
            var currentPrice;   //현재가
            var trailingPE;     //PER
            var priceToBook;    //PBR
            var epsTrailingTwelveMonths;    //EPS
            var exchangeName;   //거래소명 (ex: nasdaq)
            
            
            //미국주식 정보 추출
            if(result.symbol === undefined || result.symbol === null){
                return; //심볼이 없으면 저장 안한다.
            }
            ticker = result.symbol;    //심볼

            if(result.displayName === undefined){ //종목명
                name = ''; 
            } else {
                name = result.displayName;
            }

            if(result.fiftyDayAverage === undefined){ //목표가
                targetPrice = '';
            } else {
                targetPrice = result.fiftyDayAverage;
            } 
            
            if(result.regularMarketPrice === undefined){ //현재가
                currentPrice = '';
            } else {
                currentPrice = result.regularMarketPrice;
            } 
            
            if(result.trailingPE === undefined){ //PER (주가/주당순이익)
                trailingPE = ''; 
            } else {
                trailingPE = result.trailingPE;
            } 
            
            if(result.priceToBook === undefined){ //PBR (시가총액 / 기업순자산)
                priceToBook = '';
            } else {
                priceToBook = result.priceToBook;
            }

            if(result.epsTrailingTwelveMonths === undefined){ //EPS (당기순이익 / 총주식수)
                epsTrailingTwelveMonths = '';
            } else {
                epsTrailingTwelveMonths = result.epsTrailingTwelveMonths;
            }

            //ROE
            //ROI
            
            if(result2.price.exchangeName === undefined){ //거래소
                exchangeName = '';
            } else {
                exchangeName = result2.price.exchangeName;
            }

            var input = [ticker, name, currentPrice , targetPrice, trailingPE, priceToBook,epsTrailingTwelveMonths, exchangeName
                        ,ticker, name, currentPrice , targetPrice, trailingPE, priceToBook,epsTrailingTwelveMonths, exchangeName];
            
            //주식정보 insert
            //logger.info('미국주식 정보 입력: ' + input);
            console.log('미국주식 정보 입력: ' + input);
            const sql =  msgBoardQuery.insertApiStock();

            
            await conn.awaitQuery(sql, input); //쿼리 파라미터 맵핑된 쿼리 로그 보는법?
            
            //야후 파이낸스 손익계산서, 재무상태표, 현금흐름표  api조회
            try {
                result3 = await yahooFinance.quoteSummary(stock, { modules: [ "incomeStatementHistoryQuarterly" ] });  //손익계산서
                result4 = await yahooFinance.quoteSummary(stock, { modules: [ "balanceSheetHistoryQuarterly" ] });  //재무상태표
                result5 = await yahooFinance.quoteSummary(stock, { modules: [ "cashflowStatementHistoryQuarterly" ] }); //현금흐름표
                
            } catch (error) {
                console.log('야후 파이낸스 재무정보 api 조회 에러 ');
                throw new Error('야후 파이낸스 재무정보 api  조회 에러');
            }
            

            //손익계산서
            var totalRevenue = []; //총수입
            var netIncome = []; //순수익
            var costOfRevenue = []; //매출원가


            //재무상태표
            var totalAssets = []; //총자산
            var totalCurrentAssets = []; //유동자산
            var totalCurrentLiabilities = [];//유동부채
            var totalLiab = []; //부채총계
            
            //현금흐름표
            var totalCashFromOperatingActivities = []; //영업현금흐름 
            var totalCashflowsFromInvestingActivities = []; //투자현금흐름
            var totalCashFromFinancingActivities = []; //재무현금흐름 
            
            
            for(var i=0; i<result3.incomeStatementHistoryQuarterly.incomeStatementHistory.length; i++){  
                
                //손익계산서
                totalRevenue[i] = result3.incomeStatementHistoryQuarterly.incomeStatementHistory[i].totalRevenue;
                netIncome[i] = result3.incomeStatementHistoryQuarterly.incomeStatementHistory[i].netIncome;
                costOfRevenue[i] = result3.incomeStatementHistoryQuarterly.incomeStatementHistory[i].costOfRevenue;
                
                //재무상태표
                totalAssets[i] = result4.balanceSheetHistoryQuarterly.balanceSheetStatements[i].totalAssets;
                totalCurrentAssets[i] = result4.balanceSheetHistoryQuarterly.balanceSheetStatements[i].totalCurrentAssets;
                totalCurrentLiabilities[i] = result4.balanceSheetHistoryQuarterly.balanceSheetStatements[i].totalCurrentLiabilities;
                totalLiab[i] = result4.balanceSheetHistoryQuarterly.balanceSheetStatements[i].totalLiab;
                
                //현금흐름표
                totalCashFromOperatingActivities[i] = result5.cashflowStatementHistoryQuarterly.cashflowStatements[i].totalCashFromOperatingActivities;
                totalCashflowsFromInvestingActivities[i] = result5.cashflowStatementHistoryQuarterly.cashflowStatements[i].totalCashflowsFromInvestingActivities;
                totalCashFromFinancingActivities[i] = result5.cashflowStatementHistoryQuarterly.cashflowStatements[i].totalCashFromFinancingActivities;
                

                //연도 및 분기 추출
                const quarterDate = new Date(result4.balanceSheetHistoryQuarterly.balanceSheetStatements[i].endDate);
                var quarter = quarterDate.toDateString().substring(4,7);
                if(quarter === 'Mar'){ //1분기
                    quarter = 1;
                } else if(quarter === 'Jun') { //2분기
                    quarter = 2;
                } else if(quarter === 'Sep') { //3분기
                    quarter = 3;
                } else if(quarter === 'Dec') { //4분기
                    quarter = 4;
                }
                

                var year = quarterDate.toDateString().substring(11,15) //string 안잘림 

                //재무제표 데이터 유무 확인
                if(totalRevenue[i] == undefined ){
                    totalRevenue[i] = ''
                } 
                if(netIncome[i] == undefined ){
                    netIncome[i] = ''
                } 
                if(costOfRevenue[i] == undefined ){
                    costOfRevenue[i] = ''
                } 
                
                if(totalAssets[i] == undefined ){
                    totalAssets[i] = ''
                } 
                if(totalCurrentAssets[i] == undefined ){
                    totalCurrentAssets[i] = ''
                } 
                if(totalCurrentLiabilities[i] == undefined ){
                    totalCurrentLiabilities[i] = ''
                } 
                if(totalLiab[i] == undefined ){
                    totalLiab[i] = ''
                } 

                if(totalCashFromOperatingActivities[i] == undefined ){
                    totalCashFromOperatingActivities[i] = ''
                } 
                if(totalCashflowsFromInvestingActivities[i] == undefined ){
                    totalCashflowsFromInvestingActivities[i] = ''
                } 
                if(totalCashFromFinancingActivities[i] == undefined ){
                    totalCashFromFinancingActivities[i] = ''
                } 
                


                var input = [ticker, year, quarter , totalRevenue[i], netIncome[i], costOfRevenue[i], 
                             totalAssets[i], totalCurrentAssets[i], totalCurrentLiabilities[i], totalLiab[i],
                             totalCashFromOperatingActivities[i], totalCashflowsFromInvestingActivities[i], totalCashFromFinancingActivities[i],

                             ticker, year, quarter , totalRevenue[i], netIncome[i], costOfRevenue[i],
                             totalAssets[i], totalCurrentAssets[i], totalCurrentLiabilities[i], totalLiab[i],
                             totalCashFromOperatingActivities[i], totalCashflowsFromInvestingActivities[i], totalCashFromFinancingActivities[i],
                            ];
                            
                
                //logger.info('미국주식 재무정보 입력: ' + input);
                console.log('미국주식 재무정보 입력: ' + input);
                await conn.awaitQuery(msgBoardQuery.insertApiStockDetail(), input);
                
            }//for문 끝

            //미국주식 실시간 업데이트 후 데이터 조회
            var stockData = await conn.awaitQuery(msgBoardQuery.selectStock(), [stock]);
            var stockData2 = await conn.awaitQuery(msgBoardQuery.selectStockDetail(), [stock]);
            
            if(stockData.length === 0){ //테이블에 데이터가 존재하지 않으면
                throw new Error('실시간 미국주식 데이터 리턴전 오류')
            }
            
            await conn.commit();//커밋
            await conn.release();
            
            console.log('미국주식 업데이트 후 리턴');
            stockInfo = {stockData:stockData, stockDataDetail:stockData2};//미국주식 실시간 업데이트 후 리턴
            res.json(stockInfo);
            //미국주식 업데이트 진행후 리턴 end
        }

    } catch (error) {
        console.log(error);
        console.log('에러 발생');
        await conn.rollback();//롤백
        await conn.release();
        res.json({
            error: error.message
        })

    } finally {
        console.log('야후 api 미국주식조회 실행 finally');
    }
});





/**
 * @swagger
 * /api/stock/selectDividend/{stock}:/{startDate}:
 *   
 *   get:
 *     description: 배당, 밸류에이션 정보(단건)
 *     summary: "배당, 밸류에이션 정보(단건)"
 *     tags: [Post]
 *     produces:
 *     - "application/json"
 *     parameters:
 *      - in: path
 *        name: stock
 *        required: true
 *        description: 주식티커
 *        schema:
 *          type: string
 *      - in: path
 *        name: startDate
 *        required: true
 *        description: 시작일(ex)2022-01-02
 *        schema:
 *          type: string
 *     responses:
 *       "200":
 *         description: "successful operation"
 *     
*/     
//배당, 밸류에이션 정보 조회(단건)
router.get('/selectDividend/:stock/:startDate', async function(req, res){
    console.log('배당정보 진행');
    try {
        
        const conn = await pool.awaitGetConnection();
        await conn.beginTransaction() // 트랜잭션 적용 시작
        const yahooFinance = require('yahoo-finance2').default;
        const { stock } = req.params;
        const { startDate } = req.params;
        
        console.log('주식종목: ' + stock.replace(':', '') + "  startDate:  "  +startDate);    
        
        const symbol = stock.replace(':', ''); // 파라미터 ':'제외
        const queryOptions = { period1: startDate, /* ... */ };
        
        //종목별 배당정보(기업 배당 정보, 배당 수익율), 벨류에이션 지표 API
        var stockData = await conn.awaitQuery(msgBoardQuery.selectDividend(), symbol);
                
        if(stockData.length != 0){ //테이블에 데이터가 존재하면
            var diff = await conn.awaitQuery(msgBoardQuery.selectDiffTime(), stockData[0].lstDate);  //저장된 시간과 현재시간의 차이가 60분이 넘으면 새로운 데이터 insert후 조회해서 리턴해준다
            console.log('시간차이 확인: ' + diff[0].diff);
            if(diff[0].diff < 60){ //저장한 시간이 60분 미만이면 조회한 데이터 리턴해주고 종료
                console.log('테이블에서 조회된 되이터 전달 완료');
                res.json(stockData);
                return;
            }
        }

        try {
            var result = await yahooFinance._chart(symbol, queryOptions);
            var result2 = await yahooFinance.quoteSummary(symbol, { modules: [ "calendarEvents" ] });
            var result3 = await yahooFinance.quoteSummary(symbol, { modules: [ "defaultKeyStatistics" ] });
            var result4 = await yahooFinance.quoteSummary(symbol, { modules: [ "financialData" ] });
            var result5 = await yahooFinance.quoteCombine(symbol);
        } catch (error) {
            console.log('야후 파이낸스 배당정보 api 조회 에러 ');
            throw new Error('야후 파이낸스 배당정보 api  조회 에러');  
        }
        
        var exDividendDate = result2.calendarEvents.exDividendDate; //배당락일
        var dividendDate = result2.calendarEvents.dividendDate.toDateString; //배당일
        var profitMargins = result3.defaultKeyStatistics.profitMargins;//순이익률
        var priceToBook = result3.defaultKeyStatistics.priceToBook; //pbr
        var operatingMargins = result4.financialData.operatingMargins; //영업이익률
        var returnOnEquity = result4.financialData.returnOnEquity; // ROE
        var returnOnAssets = result4.financialData.returnOnAssets; //ROA
        var trailingAnnualDividendRate = result5.trailingAnnualDividendRate; // 연간배당금
        var trailingAnnualDividendYield = result5.trailingAnnualDividendYield; // 연간배당률


        //연도 및 분기 추출
        var dividendDate = [];//배당일자
        var dividendAmount = [];//배당금
        var dividendRate = [];//배당률
        var dividendInfo = [];//배당정보
        if(result.events.dividends.length > 0){ //배당데이터가 있으면
            for(var i=0 ; i<result.events.dividends.length; i++){
                dividendDate[i] = new Date(result.events.dividends[i].date.toDateString());
                dividendAmount[i] = result.events.dividends[i].amount;
                dividendRate[i] = result.events.dividends[i].amount / result.meta.regularMarketPrice;
                dividendInfo[i] = [ {dividendHistoryDate:dividendDate[i]}, {dividendAmount:dividendAmount[i]}, {dividendRate:dividendRate[i]}];
            }
        }

        //배당 재무정보 insert
        const sql =  msgBoardQuery.insertDividend();
      
        var aa =await conn.awaitQuery(sql, [symbol, exDividendDate, '', returnOnEquity, returnOnAssets, operatingMargins, profitMargins,
                                    symbol, exDividendDate, '', returnOnEquity, returnOnAssets, operatingMargins, profitMargins 
                                    ]); //쿼리 파라미터 맵핑된 쿼리 로그 보는법?
                
        await conn.commit();//롤백
        await conn.release();

        //insert 후 조회
        stockData = await conn.awaitQuery(msgBoardQuery.selectDividend(), symbol);
        res.json(stockData);           
        
    } catch (error) {
        console.log(error);
        console.log('에러 발생');
        await conn.rollback();//롤백
        await conn.release();
        res.json({
            error: error.message
        })

    } finally {
        console.log('배당,재무정보 조회 완료');
    }
});



//2. 종목 정보 API 내용없음


/**
 * @swagger
 * /api/stock/selectStockRelatedList/{stock}:
 *   
 *   get:
 *     description: 종목정보 - 연관섹터 종목리스트단건
 *     summary: "종목정보 - 연관섹터 종목리스트단건"
 *     tags: [Post]
 *     produces:
 *     - "application/json"
 *     parameters:
 *      - in: path
 *        name: stock
 *        required: true
 *        description: 주식티커
 *        schema:
 *          type: string
 *     responses:
 *       "200":
 *         description: "successful operation"
 *     
*/     
//종목정보단건 - 연관섹터 종목리스트 table - stockOther 
router.get('/selectStockRelatedList/:stock', async function(req, res){
    console.log('종목정보 - 연관섹터 종목리스트');

    try {
        
        const conn = await pool.awaitGetConnection();
        await conn.beginTransaction() // 트랜잭션 적용 시작
        const yahooFinance = require('yahoo-finance2').default;
        const { stock } = req.params;    
        
        //3. 연관 섹터 종목 리스트 API -> 주가 및 간단정보 가지고옮
        var stockData = await conn.awaitQuery(msgBoardQuery.selectStockOhter(), [stock]);
        
        if(stockData.length != 0){ //테이블에 데이터가 존재하면
            var diff = await conn.awaitQuery(msgBoardQuery.selectDiffTime(), stockData[0].lstDate);  //저장된 시간과 현재시간의 차이가 60분이 넘으면 새로운 데이터 insert후 조회해서 리턴해준다
            console.log('시간차이 확인: ' + diff[0].diff);
            if(diff[0].diff < 60){ //저장한 시간이 60분 미만이면 조회한 데이터 리턴해주고 종료
                console.log('테이블에서 조회된 되이터 전달 완료');
                res.json(stockData);
                return;
            }
        }

        //연관섹터 종목리스트 조회 api
        try {
            const searchSingle = await yahooFinance.recommendationsBySymbol(stock); //
            console.log(searchSingle.recommendedSymbols[0].symbol);
            var list = [];
            var result; //연관주가정보 결과
            if(searchSingle.recommendedSymbols.length > 0){
                for(var i=0 ; i<searchSingle.recommendedSymbols.length; i++){
                    list[i] = searchSingle.recommendedSymbols[i].symbol;
                }
                result = await yahooFinance.quote(list);
            }
        } catch (error) {
            console.log('야후 파이낸스 연관섹터 종목리스트 api 조회 에러 ');
            throw new Error('야후 파이낸스 연관섹터 종목리스트 api  조회 에러');
        }

        var listSymbol = [];
        var listPirce = [];
        if(result.length > 0){
            for(var i=0; i<result.length; i++){
                listSymbol[i] = result[i].symbol;
                listPirce[i] = result[i].regularMarketPrice;
                const sql =  msgBoardQuery.insertStockOther();
                await conn.awaitQuery(sql, [stock, i, listSymbol[i], listPirce[i],
                                            stock, i, listSymbol[i], listPirce[i]]); //쿼리 파라미터 맵핑된 쿼리 로그 보는법?
                                                
            }
        }
        await conn.commit();//커밋
        await conn.release();        

        //연관섹터 종목리스트 insert 후 조회
        stockData = await conn.awaitQuery(msgBoardQuery.selectStockOhter(), [stock]);
        res.json(stockData);           

    } catch (error) {
        console.log(error);
        console.log('에러 발생');
        await conn.rollback();//롤백
        await conn.release();
        res.json({
            error: error.message
        })

    } finally {
        console.log('연관 섹터 리스트 조회 완료');
    }


});


/**
 * @swagger
 * /api/stock/selectStockNews/{stock}:
 *   
 *   get:
 *     description: 연관 섹터 뉴스 API(단건)
 *     summary: "연관 섹터 뉴스 API(단건)"
 *     tags: [Post]
 *     produces:
 *     - "application/json"
 *     parameters:
 *      - in: path
 *        name: stock
 *        required: true
 *        description: 주식티커
 *        schema:
 *          type: string
 *     responses:
 *       "200":
 *         description: "successful operation"
 *     
*/     
//연관 섹터 뉴스(단건) API table - stocknews 
router.get('/selectStockNews/:stock', async function(req, res){
    console.log('종목정보 - 연관섹터 종목리스트');
    //4. 연관 섹터 뉴스 API -> 해당조회티커 5개 기사만 가지고 옮
    try {
        
        const conn = await pool.awaitGetConnection();
        await conn.beginTransaction() // 트랜잭션 적용 시작
        const yahooFinance = require('yahoo-finance2').default;
        const { stock } = req.params;    
        
        var stockData = await conn.awaitQuery(msgBoardQuery.selectStockNews(), [stock, 'yahooapi']);
        
        if(stockData.length != 0){ //테이블에 데이터가 존재하면
            var diff = await conn.awaitQuery(msgBoardQuery.selectDiffTime(), stockData[0].lstDate);  //저장된 시간과 현재시간의 차이가 60분이 넘으면 새로운 데이터 insert후 조회해서 리턴해준다
            console.log('시간차이 확인: ' + diff[0].diff);
            if(diff[0].diff < 60){ //저장한 시간이 60분 미만이면 조회한 데이터 리턴해주고 종료
                console.log('테이블에서 조회된 되이터 전달 완료');
                res.json(stockData);
                return;
            }
        }

        //연관섹터 종목리스트 조회 api
        try {
            var news = await yahooFinance.search(stock, /* queryOptions */);
        
        } catch (error) {
            console.log('야후 파이낸스 뉴스 api 조회 에러 ');
            throw new Error('야후 파이낸스 뉴스  api  조회 에러');
        }

        var title = [];
        var link = [];
        var stocknewscproviderPublishTimeol = [];
        
        if(news.news.length > 0){
            for(var i=0; i<news.news.length; i++){
                title[i] = news.news[i].title;
                link[i] = news.news[i].link;
                stocknewscproviderPublishTimeol[i] = news.news[i].stocknewscproviderPublishTimeol;
                const sql =  msgBoardQuery.insertStockNews();
                await conn.awaitQuery(sql, [stock, 'yahooapi', i, title[i], link[i], stocknewscproviderPublishTimeol[i],
                                            stock, 'yahooapi', i, title[i], link[i], stocknewscproviderPublishTimeol[i]]); //쿼리 파라미터 맵핑된 쿼리 로그 보는법?
                                                
            }
        }
        await conn.commit();//커밋
        await conn.release();        

        //연관섹터 종목리스트 insert 후 조회
        stockData = await conn.awaitQuery(msgBoardQuery.selectStockNews(), [stock]);
        res.json(stockData);           

    } catch (error) {
        console.log(error);
        console.log('에러 발생');
        await conn.rollback();//롤백
        await conn.release();
        res.json({
            error: error.message
        })

    } finally {
        console.log('연관 뉴스 조회 완료');
    }

    
});







// Axios : 브라우저와 Node 환경에서 사용하는 Promise 기반의 HTTP Client로 사이트의 HTML을 가져올 때 사용하는 라이브러리입니다.
// Cheerio : Axios의 결과로 받은 데이터에서 필요한 데이터를 추출하는데 사용하는 라이브러리 입니다.
    
// 사용할 cheerio 함수들
// npm install --save axios cheerio
// load : html 문자열을 받아 cheerio 객체를 반환
// children : html selector를 문자열로 받아 cheerio 객체에서 선택된 html 문자열에서 해당하는 모든 태그들의 배열을 반환
// each : 콜백 함수를 받아 태그들의 배열을 순회 하면서 콜백함수를 실행
// find : html selector 를 문자열로 받아 해당하는 태그를 반환

/**
 * @swagger
 * /api/stock/crwalingData/{stock}:
 *   
 *   get:
 *     description: 해외뉴스(단건)
 *     summary: "해외뉴스(단건)"
 *     tags: [Post]
 *     produces:
 *     - "application/json"
 *     parameters:
 *      - in: path
 *        name: stock
 *        required: true
 *        description: 주식티커
 *        schema:
 *          type: string
 *     responses:
 *       "200":
 *         description: "크롤링 성공"
 *     
*/
//해외 뉴스
router.get('/crwalingData/:stock', async function(req, res){
    console.log('크롤링 진행');

    const conn = await pool.awaitGetConnection();
    let { stock } = req.params;
    await conn.beginTransaction() // 트랜잭션 적용 시작


    var stockData = await conn.awaitQuery(msgBoardQuery.selectStockNews(), [stock, 'finviz']);
        
    if(stockData.length != 0){ //테이블에 데이터가 존재하면
        var diff = await conn.awaitQuery(msgBoardQuery.selectDiffTime(), stockData[0].lstDate);  //저장된 시간과 현재시간의 차이가 60분이 넘으면 새로운 데이터 insert후 조회해서 리턴해준다
        console.log('시간차이 확인: ' + diff[0].diff);
        if(diff[0].diff < 60){ //저장한 시간이 60분 미만이면 조회한 데이터 리턴해주고 종료
            console.log('테이블에서 조회된 되이터 전달 완료');
            res.json(stockData);
            return stockData;
        }
    }

    let informations = await searchNews(req, res); //뉴스 크롤링 조회
    let link = [];
   
    //finviz
    if(informations.length > 0){
        if(informations.length <= 5){
            for(var i=0; i<informations.length; i++){ //길이가 5개 이하이면
                link[i] = informations[i].link;
                
                const sql =  msgBoardQuery.insertStockNews();
                await conn.awaitQuery(sql, [stock,'finviz', i, '', link[i], '',
                                            stock,'finviz', i, '', link[i], '']); //쿼리 파라미터 맵핑된 쿼리 로그 보는법?
            }
            
        } else{
            for(var i=0; i<= 5; i++){
                link[i] = informations[i].link;
                
                const sql =  msgBoardQuery.insertStockNews();
                await conn.awaitQuery(sql, [stock,'finviz', i, '', link[i], '',
                                            stock,'finviz', i, '', link[i], '']); //쿼리 파라미터 맵핑된 쿼리 로그 보는법?
            }
        }
    }

    await conn.commit();//커밋
    await conn.release();        
    
    //연관섹터 종목리스트 insert 후 조회
    stockData = await conn.awaitQuery(msgBoardQuery.selectStockNews(), [stock, 'finviz']);
    
    res.json(stockData);           

});



/**
 * @swagger
 * /api/stock/crwalingDataCNN/{stock}:
 *   
 *   get:
 *     description: CNN
 *     summary: "CNN"
 *     tags: [Post]
 *     produces:
 *     - "application/json"
 *     parameters:
 *      - in: path
 *        name: stock
 *        required: true
 *        description: 주식티커
 *        schema:
 *          type: string
 *     responses:
 *       "200":
 *         description: "크롤링 성공"
 *     
*/
//CNN
router.get('/crwalingDataCNN/:stock', async function(req, res){
    console.log('크롤링 진행');

    const conn = await pool.awaitGetConnection();
    let { stock } = req.params;
    await conn.beginTransaction() // 트랜잭션 적용 시작

    const getHTML = async(keyword) => { 
        try{
            return await axios.get("https://edition.cnn.com/search?size=10&q=" + encodeURI(keyword)) //finviz
            //return await axios.get("https://finance.yahoo.com/quote/" +  encodeURI(keyword)  + "/news?p=" + encodeURI(keyword)) //""안에는 URL 삽입 
            //return await axios.get("https://search.naver.com/search.naver?where=news&ie=UTF-8&query=" + encodeURI(keyword)) //""안에는 URL 삽입 
        }catch(err) { 
            console.log(err); 
        } 
    } // 파싱 함수 

    let informations = [];
    let parsing = async (keyword) => { 
        const html = await getHTML(keyword) 
        const $ = cheerio.load(html.data);// 가지고 오는 data load 
        //const $titlist = $(".news_area"); 
        
        //const $titlist = $("#main_pack > section.sc_new.sp_nnews._prs_nws > div > div.group_news > ul").children("li.bx");
        const $yahooNewsList = $("body > div.pg-search.pg-wrapper > div.pg-no-rail.pg-wrapper > div > div.l-container > div.cnn-search__right > div > div.cnn-search__results-list").children("div.cnn-search__result cnn-search__result--article");
        console.log($yahooNewsList.length);
        
        $yahooNewsList.each(function(i, elem){
            informations[i] = {
                //link : $(this).find("div.news_wrap.api_ani_send > a.dsc_thumb").attr('href')
                //link : $(this).find(`div > div.Cf > div.Ov\\(h\\).Pend\\(44px\\).Pstart\\(25px\\) > h3 > a.js-content-viewer`).attr('href')
                
                link : $(this).find("div.cnn-search__result-thumbnail > a").attr('href')
                
            }
            console.log(informations);
        })
    } 
    
    
    await parsing(stock); // 검색어 await붙이고 나니 informations에 정보 담아서 보냄
    
    //return informations;
    res.json(informations);
    


 

});


//************미국주식 api  END***********************














//************한국주식 api  START***********************

//한국주식정보 업데이트
//router.get('/stockMenu/:stock', isLogged, async function(req, res, next){
    router.get('/koreaStockUpdate/:stock',  async function(req, res){
        console.log('한국 업데이트 들어옴');
        try {
            
            var { num } = req.params; // :num 로 맵핑할 req 값을 가져온다
            const conn = await pool.awaitGetConnection();
            const yahooFinance = require('yahoo-finance2').default;
            const { stock } = req.params;
            
            if(stock === null || stock === '' || stock === undefined ){
                console.log('그냥들어옴');
                res.render('stock', {title : '주식정보'}); // list:rows[0]도 가능 대신 ejs에서 그냥받아올수있다
            } else {
                const result = await yahooFinance.quoteSummary(stock);//   quote('T');
                const result2 = await yahooFinance.quote(stock);//   quote('T');
                
                var ticker = result2.symbol;    //심볼
                var name = result2.longName; //종목명
                var targetPrice = '';
                if(result.price.targetPrice === undefined){
                    targetPrice = '';
                } else{
                    targetPrice = result.price.targetPrice;
                } 
                
                var currentPrice = result.price.postMarketPrice; //현재주가
                var input = [ticker, name, currentPrice , targetPrice
                            ,ticker, name, currentPrice , targetPrice];
                console.log(input);
    
    
                //주식정보 입력
                console.log('한국STOCK테이블 인서트');
                const sql =  msgBoardQuery.insertStock();
                await conn.awaitQuery(sql, input);
                
    
                //재무상태표, 현금흐름표, 손익계산서 입력
                console.log('STOCKDETAIL 인서트 전');
                const result3 = await yahooFinance.quoteSummary(stock, { modules: [ "balanceSheetHistoryQuarterly" ] });  //재무상태표
                const result4 = await yahooFinance.quoteSummary(stock, { modules: [ "cashflowStatementHistoryQuarterly" ] }); //현금흐름표
                const result5 = await yahooFinance.quoteSummary(stock, { modules: [ "incomeStatementHistoryQuarterly" ] });  //손익계산서
    
                var balTotalAssets = [];
                var cashNetIncome = [];
                var totalRevenue = [];
                
                const sql2 = msgBoardQuery.insertStockDetail();
                for(var i=0; i<result3.balanceSheetHistoryQuarterly.balanceSheetStatements.length; i++){  
                    balTotalAssets[i] = result3.balanceSheetHistoryQuarterly.balanceSheetStatements[i].totalCurrentAssets;
                    cashNetIncome[i] = result4.cashflowStatementHistoryQuarterly.cashflowStatements[i].cashNetIncome;
                    totalRevenue[i] = result5.incomeStatementHistoryQuarterly.incomeStatementHistory[i].totalRevenue;
    
                    //연도 및 분기 추출
                    const quarterDate = new Date(result3.balanceSheetHistoryQuarterly.balanceSheetStatements[i].endDate);
                    var quarter = quarterDate.toDateString().substring(4,7);
                    if(quarter === 'Mar'){ //1분기
                        quarter = 1;
                    } else if(quarter === 'Jun') { //2분기
                        quarter = 2;
                    } else if(quarter === 'Sep') { //3분기
                        quarter = 3;
                    } else if(quarter === 'Dec') { //4분기
                        quarter = 4;
                    }
                    
    
                    var year = quarterDate.toDateString().substring(11,15) //string 안잘림 
    
                    //재무제표 데이터 추출
                    if(balTotalAssets[i] == undefined ){
                        balTotalAssets[i] = ''
                    } 
                    if(cashNetIncome[i] == undefined ){
                        cashNetIncome[i] = ''
                    } 
                    if(totalRevenue[i] == undefined ){
                        totalRevenue[i] = ''
                    } 
                    
                    var input = [ticker, year, quarter , balTotalAssets[i], cashNetIncome[i], totalRevenue[i]
                                ,ticker, year, quarter , balTotalAssets[i], cashNetIncome[i], totalRevenue[i]];
                    console.log('순서: ' + i + '   ' + input);
                    await conn.awaitQuery(sql2, input);
                
                }
                await conn.release();
                res.json('한국 주식 업데이트 완료');
                //res.redirect('/api/board/list'); 
                //res.render('stock', {title : '주식정보', result:data}); // list:rows[0]도 가능 대신 ejs에서 그냥받아올수있다
            }
    
        } catch (error) {
            console.log(error);
            res.json({
                error: error.message
            })
        } finally {
            console.log('한국주식업데이트 실행 finally');
        }
    });
    
    
    //한국주식정보 조회
    router.get('/koreaStockSelect/:stock',  async function(req, res){
        try {
            
                var conn = await conn.awaitGetConnection();
    
                const { stock } = req.params;
                console.log('한국stock 조회: ' + stock);
            
                var sql = msgBoardQuery.selectStock() ;
                var stockData = await conn.awaitQuery(sql, [stock]);
                
                var sql2 = msgBoardQuery.selectStockDetail();
                var stockData2 = await conn.awaitQuery(sql2, [stock]);
            
                var result = {stockData:stockData, 
                              stockData2:stockData2
                             };
            
                console.log('한국주식데이터?? : ' + result.stockData.length);
                conn.release();
    
                if(result.stockData.length === 0){
                    throw new Error('보낼 데이터 없음')
                    
                }
                
                res.json(result);
    } catch (error) {
            console.log(error);
            res.json({
                error: error.message
            })
        } finally {
            console.log('한국주식조회 실행 finally');
        }
        
    })
    
    
//************한국주식 api  END***********************

module.exports = router;
