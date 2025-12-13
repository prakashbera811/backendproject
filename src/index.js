import connectDB from "./db/index.js";
import { app } from "./app.js";
import dotenv from "dotenv";
dotenv.config({
    path : "./.env"
});

connectDB()
.then(()=>{
app.listen(process.env.PORT || 8000 , ()=>{
    console.log(`server is running on port ${process.env.PORT || 8000}`);
})
})
.catch((error)=>{
    console.log("Failed to start the server", error);
})

/*
( async ()=>{
    try {
       await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
       app.on("error", ()=>{
        console.log("ERROR" ,error)
        throw error;
       });

        app.listen(process.env.PORT , ()=>{
            console.log(`server is running on port ${process.env.PORT}`);
        });
    } catch (error) {
        console.log("error while connecting to db", error);
        throw error;
    }
})() */