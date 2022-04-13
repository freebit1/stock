module.exports = {
    insertStock:function (){ //주식정보 insert
        return `insert into stock (ticker, name, currentprice, targetprice, per, pbr, eps, lstDate) values (?,?,?,?,?,?,?,CURTIME())
                on duplicate key
                update ticker = ? ,
                    name = ? , 
                    currentprice = ? ,
                    targetprice = ? ,
                    per = ?, 
                    pbr = ?, 
                    eps = ?,
                    lstDate = CURTIME() 
                ;`;
        //return `insert into stock (ticker, name, currentprice, targetprice) values (?,?,?,?);`;
    },
    insertStockDetail:function (){ //재무제표 insert
        return `insert into stockdetail (ticker, year, quarter, balTotalAssets, cashNetIncome, incomeTotalRevene) values (?,?,?,?,?,?)
                on duplicate key
                update ticker = ?, 
                       year = ?, 
                       quarter = ?, 
                       balTotalAssets = ?, 
                       cashNetIncome = ?, 
                       incomeTotalRevene = ?
                ;`;
        //return `insert into stockdetail (ticker, year, quarter, balTotalAssets, cashNetIncome, incomeTotalRevene) values (?,?,?,?,?,?);`;
    },
    selectStock:function (){ //미국주식정보 조회
        return `select * from stock where ticker = ?;`;
    },
    selectStockDetail:function (){ //미국주식 재무제표 조회
        return `select * from stockdetail where ticker = ?;`;
    },
    insertEtfStock:function (){ // etf정보 insert
        return `insert into stock (ticker, name, currentprice, targetprice) values (?,?,?,?)
                on duplicate key
                update ticker = ? ,
                       name = ? , 
                       currentprice = ? ,
                       targetprice = ? 
                ;`;
    },
    insertApiStock:function (){ //api주식 조회시 주식정보 insert
        return `insert into stock (ticker, name, currentprice, targetprice, per, pbr, eps, exchangeName, lstDate) values (?,?,?,?,?,?,?,?,CURTIME())
                on duplicate key
                update ticker = ? ,
                    name = ? , 
                    currentprice = ? ,
                    targetprice = ? ,
                    per = ?, 
                    pbr = ?, 
                    eps = ?,
                    exchangeName = ?,
                    lstDate = CURTIME() 
                ;`;
        //return `insert into stock (ticker, name, currentprice, targetprice) values (?,?,?,?);`;
    },
    insertApiStockDetail:function (){ //api 주식 조회시재무제표 insert
        return `insert into stockdetail (ticker, year, quarter, totalRevenue, netIncome, costOfRevenue, 
                                        totalAssets, totalCurrentAssets, totalCurrentLiabilities, totalLiab,
                                        totalCashFromOperatingActivities, totalCashflowsFromInvestingActivities, totalCashFromFinancingActivities, lstDate) 
                            values 
                                        (?,?,?,?,?,?,
                                         ?,?,?,?,
                                         ?,?,?,CURTIME())
                on duplicate key
                update ticker = ?,  
                        year = ?, 
                        quarter = ?, 
                        totalRevenue = ?, 
                        netIncome = ?, 
                        costOfRevenue = ?,
                        totalAssets = ?, 
                        totalCurrentAssets = ?,
                        totalCurrentLiabilities = ?,
                        totalLiab = ?,
                        totalCashFromOperatingActivities = ?,
                        totalCashflowsFromInvestingActivities = ?,
                        totalCashFromFinancingActivities = ?,
                        lstDate = CURTIME()


                ;`;            
        //return `insert into stockdetail (ticker, year, quarter, balTotalAssets, cashNetIncome, incomeTotalRevene) values (?,?,?,?,?,?);`;
    },
    insertStockOther:function (){ //연관 섹터 종목 리스트 저장
        return `insert into stockOther (ticker, seq, otherticker, othertickerPrice, lstDate) values (?,?,?,?,CURTIME())
                on duplicate key
                update ticker = ? ,
                       seq = ? , 
                       otherticker = ? ,
                       othertickerPrice = ? ,
                       lstDate = CURTIME() 
                ;`;
        //(SELECT IFNULL(MAX(seq) + 1, 1) FROM stockOther b WHERE ticker = ?)
    },
    selectStockOhter:function (){ //연관섹터 종목리스트 조회 쿼리
        return `select * from stockOther where ticker = ?;`;
    },
    insertDividend:function (){ //배당정보 insert
        return `insert into dividend (ticker, exDividendDate, dividendDate, roe, roa, operatingMargin, profitMargin, lstDate) values (?,?,?,?,?,?,?,CURTIME())
                on duplicate key
                update ticker = ?, 
                       exDividendDate = ?, 
                       dividendDate = ?, 
                       roe = ?, 
                       roa = ?, 
                       operatingMargin = ?, 
                       profitMargin = ?,
                       lstDate = CURTIME() 
                ;`;
        //(SELECT IFNULL(MAX(seq) + 1, 1) FROM stockOther b WHERE ticker = ?)
    },
    selectDividend:function (){ //배당정보조회
        return `select * from dividend where ticker = ?;`;
    },
    insertStockNews:function (){ //뉴스정보 insert
        return `insert into stocknews (ticker, site, seq, title, link, stocknewscproviderPublishTimeol,lstDate) values (?,?,?,?,?,?,CURTIME())
                on duplicate key
                update ticker = ?,
                       site = ?, 
                       seq = ?,
                       title = ?, 
                       link = ?, 
                       stocknewscproviderPublishTimeol = ?, 
                       lstDate = CURTIME() 
                ;`;
        //(SELECT IFNULL(MAX(seq) + 1, 1) FROM stockOther b WHERE ticker = ?)
    },
    selectStockNews:function (){ //뉴스정보 조회
        return `select * from stocknews where ticker = ? and site = ?;`;
    },
    

    selectDiffTime:function (){ // 시간차이 구하기
        return `select TIMESTAMPDIFF(MINUTE,  ?, CURTIME()) as diff from dual; `;
    },
 

    
    
 
}
