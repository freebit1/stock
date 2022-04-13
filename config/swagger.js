const swaggerUi = require('swagger-ui-express'); 
const swaggereJsdoc = require('swagger-jsdoc'); 

const options = { 
  swaggerDefinition: { 
    info: { 
      title: 'abroad stock info', 
      version: '1.0.0', 
      description: 'abroad stock info???', 
      
    }, 
    //server: ['http://localhost:8083'],
    //host: 'localhost:52008',  //로컬
    host: 'http://dev.forendon.com:52008/',  //실제 도메인주소
    basePath: '/' 
  }, apis: ['./routes/apis/*.js', '../swagger/*'] 
  
}; 



const specs = swaggereJsdoc(options); 



module.exports = { 
  swaggerUi, 
  specs 
};


