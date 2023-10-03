import Joi from 'joi'
export function validate(schema) {
    return (req, res, next) => {
        if(!schema) schema = req.schema;
        
        if (schema && req.body) {
            const {error} = schema.validate(req.body);
            req.validated = true;
            if(error) {
                return res.status(400).send(error.details[0].message);
            }
        }
        next();
    }
}


// import Joi from 'joi'
// export function validate(schema) {
//     return (req, res, next) =>
//     {if(!schema) {
//         schema=req.schema
//     }
//     if (schema && req.body) {
//         const {error} = schema.validate(req.body);
//         req.validated = true;
//         if(error) {
//             req.joiError = error.details[0].message;
//         }
        
//     }
//     next();
// }

// }