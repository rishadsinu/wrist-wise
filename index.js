const mongoose = require("mongoose");
const express = require("express");
const app = express()

app.set('view engine','ejs')







app.listen(3030,()=>{
    console.log(("litsening to the server on http://localhost:3030"));
})

