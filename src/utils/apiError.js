class apiError extends Error {
    constructor(
        statuscode ,
        message ="something went wrong",
        errors = [],
        stack = ""

    ){
        super(message);
        this.statuscode = statuscode;
        this.errors = errors;
        this.data = null;
        this.success = false;
        this.message = message;

        if(stack){
            this.stack = stack;
        }else{
            Error.captureStackTrace(this , this.constructor);
        }
}}

export {apiError};