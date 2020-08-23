var express = require("express");
var path = require("path");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const { check, validationResult } = require("express-validator");
var session = require('express-session')

// create a new express app
var myApp = express();
myApp.use(session({ secret: 'Testing', cookie: { maxAge: 60000 }}))



//Static sample data provided
var OrdersData = [{ time: "12:00PM", details: "1 Chicken curry roti", total: "13.70", status: "done" },
      { time: "12:00PM", details: "1 Chicken curry, 2 Goat roti", total: "34", status: "done" },
      { time: "1:30PM", details: "2 Jerk Chicken Meal", total: "28.30", status: "started" },
      { time: "2:44PM", details: "1 Fried Chicken Meal", total: "13.5", status: "not started" },
      { time: "3:10PM", details: "2 Boneless curry chicken meal", total: "25", status: "not started" }];

var MenuData = [{ number: "1", name: "Chicken Curry Roti", description: "Chicken roti cooked delicately with Indian spices.", price: "13.70", available: "yes" },
                { number: "2", name: "Goat Roti (Bone-In)", description: "Goat roti cooked with mixed vegetables and Indian spices.", price: "14.70", available: "yes" },
                { number: "3", name: "Jerk Chicken Meal", description: "Savoury and tasty jerk chicken.", price: "8.00", available: "no" },
                { number: "4", name: "Fried Chicken Meal", description: "Enjoy this crispy and tasty golden-fried chicken.", price: "13.50", available: "yes" },
                { number: "5", name: "Boneless Curry Chicken Meal", description: "Home-style curry chicken.", price: "12.50", available: "yes" }];      

//Mongo db connect with exception handling
mongoose.connect("mongodb://localhost:27017/foodOrderingSystem", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
},(err, client) => {
  if (err) return console.error(err)
  console.log('Connected to Database')
});

//Creation of Mongoose Model for Restaurant
const RestaurantModel = mongoose.model("Restaurant", {
 RestaurantName:String,
 Email:String,
 Password:String,
 ConfirmPassword:String,
 PhoneNo:String,
 Address:String,
 Address2:String,
 City:String,
 Province:String,
 ZipCode:String,
 Description:String,
 Cuisine:String
});


//Creation of Mongoose Model for Menu
const MenuModel = mongoose.model("Menus",{
    number:String,
    name:String,
    description:String,
    price:String,
    available:String
});

//Creation of Orders Model 
const OrdersModel = mongoose.model("Orders",{
 time:String,
 details:String,
 total:String,
 status:String
});


myApp.use(bodyParser.urlencoded({ extended: false }));

myApp.use(express.static(path.join(__dirname, 'public')));

myApp.set('views', path.join(__dirname, 'views'));

myApp.set('view engine', 'ejs');

myApp.get("/", function (req, res) {
  res.render('index');
});


//Route to insert orders if it doesn't exist,if the collection already exists, rendering page with the existing orders.
myApp.get("/dashboard", function (req, res) {
  OrdersModel.find({},function(err,orders){
    if(orders.length == 0){
      //console.log("Orders are empty");
      OrdersModel.insertMany(OrdersData).then(function () {
        //console.log("Orders have been added",OrdersData);
        res.render("dashboard",{orders: OrdersData});
      });
    }
    else{
     //console.log("Orders present");
     //console.log(orders);
     res.render("dashboard",{orders: OrdersData});
    }
  });
});

/* Login route */

myApp.get("/login", function (req, res) {
    var info = {};
    res.render('login',info);
    });  


/* Logout route */
myApp.get("/logout", function(req, res){
  req.session.destroy();
  console.log("Session destroyed");
  res.redirect("/login");
});
   

myApp.post("/login",[
  check("name")
  .not()
  .isEmpty()
  .withMessage("Username should not be empty"),
  check("password")
  .not()
  .isEmpty()
  .withMessage("Password should not be empty")
],function(req,res){
  const errors = validationResult(req);
  var info = {};
  if (!errors.isEmpty()) {
    info = { errors: errors.array() };
    //console.log(info);
    res.render("login", info);
  }
 else{
  RestaurantModel.findOne({"Email":req.body.name,"Password":req.body.password }, function (err, docs) {
    if (docs != null){
      req.session.userName = docs.Email;
      if((docs.Email === req.body.name) && (docs.Password === req.body.password)) {
        OrdersModel.find({},function(err,orders){
          if(orders.length == 0){
            //console.log("Orders are empty");
            OrdersModel.insertMany(OrdersData).then(function () {
              //console.log("Orders have been added",OrdersData);
              res.render("dashboard",{orders: OrdersData});
            });
          }
          else{
              //console.log("Orders present");
              //console.log(orders);
              res.render("dashboard",{orders: OrdersData});
             
          }
        });
       }
       else if((docs.Email != req.body.name) || (docs.Password != req.body.password)){
         res.render("login_error",{Error:{error:"Check user name and password combination"}}); 
       }
   }
    else{
      res.render("login_error",{Error:{error:"User doesn't exist"}});
    }
  });
 } 
});




myApp.get("/register", function (req, res) {
      var info = {};
      res.render('register',info);
      }); 

function customPasswordValidation(value, { req }) {
  if (value !== req.body.cpassword) {
    throw new Error("Password should be the same as confirm password");
  }
  return true;
}

function customPhoneValidation(value, { req }) {
  var pattern = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
  if (pattern.test(value) == false) {
    throw new Error("Phone number should be of format xxx-xxx-xxxx");
  }
  return true;
}



//Route to register the new restaurant with backend validations      
myApp.post("/register",[
  check("name", "Must have a username").not().isEmpty(),
  check("email", "Must be a valid email address").isEmail(),
  check("password").custom(customPasswordValidation),
  check("phone").custom(customPhoneValidation)
],function(req,res){
  const errors = validationResult(req);
  var info = {};
  if (!errors.isEmpty()) {
    info = { errors: errors.array() };
    //console.log(info);
    res.render("register", info);
  }
  else{
    var restaurantname = req.body.name;
    var emailForm = req.body.email;
    var passwordForm = req.body.password;
    var confirmpasswordForm = req.body.cpassword;
    var PhoneNoForm = req.body.phone;
    var AddressForm = req.body.address;
    var AddressForm2 = req.body.address1;
    var CityForm = req.body.city;
    var ProvinceForm = req.body.province;
    var zipcodeForm = req.body.zip;
    var descriptionForm = req.body.description;
    var cuisineForm = req.body.cuisine;
    var restaurantData = {
      RestaurantName:restaurantname,
      Email:emailForm,
      Password:passwordForm,
      ConfirmPassword:confirmpasswordForm,
      PhoneNo:PhoneNoForm,
      Address:AddressForm,
      Address2:AddressForm2,
      City:CityForm,
      Province:ProvinceForm,
      ZipCode:zipcodeForm,
      Description:descriptionForm,
      Cuisine:cuisineForm
    };
  
  
    // create a new instance of the Restaurant model and save the formdata
    var myRestaurant = new RestaurantModel(restaurantData);
    myRestaurant.save().then(function () {
      //console.log("New restaurant added");
      req.session.userName = emailForm;
      res.render("dashboard",{orders: OrdersData});
    });
  }
});

//CRUD routes for menu 

//Create menu
myApp.post("/createMenu",[
  check("rno", "Must have an item number").not().isEmpty(),
  check("rname", "Must have an item name").not().isEmpty(),
  check("description", "Must have an item description").not().isEmpty(),
  check("price", "Must have an item price").not().isEmpty(),
  check("available", "Must have an availability status").not().isEmpty()
],function(req,res){
  const errors = validationResult(req);
  var info = {};
  if (!errors.isEmpty()) {
    info = { errors: errors.array() };
    console.log(info);
    res.render("error",info);
  }
  else{
  var num = req.body.rno;
  var name =req.body.rname;
  var description=req.body.description;
  var price=req.body.price;
  var available=req.body.available;
  var menuFormData = {
    number:num,
    name:name,
    description:description,
    price:price,
    available:available
  } 
var newMenu = new MenuModel(menuFormData);
newMenu.save().then(function(){
  //console.log("New menu item added");
  MenuModel.find({},function(err,menus){
    //console.log(menus);
    res.render("menu",{menus:menus});
  });
})
  }
});


//Read menu
myApp.get("/menu",function(req,res){
MenuModel.find({},function(err,menus){
  if(menus.length == 0){
    //console.log("Menus are empty");
    MenuModel.insertMany(MenuData).then(function () {
      //console.log("Menus have been added",MenuData);
      MenuModel.find({},function(err,menus){
        res.render("menu",{menus: menus});
      });
    });
  }
  else{
    //console.log("Menus present");
    MenuModel.find({},function(err,menus){
      //console.log("Menus loaded");
      res.render("menu",{menus: menus});
    });
  }
});


});


//Update menu
myApp.post("/updateMenu",[
  check("rno", "Must have an item number").not().isEmpty(),
  check("rname", "Must have an item name").not().isEmpty(),
  check("description", "Must have an item description").not().isEmpty(),
  check("price", "Must have an item price").not().isEmpty(),
  check("available", "Must have an availability status").not().isEmpty()
],function(req,res){
  const errors = validationResult(req);
  var info = {};
  if (!errors.isEmpty()) {
    info = { errors: errors.array() };
    console.log(info);
    res.render("error",info);
  }
 else{
  var num = req.body.rno;
  var name =req.body.rname;
  var description=req.body.description;
  var price=req.body.price;
  var available=req.body.available;
  var update_obj = {
    number:num,
    name:name,
    description:description,
    price:price,
    available:available
  }
  MenuModel.findByIdAndUpdate({_id:mongoose.Types.ObjectId(req.body._id)},update_obj).then(function(){
    //console.log('Document updated');
    MenuModel.find({},function(err,menus){
      //console.log("Menus loaded");
      res.render("menu",{menus: menus});
    });
  });
 }
});

//Delete menu item
myApp.post("/deleteMenu",function(req,res){
  MenuModel.findOneAndDelete({ _id: mongoose.Types.ObjectId(req.body._id) }, function (err) {
    if(err) {
      console.log(err);
    }
    //console.log("Successful deletion");
    MenuModel.find({},function(err,menus){
      //console.log("Menus loaded");
      res.render("menu",{menus: menus});
    });
  });
});

myApp.listen(8080);
console.log("My website is running on the port 8080");




  