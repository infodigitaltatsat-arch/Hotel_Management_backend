const notFoundMiddleware = (req,res)=>{
    res.status(404).json({
        success:false,
        message:`Route not found: ${req.originalUrl}`,
    })
};

const errorMiddleware = (err,req,res,next)=>{
    const statusCode = err.name === 'ValidationError' || err.name === 'CastError'
        ? 400
        : err.statusCode || err.status || 500;

    return res.status(statusCode).json({
        success:false,
        message: statusCode ===500 ? "Internal server error" : err.message,
    })

}

module.exports = { notFoundMiddleware, errorMiddleware };