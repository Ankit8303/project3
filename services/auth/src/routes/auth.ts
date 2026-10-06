import express from "express";
import { addUserRole, loginWithClerk, myProfile } from "../controllers/auth.js";
import { isAuth } from "../middlewares/isAuth.js";

const router = express.Router();

// Clerk is the only supported external authentication mechanism.
router.post("/login-clerk", loginWithClerk);
router.put("/add/role", isAuth, addUserRole);
router.get("/me", isAuth, myProfile);

export default router;
