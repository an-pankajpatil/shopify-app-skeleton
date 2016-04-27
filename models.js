var mongoose = require('mongoose');
var Schema = mongoose.Schema;
exports.ObjectId = Schema.Types.ObjectId;

//Shop Schema this will be used to store all the stores who installed this app information
var shopSchema = new Schema({
    shop: String,
    access_token: String,
    signature: String,
    subscription_type: String,
    subscription_start_date: String,
    subscription_end_date: String,

});
exports.Shops = mongoose.model('Shops', shopSchema);



mongoose.connect('mongodb://127.0.0.1/locatordb', function(err) {
console.log("mongo db connect");
    console.log(err);
    if(err)
        throw err;
});
