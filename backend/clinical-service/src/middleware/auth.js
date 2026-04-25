const jwt = require('jsonwebtoken');

function verificarToken(req, res, next){
    const header = req.headers.authorization || '';
    const [, token] = header.split(' ');
    if(!token) {
        return res.status(401).json({ error: 'Necesito el Token'});
    }

    try{
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = payload;
        next();
    } catch{
        return res.status(401).json({ error: 'Token inválido :('});
    }
}

module.exports = { verificarToken };