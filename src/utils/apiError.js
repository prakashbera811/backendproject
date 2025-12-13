class apiError extends Error {
    constructor(
        statuscode ,
        message ="something went wrong",
        errors = [],
        statck = ""

    ){
        super(message);
        this.statuscode = statuscode;
        this.errors = errors;
        this.data = null;
        this.success = false;
        this.message = message;

        if(statck){
            this.stack = statck;
        }else{
            Error.captureStackTrace(this , this.constructor);
        }
}}

export {apiError};