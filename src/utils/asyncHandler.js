// const asyncHandler=(fn) =>async (req,res,next)=>{
// try {
//   await  fn(req,res,next);
// }catch (error) {
//     res.status(error.status || 500).json({
//         success : false,
//         message : error.message || "Internal Server Error"
//     });
//     next(error);
// }};

// export default asyncHandler;

const asyncHandler = (requestHandler) => {
   return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next))
        .catch((err)  => next(err));
    }
}

export {asyncHandler};