import jwt from "jsonwebtoken";

const auth = (req, res, next) => {
    try {
        console.log("Authorization Header:", req.headers.authorization);

        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Access denied. No token provided."
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token || token === "null" || token === "undefined") {
            return res.status(401).json({
                message: "Access denied. No token provided."
            });
        }

        console.log("Token:", token);
        console.log("JWT_SECRET:", process.env.JWT_SECRET);

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        console.log("Decoded:", decoded);

        req.user = decoded;
        next();

    } catch (err) {
        console.error("JWT VERIFY ERROR:", err);
        return res.status(401).json({
            message: "Invalid or expired token."
        });
    }
};

export default auth;