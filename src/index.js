import connectDB from "./db/index.js";
import dotenv from "dotenv";
dotenv.config({
    path : "./.env"
});

connectDB();

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