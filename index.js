const mongoose = require("mongoose");
const express = require("express");
const app = express()


const path = require('path');


app.use("/assets", express.static(path.join(__dirname,"public/user")));  // Set user assets






const userRoute = require('./routes/userRoute');
app.use('/',userRoute)






app.listen(3030,()=>{
    console.log(("litsening to the server on http://localhost:3030"));
})

