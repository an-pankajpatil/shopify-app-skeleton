/*
Shopify App Skeleton
Developed by - Pankaj Patil
Company - Application Nexus Webservices India Pvt. Ltd.
Website - http://www.applicationnexus.com
*/


//ALERTTTTTTTTTTTTTTTTTTTTTTTT**********************
//Please remember to remove ngrok before going live
//ALERTTTTTTTTTTTTTTTTTTTTTTTT**********************

var express = require('express');
var querystring= require('querystring');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var crypto = require('crypto');
var bodyParser = require('body-parser');
var request = require('request');
var config = require('./settings');
var session = require('express-session');
var models = require('./models');
//ALERTTTTTTTTTTTTTTTTTTTTTTTT**********************
//Next Line should be removed before going live
//ALERTTTTTTTTTTTTTTTTTTTTTTTT**********************
var ngrok = require('ngrok');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));

app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({secret: 'keyboard cat', resave: true, saveUninitialized: true}));
app.use(express.static(path.join(__dirname, 'public')));

//CORS middleware
var allowCrossDomain = function(req, res, next) {

    var oneof = false;
    //console.log(req.headers);
    if(req.headers.origin) {
        res.header('Access-Control-Allow-Origin', req.headers.origin);
        oneof = true;
    }
    if(req.headers['access-control-request-method']) {
        res.header('Access-Control-Allow-Methods', req.headers['access-control-request-method']);
        oneof = true;
    }
    if(req.headers['access-control-request-headers']) {
        res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers']);
        oneof = true;
    }
    if(oneof) {
        res.header('Access-Control-Max-Age', 60 * 60 * 24 * 365);
    }

    // intercept OPTIONS method
    if (oneof && req.method == 'OPTIONS') {
        res.send(200);
    }
    else {
        next();
    }
}

app.use(allowCrossDomain);
// Shopify Authentication

// This function initializes the Shopify OAuth Process
// The template in views/embedded_app_redirect.ejs is rendered 
app.get('/shopify_auth', function(req, res) {
    if (req.query.shop) {
        models.Shops.findOne({shop:req.query.shop}, function(e,data) {
            if(!data) {
                req.session.shop = req.query.shop;
                res.render('embedded_app_redirect', {
                    shop: req.query.shop,
                    api_key: config.oauth.api_key,
                    scope: config.oauth.scope,
                    redirect_uri: config.oauth.redirect_uri
                });
            } else {
                res.send("App already installed for this domain");
            }
            

        });
    }
})

// After the users clicks 'Install' on the Shopify website, they are redirected here
// Shopify provides the app the is authorization_code, which is exchanged for an access token
app.get('/access_token', verifyRequest, function(req, res) {
    if (req.query.shop) {
        var params = { 
            client_id: config.oauth.api_key,
            client_secret: config.oauth.client_secret,
            code: req.query.code
        }
        var req_body = querystring.stringify(params);
       request({
            url: 'https://' + req.query.shop + '/admin/oauth/access_token', 
            method: "POST",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(req_body)
            },
            body: req_body
        }, 
        function(err,resp,body) {
           body = JSON.parse(body);
            req.session.access_token = body.access_token;
            req.session.myshop = req.query.shop;
            models.Shops.findOne({shop:req.query.shop}, function(e,data) {
                    if(!data) {
                        var ndata = new models.Shops;
                        ndata.shop = req.query.shop;
                        ndata.access_token = body.access_token;
                        ndata.save(function(err,rec) {
                        });
                    } else {
                        data.access_token = body.access_token;
                        data.save(function(err,rec) {
                        });
                    }

                    res.redirect('/');
            });

           
            
        })
    }
})

// Renders the install/login form
app.get('/install', function(req, res) {
    res.render('app_install', {
        title: 'Shopify Embedded App'
    });
})


// The home page, checks if we have the access token, if not we are redirected to the install page
// This check should probably be done on every page, and should be handled by a middleware as follows

app.use(function (req, res, next) {
     var shop = '';
    if(req.query.path_prefix) {
        //frontend request
        //confirm if shop exists in our db 
        models.Shops.findOne({shop:req.query.shop}, function(e,data) {
               if((data) && (data.access_token!="")) {
                    res.header("Content-Type",'application/liquid');
                    res.render('locator.ejs', {
                        title: 'Locator',
                        api_key: config.oauth.api_key,
                        shop: req.query.shop
                    });
               } else {
                    res.status(err.status || 500);
                    res.render('error', {
                        message: err.message,
                        error: err
                    });
               }
            });
        

        
        
    } else {
    if((req.query.access_token) || (req.session.access_token)) {
        if(req.query.access_token) {
            var access_token = req.query.access_token;
        } else {
            var access_token = req.session.access_token;
        }
        models.Shops.findOne({access_token:access_token}, function(e,data) {
        
               if((data) && (data.access_token!="")) {
                    next();
               } else {
                    res.redirect('/install');
               }
            });
    } else {
        if(req.query.shop) {
            shop = req.query.shop;
        } else if(req.session.myshop) {

            shop = req.session.myshop;
        } else {
            shop = req.session.shop;
        }
        if(shop!="") {
            models.Shops.findOne({shop:shop}, function(e,data) {
               if((data) && (data.access_token!="")) {
                    next();
               } else {
                    res.redirect('/install');
               }
            });
        } else {
            res.redirect('/install');
        }
        
    }
    
    
}

});



app.get('/', function(req, res) {
    //res.render('index.ejs', {title: 'Home'});
    
    
    	res.render('index.ejs', {
            title: 'Home',
            api_key: config.oauth.api_key,
            shop: req.session.shop
        });
    
    
})


// Renders the setting page
app.get('/setting', function(req, res) {
    //res.render('setting.ejs', {title: 'Settings'});
   
        res.render('setting.ejs', {
            title: 'Setting',
            api_key: config.oauth.api_key,
            shop: req.session.shop
        });
    
    
})

// Renders the account_info page
app.get('/account_info', function(req, res) {
    //res.render('account_info.ejs', {title: 'Account Information'});
  
        res.render('account_info.ejs', {
            title: 'Account Information',
            api_key: config.oauth.api_key,
            shop: req.session.shop
        });
    
   
})

// Renders the help page
app.get('/help', function(req, res) {
    //res.render('help.ejs', {title: 'Help'});
    
        res.render('help.ejs', {
            title: 'Help',
            api_key: config.oauth.api_key,
            shop: req.session.shop
        });
    
    
})

// Renders the additional_info page
app.get('/additional_info', function(req, res) {
    
    //res.render('additional_info.ejs', {title: 'Additional Information'});
   
        res.render('additional_info.ejs', {
            title: 'Additional Information',
            api_key: config.oauth.api_key,
            shop: req.session.shop
        });
    
    
})


// signature verification function
function verifyRequest(req, res, next) {
    var map = JSON.parse(JSON.stringify(req.query));
    delete map['signature'];
    delete map['hmac'];

    var message = querystring.stringify(map);
    var generated_hash = crypto.createHmac('sha256', config.oauth.client_secret).update(message).digest('hex');
    console.log(generated_hash);
    console.log(req.query.hmac);
    if (generated_hash === req.query.hmac) {
        next();
    } else {
        return res.json(400);
    }

}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});
var server_ip_address = '127.0.0.1';
app.set('port', process.env.PORT || 9090);
var server = app.listen(app.get('port'), server_ip_address, function() {
  console.log('Express server listening on port ' + server.address().port);
});

//ALERTTTTTTTTTTTTTTTTTTTTTTTT**********************
//Next code block should be removed before going live
//ALERTTTTTTTTTTTTTTTTTTTTTTTT**********************
ngrok.connect(9090, function (err, url) {
console.log(url);
remote_url = url;
});
//ALERTTTTTTTTTTTTTTTTTTTTTTTT**********************
//Above code block should be removed before going live
//ALERTTTTTTTTTTTTTTTTTTTTTTTT**********************
module.exports = app;
